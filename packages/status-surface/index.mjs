const STATES = new Set(["idle", "starting", "running", "waiting", "completed", "failed"]);

export function createRuntimeStatus(input, { observedAt = new Date().toISOString() } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("status input must be an object");
  const state = input.state ?? "idle";
  if (!STATES.has(state)) throw new Error(`unsupported runtime state: ${state}`);
  return {
    schemaVersion: 1,
    sessionId: typeof input.sessionId === "string" ? input.sessionId : null,
    state,
    activeTaskId: typeof input.activeTaskId === "string" ? input.activeTaskId : null,
    taskCounts: {
      pending: Number(input.taskCounts?.pending ?? 0),
      running: Number(input.taskCounts?.running ?? 0),
      completed: Number(input.taskCounts?.completed ?? 0),
      failed: Number(input.taskCounts?.failed ?? 0)
    },
    usage: {
      inputTokens: Number(input.usage?.inputTokens ?? 0),
      outputTokens: Number(input.usage?.outputTokens ?? 0)
    },
    observedAt
  };
}
