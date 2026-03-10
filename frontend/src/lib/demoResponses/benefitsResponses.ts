import type { ChatMessage } from "../types";

export function getBenefitsCliffResponse(): ChatMessage {
  return {
    id: Date.now().toString(),
    role: "assistant",
    content: "I ran the full picture for you. Here's what this job actually means for your household:\n\n- **Net income change** after benefits adjustment\n- **Healthcare gap** analysis during transition\n- **Childcare impact** on your take-home pay\n\nLet's walk through each one so you can make the best decision.",
    type: "benefits-cliff",
    chips: ["What bridge programs help?", "How do I negotiate $18/hr?", "Walk me through applying"],
    flowMeta: {
      flowId: "U1",
      flowName: "Benefits Cliff Crossroads",
      currentStep: 3,
      totalSteps: 6,
      stepName: "Net income calculation",
    },
    profileData: {
      zip: "36104",
      householdSize: 4,
      income: 890,
      benefits: ["SNAP", "Medicaid", "LIHEAP"],
      children: 3,
    },
    actionItems: [
      { id: "u1-1", timeframe: "this_week", label: "Review cliff analysis with navigator", completed: false },
      { id: "u1-2", timeframe: "this_week", label: "Ask employer about health insurance start date", completed: false },
      { id: "u1-3", timeframe: "this_month", label: "Apply for Transitional SNAP", completed: false },
      { id: "u1-4", timeframe: "this_month", label: "File CHIP application for children", completed: false },
    ],
  };
}

export function getMedicaidLossResponse(): ChatMessage {
  return {
    id: Date.now().toString(),
    role: "assistant",
    content: "Here are your **immediate options** for healthcare coverage:\n\n- **CHIP** — covers children under 19 in your household\n- **QMB (Medicare Savings)** — helps pay Medicare premiums & copays\n- **Sliding-scale clinics** — low-cost visits based on income\n\nI recommend starting with CHIP this week since it has the fastest turnaround.",
    type: "medicaid",
    chips: ["Tell me more about QMB", "Help me apply for CHIP", "Find sliding-scale clinics near me"],
    flowMeta: {
      flowId: "U2",
      flowName: "Medicaid Loss + Career Reset",
      currentStep: 2,
      totalSteps: 6,
      stepName: "Emergency coverage scan",
    },
    profileData: {
      benefits: ["Medicaid (lost)"],
    },
    actionItems: [
      { id: "u2-1", timeframe: "this_week", label: "File CHIP application for children", completed: false },
      { id: "u2-2", timeframe: "this_week", label: "Apply for QMB (Medicare Savings Program)", completed: false },
      { id: "u2-3", timeframe: "this_month", label: "Apply to at least 3 jobs with employer insurance", completed: false },
    ],
  };
}

export function getBenefitsEligibilityResponse(): ChatMessage {
  return {
    id: Date.now().toString(),
    role: "assistant",
    content: "Based on your profile, you may qualify for:\n\n- **SNAP** — food assistance ($680/mo for household of 4)\n- **Medicaid** — full healthcare coverage\n- **LIHEAP** — utility bill assistance (up to $600/yr)\n- **DHR Childcare** — subsidized childcare for working parents\n\nI've prepared a full eligibility report below.",
    type: "pdf-preview",
    chips: ["Download my full report", "What should I apply for first?"],
    flowMeta: {
      flowId: "U5",
      flowName: "New to Montgomery",
      currentStep: 2,
      totalSteps: 5,
      stepName: "Benefits discovery scan",
    },
    profileData: {
      benefits: ["eligible"],
    },
    actionItems: [
      { id: "u5-1", timeframe: "this_week", label: "Apply for SNAP at DHR", completed: false },
      { id: "u5-2", timeframe: "this_week", label: "Verify Medicaid eligibility", completed: false },
      { id: "u5-3", timeframe: "this_month", label: "Register on AlabamaWorks job portal", completed: false },
    ],
  };
}

export function getSingleParentJobsResponse(): ChatMessage {
  return {
    id: Date.now().toString(),
    role: "assistant",
    content: "Here are **cliff-safe jobs** that work for single parents in Montgomery:\n\n- **Baptist Health** — Medical Assistant, $16/hr + full benefits\n- **MGMW** — Customer Service, $15/hr + childcare stipend\n- **Hyundai** — Assembly (evening shift), $19/hr + overtime\n\nAll three keep you **above the benefits cliff** so you won't lose SNAP or Medicaid.",
    type: "job-card",
    chips: ["Show me the cliff analysis", "What childcare help is available?", "Are there evening shift jobs?"],
    flowMeta: {
      flowId: "U4",
      flowName: "Single Parent Financial Reset",
      currentStep: 3,
      totalSteps: 6,
      stepName: "Cliff-safe job search",
    },
    profileData: {
      householdSize: 4,
      income: 890,
      benefits: ["SNAP", "Medicaid", "DHR Childcare"],
      children: 3,
    },
    actionItems: [
      { id: "u4-1", timeframe: "this_week", label: "Review cliff-safe job list with navigator", completed: false },
      { id: "u4-2", timeframe: "this_week", label: "Request DHR childcare subsidy review", completed: false },
      { id: "u4-3", timeframe: "this_month", label: "Apply to employer with benefits above cliff threshold", completed: false },
    ],
  };
}

export function getBridgeProgramsResponse(): ChatMessage {
  return {
    id: Date.now().toString(),
    role: "assistant",
    content: "Alabama has several **bridge programs** to protect you during the transition:\n\n- **Transitional Medicaid** — extends coverage for up to 12 months after you start working\n- **SNAP Transitional Benefits** — 5 extra months of food assistance\n- **DHR Childcare Subsidy** — continues through the transition period\n\nThese ensure you don't lose ground while your income increases. Want me to walk you through applying for any of these?",
    type: "text",
    chips: ["Apply for Transitional Medicaid", "Tell me about SNAP transition", "Check my childcare subsidy"],
  };
}
