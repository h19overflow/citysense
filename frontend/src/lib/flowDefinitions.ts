import type { FlowId } from "./types";

export interface FlowStep {
  step: number;
  label: string;
}

export interface FlowDefinition {
  id: FlowId;
  name: string;
  icon: string;
  steps: FlowStep[];
}

export const FLOW_DEFINITIONS: Record<FlowId, FlowDefinition> = {
  U1: {
    id: "U1",
    name: "Benefits Cliff Crossroads",
    icon: "📊",
    steps: [
      { step: 1, label: "Describe your situation" },
      { step: 2, label: "Benefits impact scan" },
      { step: 3, label: "Net income calculation" },
      { step: 4, label: "Transition path" },
      { step: 5, label: "Bridge programs" },
      { step: 6, label: "Follow-up" },
    ],
  },
  U2: {
    id: "U2",
    name: "Medicaid Loss + Career Reset",
    icon: "🏥",
    steps: [
      { step: 1, label: "Coverage loss statement" },
      { step: 2, label: "Emergency coverage scan" },
      { step: 3, label: "Re-enrollment check" },
      { step: 4, label: "Jobs with insurance" },
      { step: 5, label: "Coverage roadmap" },
      { step: 6, label: "Downloads" },
    ],
  },
  U3: {
    id: "U3",
    name: "Assembly Line Ladder",
    icon: "🏭",
    steps: [
      { step: 1, label: "Career statement" },
      { step: 2, label: "Skill gap analysis" },
      { step: 3, label: "Training funding" },
      { step: 4, label: "Childcare bridge" },
      { step: 5, label: "12-month career plan" },
      { step: 6, label: "Downloads" },
    ],
  },
  U4: {
    id: "U4",
    name: "Single Parent Financial Reset",
    icon: "👨‍👩‍👧‍👦",
    steps: [
      { step: 1, label: "Describe your situation" },
      { step: 2, label: "Benefits inventory" },
      { step: 3, label: "Cliff-safe job search" },
      { step: 4, label: "Benefits cliff table" },
      { step: 5, label: "Childcare strategy" },
      { step: 6, label: "Downloads" },
    ],
  },
  U5: {
    id: "U5",
    name: "New to Montgomery",
    icon: "📍",
    steps: [
      { step: 1, label: "Geographic orientation" },
      { step: 2, label: "Benefits discovery scan" },
      { step: 3, label: "Priority action list" },
      { step: 4, label: "Ongoing navigation" },
      { step: 5, label: "Downloads" },
    ],
  },
  U6: {
    id: "U6",
    name: "Returning Citizen Reentry",
    icon: "🔓",
    steps: [
      { step: 1, label: "Reentry statement" },
      { step: 2, label: "Alabama-specific eligibility" },
      { step: 3, label: "Certificate of Relief" },
      { step: 4, label: "Reentry-aware jobs" },
      { step: 5, label: "First 30 days plan" },
      { step: 6, label: "Downloads" },
    ],
  },
};
