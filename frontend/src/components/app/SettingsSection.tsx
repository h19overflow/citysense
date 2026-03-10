import { ChevronRight } from "lucide-react";

export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
        {title}
      </h3>
      <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/30 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

export function SettingsRow({
  icon: Icon,
  label,
  value,
  chevron,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  chevron?: boolean;
  last?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-default">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {value && <span className="text-sm text-muted-foreground">{value}</span>}
        {chevron && <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
      </div>
    </div>
  );
}
