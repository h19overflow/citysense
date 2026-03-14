import { useCallback, useRef } from "react";
import { useAuth } from "@clerk/react";
import { useApp } from "@/lib/appContext";
import type {
  GrowthIntakeForm,
  GrowthAnalysis,
  GrowthProgressData,
} from "@/lib/types";

export function useGrowthPlan() {
  const { getToken } = useAuth();
  const { state, dispatch } = useApp();
  const sseRef = useRef<EventSource | null>(null);

  const buildAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getToken();
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }, [getToken]);

  const fetchLatestAnalysis = useCallback(async (bearerToken: string) => {
    const res = await fetch("/api/growth/roadmap/latest", {
      headers: { Authorization: bearerToken },
    });
    if (!res.ok) return;
    const data = await res.json() as { roadmap?: GrowthAnalysis };
    if (data.roadmap) {
      dispatch({ type: "SET_GROWTH_ANALYSIS", analysis: data.roadmap });
      dispatch({ type: "SET_GROWTH_STAGE", stage: "preliminary" });
    }
  }, [dispatch]);

  const openProgressStream = useCallback((intakeId: string, bearerToken: string) => {
    sseRef.current?.close();
    const source = new EventSource(`/api/growth/intake/${intakeId}/status`);
    sseRef.current = source;

    source.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data) as GrowthProgressData & { analysis_id?: string };
      dispatch({
        type: "SET_GROWTH_PROGRESS",
        progress: { stage: data.stage, message: data.message, progress: data.progress },
      });
      if (data.stage === "done" && data.analysis_id) {
        source.close();
        void fetchLatestAnalysis(bearerToken);
      }
    };

    source.onerror = () => {
      source.close();
      dispatch({ type: "SET_GROWTH_STAGE", stage: "idle" });
    };
  }, [dispatch, fetchLatestAnalysis]);

  const loadLatestRoadmap = useCallback(async () => {
    const headers = await buildAuthHeaders();
    const res = await fetch("/api/growth/roadmap/latest", { headers });
    if (!res.ok) return;
    const data = await res.json() as { has_roadmap?: boolean; roadmap?: GrowthAnalysis };
    if (data.has_roadmap && data.roadmap) {
      dispatch({ type: "SET_GROWTH_ANALYSIS", analysis: data.roadmap });
      dispatch({ type: "SET_GROWTH_STAGE", stage: "returning" });
    }
  }, [buildAuthHeaders, dispatch]);

  const submitIntake = useCallback(async (form: GrowthIntakeForm) => {
    dispatch({ type: "SET_GROWTH_STAGE", stage: "submitting" });
    const headers = await buildAuthHeaders();

    const res = await fetch("/api/growth/intake", {
      method: "POST",
      headers,
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      dispatch({ type: "SET_GROWTH_STAGE", stage: "idle" });
      return;
    }

    const body = await res.json() as { intake_id: string };
    dispatch({ type: "SET_GROWTH_INTAKE_ID", intakeId: body.intake_id });
    dispatch({ type: "SET_GROWTH_STAGE", stage: "crawling" });
    openProgressStream(body.intake_id, headers["Authorization"]);
  }, [buildAuthHeaders, dispatch, openProgressStream]);

  const submitGapAnswers = useCallback(async (answers: Record<string, string>) => {
    if (!state.growthAnalysis) return;
    // "answering" shows GapQuestionCards with isSubmitting=true (button loading state)
    dispatch({ type: "SET_GROWTH_STAGE", stage: "answering" });
    const headers = await buildAuthHeaders();

    const res = await fetch("/api/growth/roadmap/answers", {
      method: "POST",
      headers,
      body: JSON.stringify({
        preliminary_analysis_id: state.growthAnalysis.id,
        gap_answers: answers,
      }),
    });

    if (!res.ok) {
      dispatch({ type: "SET_GROWTH_STAGE", stage: "preliminary" });
      return;
    }

    // Switch to progress screen while analysis runs on the server response
    dispatch({ type: "SET_GROWTH_STAGE", stage: "finalizing" });
    const data = await res.json() as { analysis: GrowthAnalysis };
    dispatch({ type: "SET_GROWTH_ANALYSIS", analysis: data.analysis });
    dispatch({ type: "SET_GROWTH_STAGE", stage: "final" });
  }, [state.growthAnalysis, buildAuthHeaders, dispatch]);

  return {
    growthStage: state.growthStage,
    growthAnalysis: state.growthAnalysis,
    growthProgress: state.growthProgress,
    growthDiffVisible: state.growthDiffVisible,
    loadLatestRoadmap,
    submitIntake,
    submitGapAnswers,
    toggleDiff: () => dispatch({ type: "TOGGLE_GROWTH_DIFF" }),
    resetGrowth: () => dispatch({ type: "CLEAR_GROWTH" }),
  };
}
