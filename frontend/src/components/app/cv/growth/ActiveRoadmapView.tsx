import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { RoadmapPath, PathKey } from "@/lib/types";
import { LearningBlockCard } from "./LearningBlockCard";

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

const PATH_ACCENT: Record<string, string> = {
  fill_gap: "blue",
  multidisciplinary: "amber",
  pivot: "violet",
};

interface ActiveRoadmapViewProps {
  path: RoadmapPath;
  pathKey: PathKey;
  onBack: () => void;
}

export function ActiveRoadmapView({ path, pathKey, onBack }: ActiveRoadmapViewProps) {
  const colors = PATH_COLORS[pathKey];
  const accentColor = PATH_ACCENT[pathKey] ?? "blue";
  const blocks = path.learning_blocks ?? [];
  const blockCount = blocks.length > 0 ? blocks.length : path.skill_steps.length;

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
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-bold text-foreground">{path.title}</h2>
      </motion.div>

      {/* Info row */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>{path.target_role}</span>
        <span>{path.timeline_estimate}</span>
      </motion.div>

      {/* Unfair advantage */}
      <motion.div variants={fadeUp} className={`rounded-xl px-3.5 py-3 ${colors.highlight}`}>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-0.5">
          Your unfair advantage
        </p>
        <p className="text-sm font-medium leading-snug">{path.unfair_advantage}</p>
      </motion.div>

      {/* Learning blocks */}
      <motion.div variants={fadeUp}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Learning Path — {blockCount} steps
        </p>
        <ol className="space-y-5 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border/60">
          {blocks.length > 0
            ? blocks.map((block, i) => (
                <LearningBlockCard
                  key={i}
                  block={block}
                  index={i}
                  accentColor={accentColor}
                  isExpanded={i === 0}
                />
              ))
            : path.skill_steps.map((step, i) => (
                <li key={i} className="flex gap-3 relative">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold z-10">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 pb-2">
                    <p className="text-base font-semibold text-foreground">{step.skill}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{step.why}</p>
                  </div>
                </li>
              ))}
        </ol>
      </motion.div>
    </motion.div>
  );
}
