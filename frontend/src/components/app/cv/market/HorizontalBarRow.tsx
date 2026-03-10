interface HorizontalBarRowProps {
  name: string;
  count: number;
  maxCount: number;
  barColor: string;
  activeColor?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function HorizontalBarRow({ name, count, maxCount, barColor, activeColor, isActive, onClick }: HorizontalBarRowProps) {
  const widthPercent = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  const bar = isActive ? (activeColor ?? "bg-primary") : barColor;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full text-left rounded-md px-1 -mx-1 py-0.5 transition-colors ${
        isActive ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/30"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <span className={`text-xs w-28 shrink-0 truncate ${isActive ? "font-bold text-foreground" : "text-muted-foreground font-medium"}`}>
        {name}
      </span>
      <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-colors ${bar}`} style={{ width: `${widthPercent}%` }} />
      </div>
      <span className="text-xs font-medium text-foreground w-4 text-right shrink-0">{count}</span>
    </button>
  );
}
