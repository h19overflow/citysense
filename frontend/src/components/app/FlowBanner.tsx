import { useApp } from "@/lib/appContext";
import { FLOW_DEFINITIONS } from "@/lib/flowDefinitions";

const FlowBanner = () => {
  const { state } = useApp();
  const { activeFlow } = state;

  if (!activeFlow) return null;

  const definition = FLOW_DEFINITIONS[activeFlow.flowId];

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-primary/5 border-b border-primary/10">
      <span>{definition.icon}</span>
      <span className="text-sm font-medium">{definition.name}</span>
      <span className="text-sm text-muted-foreground">
        · Step {activeFlow.currentStep} of {activeFlow.totalSteps}
      </span>
    </div>
  );
};

export default FlowBanner;
