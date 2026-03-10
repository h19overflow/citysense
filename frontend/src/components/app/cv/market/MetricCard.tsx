interface MetricCardProps {
  icon: React.ReactNode;
  iconBackground: string;
  label: string;
  value: string;
  detail: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function MetricCard({ icon, iconBackground, label, value, detail, onClick, isActive }: MetricCardProps) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`rounded-xl border bg-white p-3 flex items-start gap-3 text-left transition-all ${
        isActive
          ? "border-primary/40 ring-2 ring-primary/10 shadow-sm"
          : "border-border/50"
      } ${onClick ? "cursor-pointer hover:shadow-sm hover:border-primary/20" : ""}`}
    >
      <div className={`mt-0.5 rounded-lg p-1.5 shrink-0 ${iconBackground}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground truncate">{detail}</p>
      </div>
    </Wrapper>
  );
}
