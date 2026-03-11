export type FlowId = "U1" | "U2" | "U3" | "U4" | "U5" | "U6";
export type Language = "EN" | "ES";
export type AppView = "cv" | "services" | "profile" | "admin" | "news" | "career";
export type MessageType =
  | "text"
  | "benefits-cliff"
  | "job-card"
  | "medicaid"
  | "skill-gap"
  | "reentry"
  | "pdf-preview";

export interface FlowMeta {
  flowId: FlowId;
  flowName: string;
  currentStep: number;
  totalSteps: number;
  stepName: string;
}

export interface ActionItem {
  id: string;
  timeframe: "this_week" | "this_month" | "3_months";
  label: string;
  completed: boolean;
}

export interface ProcessingStep {
  label: string;
  status: "pending" | "in_progress" | "completed";
}

export interface Artifact {
  id: string;
  type: "A1" | "A2" | "A3" | "A4";
  title: string;
  messageId: string;
  createdAt: Date;
}
