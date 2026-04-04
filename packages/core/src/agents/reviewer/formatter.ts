import type { ReviewObservation } from "./types.js";

export function formatObservation(obs: ReviewObservation): string {
  const icon = obs.severity === "error" ? "❌" : obs.severity === "warning" ? "⚠" : "💡";
  const location = obs.line ? `${obs.file} line ${obs.line}` : obs.file;
  
  let formatted = `${icon}  ${location}\n   ${obs.message}`;
  if (obs.suggestion) {
    formatted += `\n   Suggestion: ${obs.suggestion}`;
  }
  
  return formatted;
}
