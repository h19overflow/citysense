import type { ProcessingStep } from "./types";

const WELCOME_CHIPS = [
  "I just got a job offer — will I lose my benefits?",
  "I lost my Medicaid — what do I do?",
  "I want to earn more — how do I move up?",
  "I'm a single parent juggling work and kids",
  "I'm new to Montgomery and need to get started",
  "I'm rebuilding after release — where do I begin?",
];

export const INITIAL_PROCESSING_STEPS: ProcessingStep[] = [
  { label: "Understanding your situation", status: "in_progress" },
  { label: "Checking benefit eligibility rules", status: "pending" },
  { label: "Building your personalized plan", status: "pending" },
];

export function buildWelcomeMessage() {
  return {
    id: "welcome",
    role: "assistant" as const,
    content:
      "Hello! I'm here to help you navigate benefits, jobs, and city services in Montgomery, AL. What's going on in your life right now?",
    type: "text" as const,
    chips: WELCOME_CHIPS,
  };
}

export function buildUserMessage(text: string) {
  return {
    id: Date.now().toString(),
    role: "user" as const,
    content: text,
    type: "text" as const,
  };
}

const ARTIFACT_TITLES: Record<string, string> = {
  "benefits-cliff": "Benefits Cliff Analysis",
  "job-card": "Job Recommendations",
  medicaid: "Medicaid Coverage Options",
  "skill-gap": "Skill Gap Analysis",
  reentry: "Reentry Resource Guide",
  "pdf-preview": "Benefits Eligibility Report",
};

export function buildArtifactForResponse(messageId: string, responseType: string) {
  const title = ARTIFACT_TITLES[responseType];
  if (!title) return null;

  return {
    id: `artifact-${messageId}`,
    type: "A1" as const,
    title,
    messageId,
    createdAt: new Date(),
  };
}
