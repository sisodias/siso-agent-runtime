const EVENT_TYPES = new Set([
  "runtime.started",
  "runtime.status",
  "tool.started",
  "tool.finished",
  "assistant.delta",
  "assistant.final",
  "runtime.error"
]);

export function normalizeRuntimeEvent(event, { sequence = 1, occurredAt = new Date().toISOString() } = {}) {
  if (!event || typeof event !== "object" || Array.isArray(event)) throw new TypeError("runtime event must be an object");
  if (!EVENT_TYPES.has(event.type)) throw new Error(`unsupported runtime event type: ${event.type}`);
  if (!Number.isInteger(sequence) || sequence < 1) throw new RangeError("event sequence must be a positive integer");
  return {
    schemaVersion: 1,
    sequence,
    type: event.type,
    sessionId: typeof event.sessionId === "string" ? event.sessionId : null,
    occurredAt,
    payload: structuredClone(event.payload ?? {})
  };
}

export const runtimeEventTypes = Object.freeze([...EVENT_TYPES]);
