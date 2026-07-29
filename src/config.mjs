import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
}

function resolveFrom(baseDirectory, value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return path.resolve(baseDirectory, value);
}

export function validateRuntimeConfig(input, { configPath = "runtime.json" } = {}) {
  assertObject(input, "configuration");
  if (input.schemaVersion !== 1) {
    throw new Error("configuration schemaVersion must be 1");
  }

  assertObject(input.host, "host");
  if (!Array.isArray(input.host.command) || input.host.command.length === 0 || input.host.command.some((part) => typeof part !== "string" || part.length === 0)) {
    throw new TypeError("host.command must be a non-empty array of non-empty strings");
  }
  if (input.host.env !== undefined) {
    assertObject(input.host.env, "host.env");
    for (const [key, value] of Object.entries(input.host.env)) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || typeof value !== "string") {
        throw new TypeError("host.env must contain string values under valid environment names");
      }
    }
  }

  const baseDirectory = path.dirname(path.resolve(configPath));
  const profile = input.profile ?? { files: [] };
  assertObject(profile, "profile");
  if (!Array.isArray(profile.files) || profile.files.some((file) => typeof file !== "string" || file.length === 0)) {
    throw new TypeError("profile.files must be an array of non-empty strings");
  }
  const maxBytes = profile.maxBytes ?? 65_536;
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 1_048_576) {
    throw new RangeError("profile.maxBytes must be an integer between 1 and 1048576");
  }

  const maxChars = input.context?.maxChars ?? 16_000;
  if (!Number.isInteger(maxChars) || maxChars < 1) {
    throw new RangeError("context.maxChars must be a positive integer");
  }

  return {
    schemaVersion: 1,
    configPath: path.resolve(configPath),
    baseDirectory,
    host: {
      command: [...input.host.command],
      cwd: input.host.cwd ? resolveFrom(baseDirectory, input.host.cwd, "host.cwd") : baseDirectory,
      env: { ...(input.host.env ?? {}) }
    },
    profile: {
      files: profile.files.map((file) => resolveFrom(baseDirectory, file, "profile file")),
      maxBytes
    },
    session: {
      checkpointDirectory: resolveFrom(baseDirectory, input.session?.checkpointDirectory ?? ".runtime/checkpoints", "session.checkpointDirectory")
    },
    context: { maxChars }
  };
}

export async function loadRuntimeConfig(configPath) {
  const absolutePath = path.resolve(configPath);
  const raw = await readFile(absolutePath, "utf8");
  return validateRuntimeConfig(JSON.parse(raw), { configPath: absolutePath });
}

export async function inspectRuntimeConfig(config) {
  const findings = [];
  try {
    await access(config.host.cwd, constants.R_OK);
    findings.push({ check: "host.cwd", ok: true, value: config.host.cwd });
  } catch {
    findings.push({ check: "host.cwd", ok: false, value: config.host.cwd });
  }
  for (const file of config.profile.files) {
    try {
      await access(file, constants.R_OK);
      findings.push({ check: "profile.file", ok: true, value: file });
    } catch {
      findings.push({ check: "profile.file", ok: false, value: file });
    }
  }
  const executable = config.host.command[0];
  const candidates = executable.includes(path.sep)
    ? [path.resolve(config.host.cwd, executable)]
    : (process.env.PATH ?? "").split(path.delimiter).filter(Boolean).map((directory) => path.join(directory, executable));
  let executablePath = null;
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      executablePath = candidate;
      break;
    } catch {
      // Keep checking the explicit path or PATH entries.
    }
  }
  findings.push({ check: "host.command", ok: executablePath !== null, value: executable, resolved: executablePath });
  findings.push({ check: "session.checkpointDirectory", ok: true, value: config.session.checkpointDirectory, note: "created only when a checkpoint is explicitly written" });
  return { ok: findings.every((finding) => finding.ok), findings };
}
