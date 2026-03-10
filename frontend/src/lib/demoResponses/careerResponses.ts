import type { ChatMessage } from "../types";

export function getCareerLadderResponse(): ChatMessage {
  return {
    id: Date.now().toString(),
    role: "assistant",
    content: "Based on your experience, here's a path to **higher-paying roles**:\n\n1. **Quality Control Cert** — 6-week AIDT program, free for AL residents\n2. **Line Lead position** — $18-22/hr, your current plant is hiring\n3. **WIOA funding** — covers training costs + provides a stipend\n\nThe fastest move is registering for the next AIDT orientation session.",
    type: "skill-gap",
    chips: ["Walk me through WIOA application", "Tell me about AIDT programs"],
    flowMeta: {
      flowId: "U3",
      flowName: "Assembly Line Ladder",
      currentStep: 2,
      totalSteps: 6,
      stepName: "Skill gap analysis",
    },
    profileData: {
      income: 1250,
    },
    actionItems: [
      { id: "u3-1", timeframe: "this_week", label: "Register for AIDT orientation session", completed: false },
      { id: "u3-2", timeframe: "this_month", label: "Enroll in Quality Control certification", completed: false },
      { id: "u3-3", timeframe: "this_month", label: "Apply for Line Lead posting at current plant", completed: false },
    ],
  };
}

export function getHealthClinicsResponse(): ChatMessage {
  return {
    id: Date.now().toString(),
    role: "assistant",
    content: "Here are **health clinics** near you in Montgomery:\n\n- **Family Health Center** — 2045 Fairview Ave\n  - Walk-ins accepted, sliding-scale fees\n  - Phone: (334) 272-7902\n- **Baptist Health Clinic** — 301 Brown Springs Rd\n  - Primary care + dental, accepts Medicaid\n  - Phone: (334) 273-4400\n- **Central Alabama Veterans** — 215 Perry Hill Rd\n  - Veterans only, no copay for service-connected\n  - Phone: (334) 272-4670\n\nWould you like me to show these on the map?",
    type: "text",
    chips: ["Show on map", "Which accept walk-ins?", "Find dental clinics"],
  };
}
