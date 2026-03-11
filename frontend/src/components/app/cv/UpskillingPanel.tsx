import { useEffect } from "react";
import { Target } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { computeUpskillingSummary } from "@/lib/upskillingEngine";
import { ImpactHeader } from "./upskilling/ImpactHeader";
import { QuickWinsSection } from "./upskilling/QuickWinsSection";
import { SkillPathCard } from "./upskilling/SkillPathCard";

const UpskillingPanel = () => {
  const { state, dispatch } = useApp();

  useEffect(() => {
    if (!state.cvResult || state.jobMatches.length === 0) {
      dispatch({ type: "SET_UPSKILLING_SUMMARY", summary: null });
      return;
    }
    const summary = computeUpskillingSummary(
      state.cvResult,
      state.jobMatches,
      state.trendingSkills,
    );
    dispatch({ type: "SET_UPSKILLING_SUMMARY", summary });
  }, [state.cvResult, state.jobMatches, state.trendingSkills]);

  const summary = state.upskillingSummary;
  if (!summary) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Loading upskilling analysis...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 pb-8">
      <ImpactHeader
        currentRate={summary.currentMatchRate}
        projectedRate={summary.projectedMatchRate}
        topPathCount={Math.min(summary.topPaths.length, 3)}
      />
      {summary.quickWins.length > 0 && (
        <QuickWinsSection paths={summary.quickWins} />
      )}
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-primary" />
          Highest-Impact Skills to Learn
        </h3>
        <div className="space-y-3">
          {summary.topPaths.map((path) => (
            <SkillPathCard key={path.skillName} path={path} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default UpskillingPanel;
