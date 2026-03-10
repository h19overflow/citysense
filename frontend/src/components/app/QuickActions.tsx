import type { FlowId } from "@/lib/types";
import { useApp } from "@/lib/appContext";

const FLOW_ACTIONS: Record<FlowId, string[]> = {
  U1: ["See cliff analysis", "Check Medicaid impact", "Find bridge programs", "Download my plan"],
  U2: ["Find jobs with insurance", "Help me re-enroll", "Check CHIP for kids", "Emergency coverage"],
  U3: ["Show training programs", "Check WIOA funding", "Childcare during training", "See wage math"],
  U4: ["Compare job options", "Check childcare subsidy", "Find flexible jobs", "DHR tier review"],
  U5: ["What do I qualify for?", "Find jobs near me", "Transit options", "Community resources"],
  U6: ["Certificate of Relief", "Who hires with records?", "Check Medicaid", "AIDT programs"],
};

const DEFAULT_ACTIONS = [
  "Should I take this job?",
  "I lost my Medicaid",
  "I want to earn more",
  "What do I qualify for?",
];

interface QuickActionsProps {
  onAction: (text: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const { state } = useApp();
  const actions = state.activeFlow
    ? FLOW_ACTIONS[state.activeFlow.flowId]
    : DEFAULT_ACTIONS;

  return (
    <div className="space-y-1.5">
      {actions.map((action) => (
        <button
          key={action}
          onClick={() => onAction(action)}
          className="w-full text-left text-xs px-2.5 py-1.5 rounded-md border border-border/60 text-foreground hover:bg-primary/5 hover:border-primary/40 transition-colors"
        >
          {action}
        </button>
      ))}
    </div>
  );
}
