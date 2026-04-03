export interface FileWrite {
  path: string;
  content: string;
  isNew: boolean;
}

export interface CoderOutput {
  filesWritten: FileWrite[];
  dependenciesInstalled: string[];
  messages: string[];
}