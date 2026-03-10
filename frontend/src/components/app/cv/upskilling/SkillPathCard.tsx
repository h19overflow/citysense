import { TrendingUp, Clock, BookOpen, ArrowUpRight, GraduationCap } from "lucide-react";
import type { UpskillPath } from "@/lib/types";
import { CATEGORY_COLORS, formatDuration } from "./upskillingHelpers";

function FormatBadge({ label }: { label: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted/50 text-muted-foreground capitalize">
      {label}
    </span>
  );
}

function CostBadge({ cost }: { cost: string }) {
  const colors: Record<string, string> = {
    free: "text-pine-green bg-pine-green/10",
    low: "text-amber-700 bg-amber-100",
    moderate: "text-orange-700 bg-orange-100",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${colors[cost] ?? ""}`}>
      {cost}
    </span>
  );
}

interface SkillPathCardProps {
  path: UpskillPath;
}

export function SkillPathCard({ path }: SkillPathCardProps) {
  const color = CATEGORY_COLORS[path.category] ?? "bg-primary";

  return (
    <div className="rounded-xl border border-border/50 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${color}`} />
          <h4 className="text-sm font-bold text-foreground">{path.skillName}</h4>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {path.demandPercent > 0 && (
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {path.demandPercent}% demand
            </span>
          )}
          <span className="flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-pine-green" />
            +{path.jobsUnlocked} jobs
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Est. {formatDuration(path.estimatedWeeks)}</span>
      </div>

      {path.trainingOptions.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <GraduationCap className="w-3 h-3" />
            Where to learn
          </p>
          <div className="space-y-1.5">
            {path.trainingOptions.map((option) => (
              <div
                key={option.name}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30"
              >
                <div>
                  <p className="text-xs font-medium text-foreground">{option.name}</p>
                  <p className="text-[10px] text-muted-foreground">{option.provider}</p>
                </div>
                <div className="flex items-center gap-2">
                  <FormatBadge label={option.format} />
                  <CostBadge cost={option.cost} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
          <BookOpen className="w-3 h-3 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Search for local training programs in Montgomery
          </p>
        </div>
      )}
    </div>
  );
}
