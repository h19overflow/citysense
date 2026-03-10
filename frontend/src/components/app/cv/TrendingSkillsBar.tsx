import { TrendingUp } from "lucide-react";
import type { TrendingSkill } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  technical: "bg-blue-500",
  healthcare: "bg-red-500",
  soft_skills: "bg-emerald-500",
  physical: "bg-amber-500",
  education: "bg-purple-500",
  experience: "bg-slate-500",
  clearance: "bg-orange-500",
};

interface TrendingSkillsBarProps {
  skills: TrendingSkill[];
  activeSkill?: string;
  onFilterBySkill?: (skill: string) => void;
}

const TrendingSkillsBar = ({ skills, activeSkill, onFilterBySkill }: TrendingSkillsBarProps) => {
  const top10 = skills.slice(0, 10);

  if (top10.length === 0) return null;

  const maxCount = top10[0]?.count ?? 1;

  return (
    <div className="rounded-xl border border-border/50 bg-white px-5 py-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-secondary" />
        Trending Skills in Montgomery
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Most in-demand skills — <span className="text-primary font-medium">click to filter jobs</span>
      </p>
      <div className="space-y-1">
        {top10.map((skill) => {
          const isActive = activeSkill === skill.rawKey;
          return (
            <button
              key={skill.name}
              onClick={() => onFilterBySkill?.(isActive ? "" : skill.rawKey)}
              className={`flex items-center gap-2 w-full rounded-md px-1 -mx-1 py-0.5 transition-colors ${
                isActive ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/30"
              } ${onFilterBySkill ? "cursor-pointer" : "cursor-default"}`}
            >
              <span className={`text-xs w-28 shrink-0 truncate text-left ${isActive ? "font-bold text-foreground" : "text-foreground font-medium"}`}>
                {skill.name}
              </span>
              <div className="flex-1 h-5 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isActive ? "bg-primary" : (CATEGORY_COLORS[skill.category] ?? "bg-primary")
                  }`}
                  style={{ width: `${Math.max((skill.count / maxCount) * 100, 8)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground w-10 text-right font-tabular">
                {skill.percent}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TrendingSkillsBar;
