import { InvalidTestPathError } from './invalid-path-error.js';

/**
 * Shell metacharacters that need to be escaped to prevent command injection.
 */
const SHELL_METACHARACTERS = /[;&|`$<>()[\]{}!#*?\\'"]/g;

/**
 * Human-readable descriptions for shell metacharacters detected in paths.
 */
const METACHAR_DESCRIPTIONS: Record<string, string> = {
  ';': 'contains semicolon',
  '|': 'contains pipe',
  '&': 'contains ampersand',
  '<': 'contains less-than',
  '>': 'contains greater-than',
  '(': 'contains opening parenthesis',
  ')': 'contains closing parenthesis',
  '[': 'contains opening square bracket',
  ']': 'contains closing square bracket',
  '{': 'contains opening curly brace',
  '}': 'contains closing curly brace',
  '!': 'contains exclamation mark',
  '#': 'contains hash',
  '*': 'contains asterisk',
  '?': 'contains question mark',
  "'": 'contains single quote',
  '\\': 'contains backslash',
};

/**
 * Escapes shell metacharacters in a string by prefixing with backslash.
 * Returns the input unchanged if no metacharacters are found.
 */
export function shellEscape(s: string): string {
  if (!SHELL_METACHARACTERS.test(s)) {
    return s;
  }
  return s.replace(SHELL_METACHARACTERS, '\\$&');
}

/**
 * Validates that a test path does not contain shell metacharacters.
 * Throws InvalidTestPathError if the path is unsafe.
 */
export function validateTestPath(path: string): void {
  if (path.includes('`')) {
    throw new InvalidTestPathError(path, 'contains backtick command substitution');
  }
  if (path.includes('$(')) {
    throw new InvalidTestPathError(path, 'contains $() command substitution');
  }

  const metacharMatch = path.match(SHELL_METACHARACTERS);
  if (metacharMatch) {
    const found = metacharMatch[0];
    const desc = METACHAR_DESCRIPTIONS[found] ?? `contains dangerous character "${found}"`;
    throw new InvalidTestPathError(path, desc);
  }
}

/**
 * Generates a framework-specific test command with properly escaped paths.
 */
export function generateTestCommand(
  testFramework: string,
  testFilePath: string,
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' = 'npm'
): string {
  const fw = testFramework.toLowerCase();
  const escapedPath = shellEscape(testFilePath);

  if (fw === 'jest') {
    if (packageManager === 'pnpm') {
      return `pnpm test -- --testPathPattern=${escapedPath}`;
    }
    if (packageManager === 'yarn') {
      return `yarn test --testPathPattern=${escapedPath}`;
    }
    return `npm test -- --testPathPattern=${escapedPath}`;
  }

  if (fw === 'vitest') {
    return `npx vitest run ${escapedPath}`;
  }

  if (fw === 'mocha') {
    return `npx mocha ${escapedPath}`;
  }

  if (fw === 'pytest') {
    return `pytest ${escapedPath}`;
  }

  if (fw === 'rust' || fw === 'cargo') {
    return `cargo test ${escapedPath}`;
  }

  if (packageManager === 'pnpm') {
    return `pnpm test -- ${escapedPath}`;
  }
  if (packageManager === 'yarn') {
    return `yarn test ${escapedPath}`;
  }
  return `npm test -- ${escapedPath}`;
}
