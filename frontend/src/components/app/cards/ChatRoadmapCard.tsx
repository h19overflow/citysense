import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Map } from "lucide-react";
import { useApp } from "@/lib/appContext";
import type { ChatMessage, PersonalizedRoadmap } from "@/lib/types";
import { API_BASE } from "@/lib/apiConfig";

interface ChatRoadmapCardProps {
  message: ChatMessage;
}

export default function ChatRoadmapCard({ message }: ChatRoadmapCardProps) {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!message.serviceId || !message.serviceTitle) {
    return null;
  }

  async function handleGenerateRoadmap() {
    setIsGenerating(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { serviceId: message.serviceId };
      if (state.citizenMeta) {
        body.citizen = state.citizenMeta;
      }

      const response = await fetch(`${API_BASE}/api/roadmap/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.detail ?? "Failed to generate roadmap");
      }

      const roadmap = (await response.json()) as PersonalizedRoadmap;
      dispatch({ type: "SET_CHAT_BUBBLE_OPEN", open: false });
      navigate("/app/services", { replace: true });
      dispatch({ type: "SET_ACTIVE_ROADMAP", roadmap });
    } catch (err) {
      console.error("[ChatRoadmapCard] Failed to generate roadmap", err);
      setError("Failed to generate roadmap. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="border-b border-border bg-primary/5 px-4 py-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Map className="h-4 w-4 text-primary" />
          {message.serviceTitle} Roadmap
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">
          {state.citizenMeta
            ? "Generate a personalized step-by-step guide based on your current profile."
            : "Generate a general step-by-step guide for this service."}
        </p>
      </div>

      <div className="bg-muted/30 p-3">
        {error && <p className="mb-3 px-1 text-xs text-red-500">{error}</p>}

        <button
          onClick={handleGenerateRoadmap}
          disabled={isGenerating}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Building Roadmap...
            </>
          ) : (
            <>
              Generate My Roadmap
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
