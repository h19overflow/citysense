import type { ChatMessage } from "../types";

export function getReentryResponse(): ChatMessage {
  return {
    id: Date.now().toString(),
    role: "assistant",
    content: "Welcome back — here's what's available to you in Montgomery:\n\n- **Healthcare**: Apply for Medicaid at the DHR office on S. Ripley St.\n- **Employment**: AIDT has a reentry orientation with job placement\n- **Legal**: File a Certificate of Relief to expand job eligibility\n- **Reentry-friendly employers**: 12 local companies actively hiring\n\nLet's start with the most urgent need first.",
    type: "reentry",
    chips: ["Help me apply for Medicaid now", "Which employers hire returning citizens?"],
    flowMeta: {
      flowId: "U6",
      flowName: "Returning Citizen Reentry",
      currentStep: 2,
      totalSteps: 6,
      stepName: "Alabama-specific eligibility",
    },
    actionItems: [
      { id: "u6-1", timeframe: "this_week", label: "Apply for Medicaid at DHR office", completed: false },
      { id: "u6-2", timeframe: "this_week", label: "Attend AIDT reentry orientation", completed: false },
      { id: "u6-3", timeframe: "this_month", label: "Apply to reentry-friendly employers list", completed: false },
      { id: "u6-4", timeframe: "this_month", label: "File Certificate of Relief petition", completed: false },
    ],
  };
}

export function getApplicationHelpResponse(): ChatMessage {
  return {
    id: Date.now().toString(),
    role: "assistant",
    content: "I can walk you through any application **step by step**. Which program are you applying for?\n\n- **SNAP** — food assistance\n- **Medicaid** — healthcare coverage\n- **CHIP** — children's health insurance\n- **LIHEAP** — utility bill help\n- **WIOA** — job training funding\n\nJust pick one and I'll guide you through it.",
    type: "text",
    chips: ["SNAP application", "Medicaid renewal", "WIOA training funding"],
  };
}

export function getNewToMontgomeryResponse(): ChatMessage {
  return {
    id: Date.now().toString(),
    role: "assistant",
    content: "**Welcome to Montgomery!** Here's what I can help you with right away:\n\n1. **Find a job** — local openings matched to your skills\n2. **Check benefits** — see what programs you qualify for\n3. **City services** — connect to transit, utilities, and more\n4. **Healthcare** — find clinics and coverage options\n\nWhat's your most pressing need?",
    type: "text",
    chips: ["I need a job", "Where do I sign up for benefits?", "Healthcare options"],
    flowMeta: {
      flowId: "U5",
      flowName: "New to Montgomery",
      currentStep: 1,
      totalSteps: 5,
      stepName: "Geographic orientation",
    },
  };
}
