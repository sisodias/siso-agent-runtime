function messageChars(message) {
  return typeof message?.content === "string" ? message.content.length : JSON.stringify(message?.content ?? "").length;
}

export function compactMessages(messages, { maxChars = 16_000 } = {}) {
  if (!Array.isArray(messages)) throw new TypeError("messages must be an array");
  if (!Number.isInteger(maxChars) || maxChars < 1) throw new RangeError("maxChars must be a positive integer");

  const selected = [];
  let usedChars = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const size = messageChars(messages[index]);
    if (usedChars + size > maxChars) continue;
    selected.unshift(structuredClone(messages[index]));
    usedChars += size;
  }
  return {
    schemaVersion: 1,
    messages: selected,
    budget: {
      maxChars,
      usedChars,
      inputMessages: messages.length,
      retainedMessages: selected.length,
      droppedMessages: messages.length - selected.length
    }
  };
}
