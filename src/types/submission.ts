export type InputType = "plan" | "pitch" | "financials" | "idea";

export type BusinessStage =
  | "idea"
  | "mvp"
  | "pre-revenue"
  | "early-revenue"
  | "growth"
  | "scale"
  | "established";

export interface SubmissionInput {
  inputType: InputType;
  stage: BusinessStage;
  text: string;
  fileUrl?: string;
  targetRegion?: string;
}
