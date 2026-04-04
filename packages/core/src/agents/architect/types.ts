import type { ProjectConventions } from "../../indexer/types.js";

export interface ArchitectPlanFile {
  path: string;
  description: string;
  template?: string;
}

export interface ArchitectPlanModification {
  path: string;
  currentContent: string;
  change: string;
}

export interface ArchitectPlan {
  filesToCreate: ArchitectPlanFile[];
  filesToModify: ArchitectPlanModification[];
  conventions: ProjectConventions;
  notes: string[];
}