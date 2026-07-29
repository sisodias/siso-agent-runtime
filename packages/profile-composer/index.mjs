import { readFile } from "node:fs/promises";
import path from "node:path";

export async function composeProfile(files, { maxBytes = 65_536 } = {}) {
  if (!Array.isArray(files) || files.some((file) => typeof file !== "string" || !file)) {
    throw new TypeError("profile files must be an array of non-empty paths");
  }
  if (!Number.isInteger(maxBytes) || maxBytes < 1) throw new RangeError("maxBytes must be a positive integer");
  const sections = [];
  let bytes = 0;
  for (const file of files) {
    const content = await readFile(path.resolve(file), "utf8");
    const section = `## ${path.basename(file)}\n\n${content.trim()}\n`;
    bytes += Buffer.byteLength(section, "utf8");
    if (bytes > maxBytes) throw new RangeError(`composed profile exceeds ${maxBytes} bytes`);
    sections.push(section);
  }
  return { text: sections.join("\n"), files: files.map((file) => path.resolve(file)), bytes };
}
