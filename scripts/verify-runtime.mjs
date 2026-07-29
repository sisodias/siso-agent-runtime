import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "../src/cli.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(root, "runtime.manifest.json"), "utf8"));
assert.equal(manifest.schema_version, 1);
assert.equal(manifest.runtime.id, "siso-agent-runtime");
assert.equal(manifest.runtime.provider_neutral, true);
assert.deepEqual(manifest.modules.map((module) => module.id), [
  "control-core",
  "session-lifecycle",
  "context-manager",
  "status-surface",
  "tui-contracts",
  "profile-composer"
]);
for (const relativePath of ["README.md", "AGENTS.md", "MIGRATION-MAP.json", "PROVENANCE.md", "docs/ARCHITECTURE.html", "reports/checkpoint-agent-runtime.html"]) {
  await readFile(path.join(root, relativePath));
}
assert.equal(await main(["--help"]), 0);
process.stdout.write("RUNTIME_CONTRACT_OK (6 internal modules)\n");
