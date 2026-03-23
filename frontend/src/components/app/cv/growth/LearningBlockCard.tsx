import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Hammer,
  Trophy,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Ban,
} from "lucide-react";
import type { LearningBlock, Phase, PhaseTask } from "@/lib/types/growth";

const PHASE_ICONS: Record<string, React.ReactNode> = {
  Understand: <BookOpen className="w-4 h-4" />,
  Build: <Hammer className="w-4 h-4" />,
  Prove: <Trophy className="w-4 h-4" />,
};

const ACCENT_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  blue:   { bg: "bg-blue-600",   border: "border-blue-200", text: "text-blue-700" },
  amber:  { bg: "bg-amber-600",  border: "border-amber-200", text: "text-amber-700" },
  violet: { bg: "bg-violet-600", border: "border-violet-200", text: "text-violet-700" },
};

interface LearningBlockCardProps {
  block: LearningBlock;
  index: number;
  accentColor: string;
  isExpanded?: boolean;
  onExpand?: (index: number) => void;
  isExpanding?: boolean;
}

function TaskItem({ task }: { task: PhaseTask }) {
  return (
    <li className="flex gap-2 items-start py-1">
      {task.is_completed ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase mr-1.5">
          {task.action}:
        </span>
        <span className="text-sm text-foreground">{task.instruction}</span>
      </div>
    </li>
  );
}

function PhaseSection({ phase }: { phase: Phase }) {
  const [open, setOpen] = useState(false);
  const completedCount = phase.tasks.filter((t) => t.is_completed).length;

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
      >
        <span className="shrink-0">{PHASE_ICONS[phase.name] ?? <BookOpen className="w-4 h-4" />}</span>
        <span className="text-sm font-semibold text-foreground flex-1">{phase.name}</span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {phase.time_estimate}
        </span>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{phase.tasks.length}
        </span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              <ul className="space-y-0.5">
                {phase.tasks.map((task, i) => (
                  <TaskItem key={i} task={task} />
                ))}
              </ul>

              <div className="flex items-start gap-2 mt-2 px-2 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  <span className="font-semibold">Stop when:</span> {phase.stop_signal}
                </p>
              </div>

              {phase.anti_patterns.length > 0 && (
                <div className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-orange-50 dark:bg-orange-950/30">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-orange-700 dark:text-orange-400">
                    <span className="font-semibold">Avoid:</span>
                    <ul className="mt-0.5 space-y-0.5">
                      {phase.anti_patterns.map((ap, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <Ban className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
                          {ap}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LearningBlockCard({ block, index, accentColor, isExpanded = false, onExpand, isExpanding = false }: LearningBlockCardProps) {
  const [expanded, setExpanded] = useState(isExpanded);
  const accent = ACCENT_STYLES[accentColor] ?? ACCENT_STYLES.blue;
  const hasPhases = block.phases.length > 0;

  return (
    <motion.li
      className="flex gap-3 relative"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
    >
      <span className={`shrink-0 w-8 h-8 rounded-full ${accent.bg} flex items-center justify-center text-sm font-bold text-white z-10`}>
        {index + 1}
      </span>

      <div className="min-w-0 flex-1 pb-2">
        <button
          type="button"
          onClick={() => hasPhases && setExpanded(!expanded)}
          className="w-full text-left"
          disabled={!hasPhases}
        >
          <p className="text-base font-semibold text-foreground">{block.skill_name}</p>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{block.why_this_matters}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {block.total_time}
            </span>
            {hasPhases && (
              <span className="flex items-center gap-1">
                {block.phases.length} phases
                {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </span>
            )}
            {!hasPhases && onExpand && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onExpand(index); }}
                disabled={isExpanding}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
              >
                {isExpanding ? "Generating..." : "Generate detailed plan →"}
              </button>
            )}
            {!hasPhases && !onExpand && (
              <span className="italic text-muted-foreground/60">Details available when you start this step</span>
            )}
          </div>
        </button>

        <AnimatePresence>
          {expanded && hasPhases && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2">
                {block.phases.map((phase, i) => (
                  <PhaseSection key={i} phase={phase} />
                ))}

                {block.not_yet.length > 0 && (
                  <div className={`mt-2 pl-3 border-l-2 ${accent.border}`}>
                    <p className={`text-xs font-semibold ${accent.text}`}>Don't learn yet</p>
                    <ul className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                      {block.not_yet.map((item, i) => (
                        <li key={i}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}
