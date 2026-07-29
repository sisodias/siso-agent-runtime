import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skipped = new Set([".git", "node_modules"]);
const deny = [
  "/Us" + "ers/",
  "SISO_" + "Workspace",
  "shaan" + "sisodia",
  "sk-" + "or-v1-",
  "bif" + "rost",
  "tail" + "net"
];
const textExtensions = new Set([".md", ".mjs", ".json", ".html", ".txt", ".yml", ".yaml"]);
let checked = 0;

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (skipped.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute);
      continue;
    }
    const extension = path.extname(entry.name);
    if (!textExtensions.has(extension) && extension !== "" && !entry.name.startsWith(".")) continue;
    const content = await readFile(absolute, "utf8");
    checked += 1;
    for (const pattern of deny) {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        throw new Error(`publication safety violation in ${path.relative(root, absolute)}`);
      }
    }
  }
}

await walk(root);
try {
  const metadata = execFileSync("git", ["log", "--format=%an <%ae>%n%cn <%ce>"], { cwd: root, encoding: "utf8" });
  if (/\.(?:local|lan)>/i.test(metadata)) throw new Error("private machine identity found in Git metadata");
} catch (error) {
  if (!String(error.message).includes("does not have any commits")) throw error;
}
process.stdout.write(`RUNTIME_PUBLICATION_OK (${checked} text files)\n`);
