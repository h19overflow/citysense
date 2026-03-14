import { GitCompareArrows } from "lucide-react";
import type { GrowthAnalysis, RoadmapPath } from "@/lib/types";
import { PathCard } from "./PathCard";

type PathKey = "fill_gap" | "multidisciplinary" | "pivot";

const PATH_KEYS: PathKey[] = ["fill_gap", "multidisciplinary", "pivot"];

function getPath(analysis: GrowthAnalysis, key: PathKey): RoadmapPath | undefined {
  if (key === "fill_gap") return analysis.path_fill_gap;
  if (key === "multidisciplinary") return analysis.path_multidisciplinary;
  return analysis.path_pivot;
}

interface FinalRoadmapProps {
  analysis: GrowthAnalysis;
  diffVisible: boolean;
  onToggleDiff: () => void;
}

export function FinalRoadmap({ analysis, diffVisible, onToggleDiff }: FinalRoadmapProps) {
  const isDraft = analysis.stage === "preliminary";
  const hasDiff = !!analysis.diff_summary;
  const formattedDate = new Date(analysis.created_at).toLocaleDateString();

  return (
    <div className="space-y-3 p-4 pb-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {isDraft ? "Draft Growth Plan" : "Your Growth Plan"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Version {analysis.version_number} · {formattedDate}
          </p>
        </div>
        {hasDiff && (
          <button
            type="button"
            onClick={onToggleDiff}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors border border-border/60 rounded-full px-2.5 py-1 shrink-0"
          >
            <GitCompareArrows className="w-3.5 h-3.5" />
            {diffVisible ? "Hide diff" : "Compare versions"}
          </button>
        )}
      </div>

      {diffVisible && analysis.diff_summary && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 space-y-1.5">
          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
            What changed
          </p>
          <p className="text-xs text-amber-900 leading-relaxed">{analysis.diff_summary}</p>
        </div>
      )}

      <div className="space-y-3">
        {PATH_KEYS.map((key) => {
          const path = getPath(analysis, key);
          if (!path) return null;
          const confidence = analysis.confidence_scores?.[key] ?? 0;
          return (
            <PathCard
              key={key}
              pathKey={key}
              path={path}
              confidence={confidence}
              isDraft={isDraft}
            />
          );
        })}
      </div>

      {isDraft && (analysis.gap_questions?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mt-1">
          <p className="text-xs text-primary font-medium">
            ↓ Answer {analysis.gap_questions.length} quick question
            {analysis.gap_questions.length !== 1 ? "s" : ""} below to finalize your plan
          </p>
        </div>
      )}
    </div>
  );
}
