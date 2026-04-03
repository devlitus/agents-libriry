export interface ReviewObservation {
  severity: "error" | "warning" | "suggestion";
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
}

export type OverallAssessment = "pass" | "warnings" | "issues";

export interface ReviewerOutput {
  observations: ReviewObservation[];
  overallAssessment: OverallAssessment;
  messages: string[];
}