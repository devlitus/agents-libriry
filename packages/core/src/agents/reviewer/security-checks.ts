import type { ReviewObservation } from "./types.js";

export interface FileContent {
  path: string;
  content: string;
}

export function runSecurityChecks(files: FileContent[]): ReviewObservation[] {
  const observations: ReviewObservation[] = [];

  for (const file of files) {
    const lines = file.content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      if (
        line.match(/\bpassword\s*=\s*['"][^'"]+['"]/) ||
        line.match(/\bapi_key\s*=\s*['"][^'"]+['"]/) ||
        line.match(/\bsecret\s*=\s*['"][^'"]+['"]/) ||
        line.match(/\bapiKey\s*=\s*['"][^'"]+['"]/)
      ) {
        observations.push({
          severity: "error",
          file: file.path,
          line: lineNumber,
          message: "Possible hardcoded credentials detected",
          suggestion: "Use environment variables or a secrets manager",
        });
      }

      if (
        line.match(/SELECT.*FROM.*WHERE.*=.*\+/) ||
        line.match(/INSERT.*INTO.*VALUES.*\+/) ||
        line.match(/UPDATE.*SET.*=.*\+/) ||
        line.match(/DELETE.*FROM.*WHERE.*=.*\+/)
      ) {
        observations.push({
          severity: "error",
          file: file.path,
          line: lineNumber,
          message: "Possible unsanitized SQL string concatenation",
          suggestion: "Use parameterized queries or an ORM",
        });
      }

      if (line.match(/\beval\s*\(/) || line.match(/\bexec\s*\(/)) {
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
