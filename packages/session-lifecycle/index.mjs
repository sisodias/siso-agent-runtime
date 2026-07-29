import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export function createCheckpoint(state, { checkpointId = `checkpoint-${Date.now()}`, createdAt = new Date().toISOString() } = {}) {
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("checkpoint state must be an object");
  return {
    schemaVersion: 1,
    checkpointId,
    createdAt,
    state: structuredClone(state)
  };
}

export async function writeCheckpoint(filePath, checkpoint) {
  const destination = path.resolve(filePath);
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, `${JSON.stringify(checkpoint, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, destination);
  return destination;
}

export async function readCheckpoint(filePath) {
  const parsed = JSON.parse(await readFile(path.resolve(filePath), "utf8"));
  if (parsed.schemaVersion !== 1 || typeof parsed.checkpointId !== "string" || !parsed.state || typeof parsed.state !== "object") {
    throw new Error("invalid runtime checkpoint");
  }
  return parsed;
}
