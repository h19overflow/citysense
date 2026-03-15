import { useEffect } from "react";
import { useApp } from "@/lib/appContext";
import { useGrowthPlan } from "./hooks/useGrowthPlan";
import { GrowthIntakeForm } from "./GrowthIntakeForm";
import { GrowthProgress } from "./GrowthProgress";
import { FinalRoadmap } from "./FinalRoadmap";
import { GapQuestionCards } from "./GapQuestionCards";
import { ActiveRoadmapView } from "./ActiveRoadmapView";

function NoCvPrompt() {
  return (
    <div className="flex flex-col items-center justify-center h-48 space-y-2 p-6 text-center">
      <p className="text-sm font-medium text-foreground">Upload your CV first</p>
      <p className="text-xs text-muted-foreground">
        Your growth plan is built on top of your CV analysis.
      </p>
    </div>
  );
}

interface GrowthPlanViewProps {
  onDiscuss?: (context: string) => void;
}

export function GrowthPlanView({ onDiscuss }: GrowthPlanViewProps) {
  const { state, dispatch } = useApp();
  const {
    growthStage,
    growthAnalysis,
    growthProgress,
    growthDiffVisible,
    loadLatestRoadmap,
    submitIntake,
    submitGapAnswers,
    toggleDiff,
  } = useGrowthPlan();

  useEffect(() => {
    if (growthStage === "idle") {
      void loadLatestRoadmap();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state.cvResult) {
    return <NoCvPrompt />;
  }

  if (growthStage === "idle" || growthStage === "submitting") {
    return (
      <GrowthIntakeForm
        onSubmit={submitIntake}
        isSubmitting={growthStage === "submitting"}
      />
    );
  }

  if (growthStage === "crawling" || growthStage === "finalizing") {
    return <GrowthProgress progress={growthProgress} />;
  }

  if (state.activeRoadmapPath && state.activeRoadmapPathKey && growthAnalysis) {
    return (
      <ActiveRoadmapView
        path={state.activeRoadmapPath}
        pathKey={state.activeRoadmapPathKey}
        onDiscuss={(ctx) => onDiscuss?.(ctx)}
        onBack={() => dispatch({ type: "CLEAR_ACTIVE_ROADMAP_PATH" })}
      />
    );
  }

  if (growthAnalysis) {
    const hasGapQuestions =
      growthAnalysis.stage === "preliminary" &&
      (growthAnalysis.gap_questions?.length ?? 0) > 0;

    return (
      <div>
        <FinalRoadmap
          analysis={growthAnalysis}
          diffVisible={growthDiffVisible}
          onToggleDiff={toggleDiff}
        />
        {hasGapQuestions && growthStage !== "final" && (
          <GapQuestionCards
            questions={growthAnalysis.gap_questions}
            onSubmit={submitGapAnswers}
            isSubmitting={growthStage === "answering"}
          />
        )}
      </div>
    );
  }

  return null;
}
