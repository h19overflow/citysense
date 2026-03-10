import { FLOW_DEFINITIONS } from "@/lib/flowDefinitions";
import { useApp } from "@/lib/appContext";
import { CheckCircle2, Circle } from "lucide-react";

function StepDot({ status }: { status: "completed" | "current" | "future" }) {
  if (status === "completed")
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--pine-green))]" />;
  if (status === "current")
    return <div className="h-3 w-3 shrink-0 rounded-full bg-primary mt-0.5" />;
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />;
}

function stepStatus(stepNumber: number, currentStep: number): "completed" | "current" | "future" {
  if (stepNumber < currentStep) return "completed";
  if (stepNumber === currentStep) return "current";
  return "future";
}

export function FlowStepper() {
  const { state } = useApp();
  const flow = state.activeFlow;

  if (!flow) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Start a conversation to see your journey.
      </p>
    );
  }

  const definition = FLOW_DEFINITIONS[flow.flowId];

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-foreground mb-2">
        {definition.icon} {definition.name}
      </p>
      {definition.steps.map((flowStep) => {
        const status = stepStatus(flowStep.step, flow.currentStep);
        return (
          <div key={flowStep.step} className="flex items-start gap-2 py-0.5">
            <StepDot status={status} />
            <span
              className={
                status === "completed"
                  ? "text-xs text-muted-foreground line-through"
                  : status === "current"
                  ? "text-xs font-medium text-foreground"
                  : "text-xs text-muted-foreground"
              }
            >
              {flowStep.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
