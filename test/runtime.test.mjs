import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { validateRuntimeConfig } from "../src/config.mjs";
import { buildHostInvocation, runHost } from "../src/host.mjs";
import { ControlCore } from "../packages/control-core/index.mjs";
import { compactMessages } from "../packages/context-manager/index.mjs";
import { composeProfile } from "../packages/profile-composer/index.mjs";
import { createCheckpoint, readCheckpoint, writeCheckpoint } from "../packages/session-lifecycle/index.mjs";
import { createRuntimeStatus } from "../packages/status-surface/index.mjs";
import { normalizeRuntimeEvent } from "../packages/tui-contracts/index.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);

test("configuration resolves paths and host invocation never uses a shell", () => {
  const config = validateRuntimeConfig({
    schemaVersion: 1,
    host: { command: ["node", "host.mjs"], cwd: ".", env: { MARKER: "yes" } },
    profile: { files: [] },
    context: { maxChars: 200 }
  }, { configPath: path.join(repositoryRoot, "example.runtime.json") });
  const invocation = buildHostInvocation(config, ["hello; touch never"]);
  assert.equal(invocation.options.shell, false);
  assert.deepEqual(invocation.arguments, ["host.mjs", "hello; touch never"]);
  assert.equal(config.context.maxChars, 200);
});

test("host receives exact arguments, explicit environment, and composed profile", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "siso-runtime-test-"));
  const profileFile = path.join(directory, "profile.md");
  const outputFile = path.join(directory, "host-output.json");
  await writeFile(profileFile, "Be precise.");
  const profile = await composeProfile([profileFile]);
  const config = validateRuntimeConfig({
    schemaVersion: 1,
    host: {
      command: [process.execPath, path.join(repositoryRoot, "test/fixtures/host.mjs")],
      cwd: directory,
      env: { RUNTIME_FIXTURE_OUTPUT: outputFile, RUNTIME_FIXTURE_MARKER: "explicit" }
    },
    profile: { files: [profileFile] }
  }, { configPath: path.join(directory, "runtime.json") });
  const invocation = buildHostInvocation(config, ["one", "two words"], { profileText: profile.text, sessionId: "session-test" });
  const result = await runHost(invocation, { stdio: "ignore" });
  assert.equal(result.code, 0);
  const received = JSON.parse(await readFile(outputFile, "utf8"));
  assert.deepEqual(received.arguments, ["one", "two words"]);
  assert.match(received.profile, /Be precise/);
  assert.equal(received.sessionId, "session-test");
  assert.equal(received.marker, "explicit");
});

test("CLI dry run reports the exact safe invocation without launching the host", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "siso-dry-run-test-"));
  const configPath = path.join(directory, "runtime.json");
  await writeFile(configPath, JSON.stringify({
    schemaVersion: 1,
    host: { command: [process.execPath, "never-run.mjs"], cwd: ".", env: {} },
    profile: { files: [] }
  }));
  const { stdout } = await execFileAsync(process.execPath, [
    path.join(repositoryRoot, "bin/siso-agent-runtime"),
    "run", "--config", configPath, "--dry-run", "--", "--dry-run", "two words"
  ]);
  const output = JSON.parse(stdout);
  assert.equal(output.shell, false);
  assert.deepEqual(output.arguments, ["never-run.mjs", "--dry-run", "two words"]);
});

test("control, lifecycle, context, status, and UI contracts compose", async () => {
  const control = new ControlCore();
  control.createTask({ id: "task-1", title: "Verify boundary" });
  control.transition("task-1", "running");
  control.transition("task-1", "completed");
  const snapshot = control.snapshot();
  assert.equal(snapshot.tasks[0].state, "completed");
  assert.deepEqual(snapshot.events.map((event) => event.sequence), [1, 2, 3]);

  const compacted = compactMessages([
    { role: "user", content: "old-message" },
    { role: "assistant", content: "new" }
  ], { maxChars: 3 });
  assert.deepEqual(compacted.messages, [{ role: "assistant", content: "new" }]);
  assert.equal(compacted.budget.droppedMessages, 1);

  const directory = await mkdtemp(path.join(os.tmpdir(), "siso-checkpoint-test-"));
  const checkpointPath = path.join(directory, "checkpoint.json");
  const checkpoint = createCheckpoint({ control: snapshot, context: compacted }, { checkpointId: "checkpoint-test", createdAt: "2026-01-01T00:00:00.000Z" });
  await writeCheckpoint(checkpointPath, checkpoint);
  assert.deepEqual(await readCheckpoint(checkpointPath), checkpoint);

  const status = createRuntimeStatus({ state: "completed", sessionId: "session-test", taskCounts: { completed: 1 } }, { observedAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(status.taskCounts.completed, 1);
  const event = normalizeRuntimeEvent({ type: "runtime.status", sessionId: "session-test", payload: status }, { sequence: 4, occurredAt: status.observedAt });
  assert.equal(event.sequence, 4);
  assert.equal(event.payload.state, "completed");
});

test("profile composition is explicit and bounded", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "siso-profile-test-"));
  const first = path.join(directory, "one.md");
  const second = path.join(directory, "two.md");
  await writeFile(first, "First");
  await writeFile(second, "Second");
  const result = await composeProfile([first, second], { maxBytes: 100 });
  assert.match(result.text, /one\.md/);
  assert.match(result.text, /Second/);
  await assert.rejects(composeProfile([first, second], { maxBytes: 5 }), /exceeds/);
});
