interface MetricBoxProps {
  label: string;
  value: string;
  sublabel: string;
  highlight?: boolean;
}

function MetricBox({ label, value, sublabel, highlight }: MetricBoxProps) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? "text-pine-green" : "text-foreground"}`}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{sublabel}</p>
    </div>
  );
}

interface ImpactHeaderProps {
  currentRate: number;
  projectedRate: number;
  topPathCount: number;
}

export function ImpactHeader({ currentRate, projectedRate, topPathCount }: ImpactHeaderProps) {
  const improvement = projectedRate - currentRate;

  return (
    <div className="rounded-xl border border-border/50 bg-gradient-to-r from-primary/5 to-secondary/5 p-4">
      <h2 className="text-base font-bold text-foreground mb-1">Your Upskilling Path</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Learning {topPathCount} key skills could significantly improve your job market position
      </p>
      <div className="grid grid-cols-3 gap-3">
        <MetricBox
          label="Current Match Rate"
          value={`${currentRate}%`}
          sublabel="of jobs match 40%+"
        />
        <MetricBox
          label="Projected Rate"
          value={`${projectedRate}%`}
          sublabel={`after top ${topPathCount} skills`}
          highlight
        />
        <MetricBox
          label="Improvement"
          value={`+${improvement}%`}
          sublabel="more job matches"
          highlight={improvement > 0}
        />
      </div>
    </div>
  );
}
