interface CareerProgressBubbleProps {
  stage: string;
  progress: number;
}

export function CareerProgressBubble({ stage, progress }: CareerProgressBubbleProps) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="animate-pulse text-[hsl(var(--pine-green))]">●</span>
        <span>{stage}</span>
      </div>
      <div className="h-1 w-full rounded-full bg-muted">
        <div
          className="h-1 rounded-full bg-[hsl(var(--pine-green))] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
