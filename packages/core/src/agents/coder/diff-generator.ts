import { createPatch } from 'diff';
import chalk from 'chalk';

export function generateDiff(original: string, modified: string, filePath: string): string {
  const patch = createPatch(filePath, original, modified, '', '', { context: 3 });
  
  // The first 4 lines of createPatch output are header info.
  // We can skip them or format them.
  const lines = patch.split('\n');
  const result: string[] = [];

  // For new files (original is empty), we just show all additions.
  // Actually createPatch handles this well.
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('+')) {
      result.push(chalk.green(line));
    } else if (line.startsWith('-')) {
      result.push(chalk.red(line));
    } else if (line.startsWith('@')) {
      result.push(chalk.cyan(line));
    } else {
      result.push(line); // Context
    }
  }

  // If there's no diff, return empty string or message.
  if (result.length === 0) {
    return '';
  }

  return result.join('\n');
}