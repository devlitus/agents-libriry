export type Command =
  | { type: "architect"; prompt: string }
  | { type: "coder"; prompt: string }
  | { type: "tester"; prompt?: string }
  | { type: "reviewer" }
  | { type: "plan"; prompt: string }
  | { type: "free"; prompt: string };

export function parseCommand(input: string): Command {
  const trimmed = input.trim();

  if (trimmed.startsWith("/architect ")) {
    return { type: "architect", prompt: trimmed.slice(10) };
  }
  if (trimmed.startsWith("/coder ")) {
    return { type: "coder", prompt: trimmed.slice(7) };
  }
  if (trimmed.startsWith("/tester")) {
    const rest = trimmed.slice(8).trim();
    if (rest) {
      return { type: "tester", prompt: rest };
    }
    return { type: "tester" };
  }
  if (trimmed === "/reviewer") {
    return { type: "reviewer" };
  }
  if (trimmed.startsWith("/plan ")) {
    return { type: "plan", prompt: trimmed.slice(6) };
  }

  return { type: "free", prompt: input };
}