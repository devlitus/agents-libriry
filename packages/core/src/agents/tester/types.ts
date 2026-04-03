export interface TestFile {
  path: string;
  content: string;
}

export interface TestResult {
  passed: boolean;
  output: string;
}

export interface TesterOutput {
  testFilesWritten: TestFile[];
  testCommand: string;
  testResult?: TestResult;
  messages: string[];
}