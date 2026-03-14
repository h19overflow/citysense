import { useEffect, useState } from "react";
import { Brain, Globe, Layers, Sparkles } from "lucide-react";
import type { GrowthProgressData } from "@/lib/types";

const STAGE_ICONS: Record<string, React.ReactNode> = {
  starting:     <Sparkles className="w-5 h-5 text-primary" />,
  strategizing: <Brain className="w-5 h-5 text-amber-500" />,
  crawling:     <Globe className="w-5 h-5 text-blue-500" />,
  aggregating:  <Layers className="w-5 h-5 text-violet-500" />,
  analyzing:    <Brain className="w-5 h-5 text-primary" />,
  persisting:   <Sparkles className="w-5 h-5 text-primary" />,
};

interface GrowthProgressProps {
  progress: GrowthProgressData | null;
}

export function GrowthProgress({ progress }: GrowthProgressProps) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 500);
    return () => clearInterval(id);
  }, []);

  const pct = progress?.progress ?? 0;
  const message = progress?.message ?? "Starting your growth analysis…";
  const stage = progress?.stage ?? "starting";
  const icon = STAGE_ICONS[stage] ?? <Sparkles className="w-5 h-5 text-primary" />;

  return (
    <div className="flex flex-col items-center justify-center h-64 space-y-5 p-6">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 animate-pulse">
        {icon}
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">
          {message}{dots}
        </p>
        <p className="text-xs text-muted-foreground">This takes about 30–60 seconds</p>
      </div>
      <div className="w-full max-w-xs">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-right mt-1">{pct}%</p>
      </div>
    </div>
  );
}
