import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRuntimeConfig, inspectRuntimeConfig } from "./config.mjs";
import { buildHostInvocation, publicInvocation, runHost } from "./host.mjs";
import { composeProfile } from "../packages/profile-composer/index.mjs";
import { compactMessages } from "../packages/context-manager/index.mjs";
import { createCheckpoint, writeCheckpoint } from "../packages/session-lifecycle/index.mjs";
import { createRuntimeStatus } from "../packages/status-surface/index.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const help = `SISO Agent Runtime

Usage:
  siso-agent-runtime manifest
  siso-agent-runtime doctor --config <file>
  siso-agent-runtime where [--config <file>]
  siso-agent-runtime run --config <file> [--dry-run] -- [host args]
  siso-agent-runtime checkpoint --input <state.json> --output <checkpoint.json>
  siso-agent-runtime compact --input <messages.json> [--max-chars N]
  siso-agent-runtime status --input <state.json>
`;

function option(args, name, { required = false } = {}) {
  const index = args.indexOf(name);
  if (index === -1) {
    if (required) throw new Error(`missing required option: ${name}`);
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`missing value for option: ${name}`);
  return value;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(path.resolve(filePath), "utf8"));
}

function print(value) {
  process.stdout.write(`${typeof value === "string" ? value : JSON.stringify(value, null, 2)}\n`);
}

export async function main(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  if (!command || command === "help" || command === "--help" || command === "-h") {
    print(help.trimEnd());
    return 0;
  }

  if (command === "manifest") {
    print(await readJson(path.join(rootDirectory, "runtime.manifest.json")));
    return 0;
  }

  if (command === "doctor") {
    const config = await loadRuntimeConfig(option(args, "--config", { required: true }));
    const result = await inspectRuntimeConfig(config);
    print(result);
    return result.ok ? 0 : 1;
  }

  if (command === "where") {
    const configPath = option(args, "--config");
    const config = configPath ? await loadRuntimeConfig(configPath) : null;
    print({ rootDirectory, manifest: path.join(rootDirectory, "runtime.manifest.json"), configPath: config?.configPath ?? null, checkpointDirectory: config?.session.checkpointDirectory ?? null });
    return 0;
  }

  if (command === "run") {
    const separator = args.indexOf("--");
    const runtimeArguments = separator === -1 ? args : args.slice(0, separator);
    const config = await loadRuntimeConfig(option(runtimeArguments, "--config", { required: true }));
    const hostArguments = separator === -1 ? [] : args.slice(separator + 1);
    const profile = await composeProfile(config.profile.files, { maxBytes: config.profile.maxBytes });
    const invocation = buildHostInvocation(config, hostArguments, { profileText: profile.text });
    if (runtimeArguments.includes("--dry-run")) {
      print({ ...publicInvocation(invocation), profile: { files: profile.files, bytes: profile.bytes } });
      return 0;
    }
    const result = await runHost(invocation);
    return result.code ?? 1;
  }

  if (command === "checkpoint") {
    const input = await readJson(option(args, "--input", { required: true }));
    const output = option(args, "--output", { required: true });
    const checkpoint = createCheckpoint(input);
    await writeCheckpoint(output, checkpoint);
    print({ checkpointId: checkpoint.checkpointId, output: path.resolve(output) });
    return 0;
  }

  if (command === "compact") {
    const input = await readJson(option(args, "--input", { required: true }));
    const rawMax = option(args, "--max-chars");
    print(compactMessages(input, { maxChars: rawMax ? Number(rawMax) : 16_000 }));
    return 0;
  }

  if (command === "status") {
    print(createRuntimeStatus(await readJson(option(args, "--input", { required: true }))));
    return 0;
  }

  throw new Error(`unknown command: ${command}`);
}
