declare module 'diff' {
  export interface PatchOptions {
    context?: number;
  }
  export function createPatch(fileName: string, oldStr: string, newStr: string, oldHeader?: string, newHeader?: string, options?: PatchOptions): string;
  
  export interface Change {
    value: string;
    added?: boolean;
    removed?: boolean;
  }
  export function diffLines(oldStr: string, newStr: string): Change[];
}