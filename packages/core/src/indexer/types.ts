export interface IndexerConfig {
  rootDir: string;
  ignore: string[];
  alwaysRead: string[];
}

export type NamingStyle = "camelCase" | "snake_case" | "PascalCase" | "kebab-case";
export type ImportStyle = "named" | "default" | "mixed";

export interface ProjectConventions {
  namingStyle: NamingStyle;
  testFilePattern: string;
  testDirectory: string;
  importStyle: ImportStyle;
  indentation: "tabs" | "spaces";
  indentSize: number;
  semicolons: boolean;
  quotes: "single" | "double";
}

export interface FileTreeNode {
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

export interface DetectedProject {
  language: string;
  framework: string | null;
  testFramework: string | null;
  conventions: ProjectConventions;
  fileTree: FileTreeNode[];
  configFiles: string[];
  entryPoints: string[];
}

export interface KeyFileInfo {
  path: string;
  mtime: number;
}
