import type { ReviewObservation } from "./types.js";

export interface FileContent {
  path: string;
  content: string;
}

/** Patterns that match hardcoded credentials in source code */
const CREDENTIAL_PATTERNS = [
  /\bpassword\s*=\s*['"][^'"]+['"]/,
  /\bapi_key\s*=\s*['"][^'"]+['"]/,
  /\bsecret\s*=\s*['"][^'"]+['"]/,
  /\bapiKey\s*=\s*['"][^'"]+['"]/,
] as const;

/** Patterns that match potential SQL injection via string concatenation */
const SQL_INJECTION_PATTERNS = [
  /SELECT.*FROM.*WHERE.*=.*\+/,
  /INSERT.*INTO.*VALUES.*\+/,
  /UPDATE.*SET.*=.*\+/,
  /DELETE.*FROM.*WHERE.*=.*\+/,
] as const;

/** Patterns that match dangerous dynamic code execution */
const CODE_EXEC_PATTERNS = [/\beval\s*\(/, /\bexec\s*\(/] as const;

/**
 * Runs security checks on the provided files and returns a list of observations.
 * Checks for: hardcoded credentials, SQL injection patterns, eval/exec usage,
 * dangerouslySetInnerHTML, and direct innerHTML manipulation.
 */
export function runSecurityChecks(files: FileContent[]): ReviewObservation[] {
  const observations: ReviewObservation[] = [];

  for (const file of files) {
    const lines = file.content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for hardcoded credentials
      if (CREDENTIAL_PATTERNS.some((p) => p.test(line))) {
        observations.push({
          severity: "error",
          file: file.path,
          line: lineNumber,
          message: "Possible hardcoded credentials detected",
          suggestion: "Use environment variables or a secrets manager",
        });
      }

      // Check for SQL injection via string concatenation
      if (SQL_INJECTION_PATTERNS.some((p) => p.test(line))) {
        observations.push({
          severity: "error",
          file: file.path,
          line: lineNumber,
          message: "Possible unsanitized SQL string concatenation",
          suggestion: "Use parameterized queries or an ORM",
        });
      }

      // Check for eval/exec usage
      if (CODE_EXEC_PATTERNS.some((p) => p.test(line))) {
        observations.push({
          severity: "error",
          file: file.path,
          line: lineNumber,
          message: "Use of eval() or exec() detected",
          suggestion: "Avoid dynamic code execution, find safer alternatives",
        });
      }

      if (line.includes("dangerouslySetInnerHTML")) {
        observations.push({
          severity: "warning",
          file: file.path,
          line: lineNumber,
          message: "Use of dangerouslySetInnerHTML",
          suggestion: "Ensure the input is properly sanitized before rendering",
        });
      }

      if (line.match(/\.innerHTML\s*=/)) {
        observations.push({
          severity: "warning",
          file: file.path,
          line: lineNumber,
          message: "Direct manipulation of innerHTML",
          suggestion: "Ensure the input is properly sanitized or use textContent",
        });
      }
    }
  }

  return observations;
}
