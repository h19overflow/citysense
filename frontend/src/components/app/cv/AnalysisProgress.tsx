export const ANALYSIS_STEPS = [
  { label: "Extracting personal info", completeAfterMs: 500 },
  { label: "Analyzing work experience", completeAfterMs: 1000 },
  { label: "Mapping skills", completeAfterMs: 1500 },
];

function StepRow({ label, completed }: { label: string; completed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {completed ? (
        <span className="text-green-500 text-xs font-bold">✓</span>
      ) : (
        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      )}
      <span className={`text-sm ${completed ? "text-muted-foreground" : "text-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

export function AnalyzingSteps({ completedCount }: { completedCount: number }) {
  return (
    <div className="space-y-2 mt-4">
      {ANALYSIS_STEPS.map((step, index) => (
        <StepRow key={step.label} label={step.label} completed={index < completedCount} />
      ))}
    </div>
  );
}
