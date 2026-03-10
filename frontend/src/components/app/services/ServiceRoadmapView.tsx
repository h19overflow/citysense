import {
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  X,
} from "lucide-react";
import { useApp } from "@/lib/appContext";
import type { RoadmapStep } from "@/lib/types";

export function ServiceRoadmapView() {
  const { state, dispatch } = useApp();
  const roadmap = state.activeRoadmap;

  if (!roadmap) {
    return null;
  }

  const completedSet = new Set(state.roadmapCompletedStepIds);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3">
        <h1 className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
          {roadmap.serviceTitle}
        </h1>
        <button
          onClick={() => dispatch({ type: "CLEAR_ROADMAP" })}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          aria-label="Close roadmap"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {roadmap.eligibilityNote && (
          <p className="rounded-lg bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
            {roadmap.eligibilityNote}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Total time: {roadmap.totalEstimatedTime}</span>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Your steps
          </p>
          <ul className="space-y-3">
            {roadmap.steps.map((step) => (
              <RoadmapStepCard
                key={step.id}
                step={step}
                completed={completedSet.has(step.id)}
                onToggle={() => dispatch({ type: "TOGGLE_ROADMAP_STEP", stepId: step.id })}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function RoadmapStepCard({
  step,
  completed,
  onToggle,
}: {
  step: RoadmapStep;
  completed: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="space-y-2 rounded-xl border border-border/40 p-3 overflow-hidden">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={completed ? "Mark incomplete" : "Mark complete"}
        >
          {completed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">
            {step.stepNumber}. {step.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground break-words">
            {step.action}
          </p>
          {step.estimatedTime && (
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {step.estimatedTime}
            </span>
          )}
        </div>
      </div>

      {step.documents.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-7">
          {step.documents.map((doc) => (
            <span
              key={doc}
              className="inline-flex items-center gap-1 rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              <FileText className="h-3 w-3" />
              {doc}
            </span>
          ))}
        </div>
      )}

      {step.location && (
        <div className="space-y-0.5 pl-7 text-[10px] text-muted-foreground">
          <p className="font-medium text-foreground">{step.location.name}</p>
          <p className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {step.location.address}
          </p>
          {step.location.hours && <p>{step.location.hours}</p>}
          {step.location.phone && <p>{step.location.phone}</p>}
        </div>
      )}

      {step.proTip && (
        <p className="rounded bg-amber-500/10 p-2 pl-7 text-[10px] text-amber-700 dark:text-amber-400 break-words">
          {step.proTip}
        </p>
      )}

      {step.canDoOnline && step.onlineUrl && (
        <a
          href={step.onlineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 pl-7 text-[10px] text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Do this online
        </a>
      )}
    </li>
  );
}
