export function generateTestCommand(testFramework: string, testFilePath: string): string {
  const fw = testFramework.toLowerCase();
  
  if (fw === 'jest') {
    return `npm test -- --testPathPattern=${testFilePath}`;
  }
  
  if (fw === 'vitest') {
    return `npx vitest run ${testFilePath}`;
  }
  
  if (fw === 'mocha') {
    return `npx mocha ${testFilePath}`;
  }
  
  if (fw === 'pytest') {
    return `pytest ${testFilePath}`;
  }
  
  if (fw === 'rust' || fw === 'cargo') {
    return `cargo test ${testFilePath}`;
  }
  
  return `npm test -- ${testFilePath}`;
}
