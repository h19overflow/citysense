import { useState } from "react";
import { Loader2, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { ANALYSIS_API_BASE } from "@/lib/apiConfig";

type AnalysisState = "idle" | "running" | "success" | "error";

interface AnalyzeButtonProps {
  onComplete?: () => void;
}

async function triggerAnalysisRun(): Promise<void> {
  const response = await fetch(`${ANALYSIS_API_BASE}/api/analysis/run`, { method: "POST" });
  if (!response.ok) throw new Error(`Failed to start analysis: ${response.status}`);
}

async function fetchAnalysisStatus(): Promise<{ state: string; message: string }> {
  const response = await fetch(`${ANALYSIS_API_BASE}/api/analysis/status`);
  if (!response.ok) throw new Error(`Failed to fetch status: ${response.status}`);
  return response.json();
}

function pollUntilComplete(
  onStatusMessage: (message: string) => void,
  onFinish: (finalState: "success" | "error") => void,
): void {
  const intervalId = setInterval(async () => {
    try {
      const { state, message } = await fetchAnalysisStatus();
      onStatusMessage(message);
      if (state !== "running") {
        clearInterval(intervalId);
        onFinish(state === "complete" ? "success" : "error");
      }
    } catch {
      clearInterval(intervalId);
      onFinish("error");
    }
  }, 2000);
}

export function AnalyzeButton({ onComplete }: AnalyzeButtonProps) {
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");

  async function handleRunAnalysis(): Promise<void> {
    setAnalysisState("running");
    setStatusMessage("Starting…");
    try {
      await triggerAnalysisRun();
      pollUntilComplete(setStatusMessage, (finalState) => {
        setAnalysisState(finalState);
        if (finalState === "success") onComplete?.();
      });
    } catch (error) {
      console.error("[AnalyzeButton] Failed to start analysis:", error);
      setAnalysisState("error");
      setStatusMessage("Could not start analysis.");
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleRunAnalysis}
        disabled={analysisState === "running"}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[hsl(var(--amber-gold))] text-white text-sm font-semibold hover:bg-[hsl(var(--amber-gold))]/90 transition-colors min-h-[44px] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {analysisState === "running" ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="w-4 h-4" aria-hidden="true" />
        )}
        {analysisState === "running" ? "Analyzing articles & comments…" : "Run Analysis"}
      </button>
      {analysisState === "success" && (
        <span className="flex items-center gap-1.5 text-sm text-emerald-600">
          <CheckCircle className="w-4 h-4" aria-hidden="true" />
          Done
        </span>
      )}
      {analysisState === "error" && (
        <span className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
          {statusMessage || "Failed"}
        </span>
      )}
      {analysisState === "running" && statusMessage && (
        <span className="text-xs text-muted-foreground">{statusMessage}</span>
      )}
    </div>
  );
}
