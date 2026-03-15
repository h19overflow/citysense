import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare } from "lucide-react";
import type { RoadmapPath, PathKey } from "@/lib/types";
import { SkillStepCard } from "./SkillStepCard";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const PATH_COLORS: Record<string, { badge: string; highlight: string; accent: string }> = {
  fill_gap:          { badge: "bg-blue-100 text-blue-700",    highlight: "bg-blue-50 text-blue-800",    accent: "blue" },
  multidisciplinary: { badge: "bg-amber-100 text-amber-700",  highlight: "bg-amber-50 text-amber-800",  accent: "amber" },
  pivot:             { badge: "bg-violet-100 text-violet-700", highlight: "bg-violet-50 text-violet-800", accent: "violet" },
};

const PATH_LABELS: Record<string, string> = {
  fill_gap: "Fill the Gap",
  multidisciplinary: "Multidisciplinary",
  pivot: "Pivot",
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

export function ActiveRoadmapView({ path, pathKey, onDiscuss, onBack }: ActiveRoadmapViewProps) {
  const colors = PATH_COLORS[pathKey];

  return (
    <motion.div className="space-y-4 p-4" variants={stagger} initial="hidden" animate="visible">
      {/* Top bar */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to all paths
        </button>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
          {PATH_LABELS[pathKey]}
        </span>
      </motion.div>

      {/* Title */}
      <motion.div variants={fadeUp} className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-foreground">{path.title}</h2>
        <DiscussButton onClick={() => onDiscuss(`title: ${path.title}`)} />
      </motion.div>

      {/* Info row */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          {path.target_role}
          <DiscussButton onClick={() => onDiscuss(`target_role: ${path.target_role}`)} />
        </span>
        <span className="flex items-center gap-1">
          {path.timeline_estimate}
          <DiscussButton onClick={() => onDiscuss(`timeline_estimate: ${path.timeline_estimate}`)} />
        </span>
      </motion.div>

      {/* Unfair advantage */}
      <motion.div variants={fadeUp} className={`rounded-xl px-3.5 py-3 ${colors.highlight}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-0.5">
              Your unfair advantage
            </p>
            <p className="text-sm font-medium leading-snug">{path.unfair_advantage}</p>
          </div>
          <DiscussButton onClick={() => onDiscuss(`unfair_advantage: ${path.unfair_advantage}`)} />
        </div>
      </motion.div>

      {/* Skill steps */}
      <motion.div variants={fadeUp}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Learning Path — {path.skill_steps.length} steps
        </p>
        <ol className="space-y-5 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border/60">
          {path.skill_steps.map((step, i) => (
            <SkillStepCard
              key={i}
              step={step}
              index={i}
              accentColor={colors.accent}
              onDiscuss={onDiscuss}
            />
          ))}
        </ol>
      </motion.div>
    </motion.div>
  );
}
