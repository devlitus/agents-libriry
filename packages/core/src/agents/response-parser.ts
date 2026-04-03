import type { ArchitectPlan } from "./architect/types.js";
import type { CoderOutput } from "./coder/types.js";
import type { TesterOutput } from "./tester/types.js";
import type { ReviewerOutput } from "./reviewer/types.js";

export class ResponseParseError extends Error {
  name = "ResponseParseError";
  constructor(message: string) {
    super(message);
  }
}

function extractJson(text: string): string {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
  if (match) {
    return match[1].trim();
  }
  const jsonMatch = text.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  throw new ResponseParseError("No JSON found in response");
}

function parseJson<T>(text: string): T {
  const jsonStr = extractJson(text);
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new ResponseParseError(`Invalid JSON: ${jsonStr.slice(0, 100)}...`);
  }
}

export function parseArchitectResponse(raw: string): ArchitectPlan {
  return parseJson<ArchitectPlan>(raw);
}

export function parseCoderResponse(raw: string): CoderOutput {
  return parseJson<CoderOutput>(raw);
}

export function parseTesterResponse(raw: string): TesterOutput {
  return parseJson<TesterOutput>(raw);
}

export function parseReviewerResponse(raw: string): ReviewerOutput {
  return parseJson<ReviewerOutput>(raw);
}

export function tryParseWithRetry<T>(
  raw: string,
  parser: (text: string) => T,
  maxRetries = 2
): T {
  let lastError: Error | undefined;
  let current = raw;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return parser(current);
    } catch (error) {
      lastError = error as Error;
      current = tryCorrectJson(current);
    }
  }

  throw lastError || new ResponseParseError("Failed to parse after retries");
}

function tryCorrectJson(text: string): string {
  let result = text.trim();
  if (result.startsWith("```json")) {
    result = result.slice(7);
  } else if (result.startsWith("```")) {
    result = result.slice(3);
  }
  if (result.endsWith("```")) {
    result = result.slice(0, -3);
  }
  return result.trim();
}