import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen, Code, Users } from "lucide-react";
import type { RoadmapPath } from "@/lib/types";

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  course:    <BookOpen className="w-3 h-3" />,
  book:      <BookOpen className="w-3 h-3" />,
  project:   <Code className="w-3 h-3" />,
  community: <Users className="w-3 h-3" />,
};

const PATH_COLORS: Record<string, { badge: string; bar: string; highlight: string }> = {
  fill_gap:          { badge: "bg-blue-100 text-blue-700",    bar: "bg-blue-500",   highlight: "bg-blue-50 text-blue-800" },
  multidisciplinary: { badge: "bg-amber-100 text-amber-700",  bar: "bg-amber-500",  highlight: "bg-amber-50 text-amber-800" },
  pivot:             { badge: "bg-violet-100 text-violet-700", bar: "bg-violet-500", highlight: "bg-violet-50 text-violet-800" },
};

const PATH_LABELS: Record<string, string> = {
  fill_gap: "Fill the Gap",
  multidisciplinary: "Multidisciplinary",
  pivot: "Pivot",
};

interface PathCardProps {
  pathKey: "fill_gap" | "multidisciplinary" | "pivot";
  path: RoadmapPath;
  confidence: number;
  isDraft?: boolean;
}

export function PathCard({ pathKey, path, confidence, isDraft = false }: PathCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = PATH_COLORS[pathKey];

  return (
    <div
      className={`rounded-xl border bg-white overflow-hidden transition-all ${
        expanded ? "border-primary/30 shadow-md" : "border-border/50"
      }`}
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
              {PATH_LABELS[pathKey]}
            </span>
            {isDraft && (
              <span className="text-[10px] font-medium text-muted-foreground border border-border/60 px-1.5 py-0.5 rounded-full">
                Draft
              </span>
            )}
          </div>
          <div className="shrink-0 text-right">
            <span className="text-xs font-bold text-foreground">{confidence}%</span>
            <p className="text-[10px] text-muted-foreground">confidence</p>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-foreground mt-2 leading-snug">{path.title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {path.target_role} · {path.timeline_estimate}
        </p>

        <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
            style={{ width: `${confidence}%` }}
          />
        </div>

        <div className={`mt-2.5 rounded-lg px-2.5 py-2 ${colors.highlight}`}>
          <p className="text-[10px] font-semibold mb-0.5 uppercase tracking-wide opacity-60">
            Your unfair advantage
          </p>
          <p className="text-xs font-medium leading-snug">{path.unfair_advantage}</p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
          {expanded ? "Less detail" : `See ${path.skill_steps.length} skill steps`}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border/50 px-3.5 pb-3.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pt-3 mb-2.5">
            Learning Path
          </p>
          <ol className="space-y-3 relative before:absolute before:left-[10px] before:top-2 before:bottom-2 before:w-px before:bg-border/60">
            {path.skill_steps.map((step, i) => (
              <li key={i} className="flex gap-3 relative">
                <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground z-10 mt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{step.skill}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{step.why}</p>
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {RESOURCE_ICONS[step.resource_type]}
                    {step.resource}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
