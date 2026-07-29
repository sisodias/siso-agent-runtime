const TRANSITIONS = {
  pending: new Set(["running", "failed"]),
  running: new Set(["completed", "failed"]),
  completed: new Set(),
  failed: new Set()
};

export class ControlCore {
  #tasks = new Map();
  #events = [];
  #sequence = 0;

  createTask({ id, title, metadata = {} }) {
    if (typeof id !== "string" || !id || this.#tasks.has(id)) throw new Error("task id must be unique and non-empty");
    if (typeof title !== "string" || !title) throw new Error("task title must be non-empty");
    const task = { id, title, state: "pending", metadata: structuredClone(metadata) };
    this.#tasks.set(id, task);
    this.record("task.created", { taskId: id });
    return structuredClone(task);
  }

  transition(taskId, nextState) {
    const task = this.#tasks.get(taskId);
    if (!task) throw new Error(`unknown task: ${taskId}`);
    if (!TRANSITIONS[task.state]?.has(nextState)) throw new Error(`invalid task transition: ${task.state} -> ${nextState}`);
    const previousState = task.state;
    task.state = nextState;
    this.record("task.transitioned", { taskId, previousState, nextState });
    return structuredClone(task);
  }

  record(type, payload = {}) {
    if (typeof type !== "string" || !type) throw new Error("event type must be non-empty");
    const event = { sequence: ++this.#sequence, type, payload: structuredClone(payload) };
    this.#events.push(event);
    return structuredClone(event);
  }

  snapshot() {
    return {
      tasks: [...this.#tasks.values()].map((task) => structuredClone(task)),
      events: this.#events.map((event) => structuredClone(event))
    };
  }
}
