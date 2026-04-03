import { describe, it, expect } from "vitest";
import type { ReviewerOutput, ReviewObservation } from "./reviewer/types.js";

describe("ReviewerOutput structure", () => {
  it("observations is array of ReviewObservation", () => {
    const output: ReviewerOutput = {
      observations: [
        {
          severity: "warning",
          file: "src/api.ts",
          line: 23,
          message: "Missing error handling",
          suggestion: "Add try-catch block",
        },
      ],
      overallAssessment: "warnings",
      messages: [],
    };
    expect(output.observations).toHaveLength(1);
  });

  it("observation has severity, file, line, message, suggestion", () => {
    const obs: ReviewObservation = {
      severity: "error",
      file: "src/auth.ts",
      line: 42,
      message: "Hardcoded credentials",
      suggestion: "Use environment variables",
    };
    expect(obs.severity).toBe("error");
    expect(obs.file).toBe("src/auth.ts");
    expect(obs.line).toBe(42);
    expect(obs.message).toContain("credentials");
  });

  it("observation line is optional", () => {
    const obs: ReviewObservation = {
      severity: "suggestion",
      file: "src/utils.ts",
      message: "Consider using const instead of let",
    };
    expect(obs.line).toBeUndefined();
  });

  it("overallAssessment is pass|warnings|issues", () => {
    const pass: ReviewerOutput = { observations: [], overallAssessment: "pass", messages: [] };
    const warnings: ReviewerOutput = {
      observations: [{ severity: "warning", file: "f.ts", message: "warn" }],
      overallAssessment: "warnings",
      messages: [],
    };
    const issues: ReviewerOutput = {
      observations: [{ severity: "error", file: "f.ts", message: "err" }],
      overallAssessment: "issues",
      messages: [],
    };
    expect(pass.overallAssessment).toBe("pass");
    expect(warnings.overallAssessment).toBe("warnings");
    expect(issues.overallAssessment).toBe("issues");
  });

  it("messages is array of strings", () => {
    const output: ReviewerOutput = {
      observations: [],
      overallAssessment: "pass",
      messages: ["Review complete", "No issues found"],
    };
    expect(output.messages).toHaveLength(2);
  });
});