import { ArrowLeft, MessageSquare, BookOpen, Code, Users } from "lucide-react";
import type { RoadmapPath, PathKey, SkillStep } from "@/lib/types";

const PATH_COLORS: Record<string, { badge: string; highlight: string }> = {
  fill_gap:          { badge: "bg-blue-100 text-blue-700",    highlight: "bg-blue-50 text-blue-800" },
  multidisciplinary: { badge: "bg-amber-100 text-amber-700",  highlight: "bg-amber-50 text-amber-800" },
  pivot:             { badge: "bg-violet-100 text-violet-700", highlight: "bg-violet-50 text-violet-800" },
};

const PATH_LABELS: Record<string, string> = {
  fill_gap: "Fill the Gap",
  multidisciplinary: "Multidisciplinary",
  pivot: "Pivot",
};

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  course:    <BookOpen className="w-3 h-3" />,
  book:      <BookOpen className="w-3 h-3" />,
  project:   <Code className="w-3 h-3" />,
  community: <Users className="w-3 h-3" />,
};

interface ActiveRoadmapViewProps {
  path: RoadmapPath;
  pathKey: PathKey;
  onDiscuss: (context: string) => void;
  onBack: () => void;
}

function DiscussButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
      title="Discuss with AI"
    >
      <MessageSquare className="w-3.5 h-3.5" />
    </button>
  );
}

function SkillStepItem({ step, index, onDiscuss }: {
  step: SkillStep;
  index: number;
  onDiscuss: (context: string) => void;
}) {
  return (
    <li className="flex gap-3 relative">
      <span className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground z-10 mt-0.5">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-foreground">{step.skill}</p>
          <DiscussButton onClick={() => onDiscuss(`step ${index + 1}: ${step.skill} — ${step.why}`)} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.why}</p>
        <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {RESOURCE_ICONS[step.resource_type]}
          {step.resource}
          <span className="ml-1 opacity-60">({step.resource_type})</span>
        </span>
      </div>
    </li>
  );
}

export function ActiveRoadmapView({ path, pathKey, onDiscuss, onBack }: ActiveRoadmapViewProps) {
  const colors = PATH_COLORS[pathKey];

  return (
    <div className="space-y-4 p-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to all paths
        </button>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
          {PATH_LABELS[pathKey]}
        </span>
      </div>

      {/* Title */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-foreground">{path.title}</h2>
        <DiscussButton onClick={() => onDiscuss(`title: ${path.title}`)} />
      </div>

      {/* Info row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {path.target_role}
          <DiscussButton onClick={() => onDiscuss(`target_role: ${path.target_role}`)} />
        </span>
        <span className="flex items-center gap-1">
          {path.timeline_estimate}
          <DiscussButton onClick={() => onDiscuss(`timeline_estimate: ${path.timeline_estimate}`)} />
        </span>
      </div>

      {/* Unfair advantage */}
      <div className={`rounded-xl px-3.5 py-3 ${colors.highlight}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60 mb-0.5">
              Your unfair advantage
            </p>
            <p className="text-xs font-medium leading-snug">{path.unfair_advantage}</p>
          </div>
          <DiscussButton onClick={() => onDiscuss(`unfair_advantage: ${path.unfair_advantage}`)} />
        </div>
      </div>

      {/* Skill steps */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Learning Path — {path.skill_steps.length} steps
        </p>
        <ol className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-border/60">
          {path.skill_steps.map((step, i) => (
            <SkillStepItem key={i} step={step} index={i} onDiscuss={onDiscuss} />
          ))}
        </ol>
      </div>
    </div>
  );
}
