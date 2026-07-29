import { writeFile } from "node:fs/promises";

const output = process.env.RUNTIME_FIXTURE_OUTPUT;
if (!output) throw new Error("RUNTIME_FIXTURE_OUTPUT is required");
await writeFile(output, JSON.stringify({
  arguments: process.argv.slice(2),
  profile: process.env.SISO_AGENT_PROFILE,
  sessionId: process.env.SISO_RUNTIME_SESSION_ID,
  marker: process.env.RUNTIME_FIXTURE_MARKER
}));
