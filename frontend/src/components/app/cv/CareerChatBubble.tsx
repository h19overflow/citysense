import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { CareerProgressBubble } from "./CareerProgressBubble";
import { PanelHeader, GrowthBanner, IdleState, TypingIndicator, ChatBubbleMessage } from "./CareerChatParts";
import { useCareerAgent, type CareerAgentResult, type GrowthChatContext } from "@/lib/hooks/useCareerAgent";
import { useApp } from "@/lib/appContext";
import type { RoadmapPath } from "@/lib/types";

interface CareerChatBubbleProps {
  cvVersionId?: string;
  citizenId?: string;
  activeTab?: "market" | "growth";
  discussContext?: string;
  onResult?: (result: CareerAgentResult) => void;
}

export function CareerChatBubble({ cvVersionId, citizenId, activeTab, discussContext, onResult }: CareerChatBubbleProps) {
  const [visible, setVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { state, dispatch } = useApp();
  const { status, stage, progress, result, error, jobId, messages, startAnalysis, sendMessage } = useCareerAgent();
  const contextId = jobId ?? "";
  const bottomRef = useRef<HTMLDivElement>(null);

  const isGrowthMode = activeTab === "growth" && !!state.activeRoadmapPath;

  const buildGrowthContext = (): GrowthChatContext | undefined => {
    if (!isGrowthMode) return undefined;
    return {
      growth_mode: true,
      active_roadmap_analysis_id: state.activeRoadmapAnalysisId!,
      active_roadmap_path_key: state.activeRoadmapPathKey!,
      discuss_context: discussContext,
    };
  };

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (cvVersionId && citizenId) startAnalysis(cvVersionId, citizenId);
  }, [cvVersionId, citizenId, startAnalysis]);

  useEffect(() => {
    if (result && onResult) onResult(result);
  }, [result, onResult]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    if (discussContext && citizenId && !isSending) {
      handleSendMessage(`Help me with: ${discussContext}`);
    }
  }, [discussContext]);

  const isBlocked = status === "running" || isSending || !citizenId;

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isBlocked) return;
    setInputValue("");
    setIsSending(true);
    const res = await sendMessage(text.trim(), contextId, citizenId!, buildGrowthContext());
    if (res?.updated_path && state.activeRoadmapAnalysisId && state.activeRoadmapPathKey) {
      dispatch({
        type: "SET_ACTIVE_ROADMAP_PATH",
        path: res.updated_path as unknown as RoadmapPath,
        analysisId: state.activeRoadmapAnalysisId,
        pathKey: state.activeRoadmapPathKey,
      });
    }
    setIsSending(false);
  };

  return (
    <div
      className={`fixed top-0 right-0 z-50 w-[480px] h-full bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
        visible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <PanelHeader status={status} isGrowthMode={activeTab === "growth"} />
      {activeTab === "growth" && (
        <GrowthBanner pathKey={state.activeRoadmapPathKey} pathTitle={state.activeRoadmapPath?.title} />
      )}

      <div className="flex-1 overflow-y-auto min-h-0 py-3 flex flex-col gap-3 px-4">
        {status === "idle" && messages.length === 0 && <IdleState />}
        {status === "running" && <CareerProgressBubble stage={stage} progress={progress} />}
        {status === "failed" && (
          <div className="text-sm text-destructive py-2">{error ?? "Analysis failed."}</div>
        )}

        {messages.map((msg, i) => (
          <ChatBubbleMessage key={i} role={msg.role} content={msg.content} />
        ))}

        {isSending && <TypingIndicator />}

        {status === "completed" && result && !isSending && (
          <div className="flex flex-wrap gap-2 pt-1">
            {result.chips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSendMessage(chip)}
                className="px-3.5 py-2 rounded-full border border-border/50 bg-background text-sm text-foreground hover:bg-muted transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 p-3 border-t border-border/30 shrink-0">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputValue)}
          placeholder={status === "running" ? "Analyzing your profile..." : isGrowthMode ? "What would you like to improve on your path?" : "Ask your career guide..."}
          disabled={isBlocked}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-border/50 bg-background focus:outline-none min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={() => handleSendMessage(inputValue)}
          disabled={isBlocked || !inputValue.trim()}
          className="px-3 py-2 rounded-lg bg-[hsl(var(--pine-green))] text-white min-h-[40px] disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
