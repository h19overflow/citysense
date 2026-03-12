import { useEffect, useState } from "react";
import { MessageSquare, Send, Sparkles } from "lucide-react";
import { CareerProgressBubble } from "./CareerProgressBubble";
import { useCareerAgent, type CareerAgentResult } from "../../../lib/hooks/useCareerAgent";

interface CareerChatBubbleProps {
  cvVersionId?: string;
  citizenId?: string;
  onResult?: (result: CareerAgentResult) => void;
}

function PanelHeader({ status }: { status: string }) {
  const isRunning = status === "running";
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/30 shrink-0 bg-[hsl(var(--pine-green))] text-white">
      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <div>
        <span className="text-sm font-semibold tracking-tight">Career Guide</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-yellow-400 animate-pulse" : "bg-emerald-400 animate-pulse"}`} />
          <span className="text-[10px] text-white/60 font-medium">
            {isRunning ? "Analyzing..." : "Ready"}
          </span>
        </div>
      </div>
    </div>
  );
}

function IdleState() {
  return (
    <div className="flex flex-col items-center gap-4 pt-8 px-4">
      <div className="w-12 h-12 rounded-full bg-[hsl(var(--pine-green))]/10 flex items-center justify-center">
        <MessageSquare className="w-5 h-5 text-[hsl(var(--pine-green))]" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">Your Career Guide</p>
        <p className="text-xs text-muted-foreground max-w-[240px]">
          Upload your CV to get personalized job matches and upskilling paths.
        </p>
      </div>
    </div>
  );
}

export function CareerChatBubble({ cvVersionId, citizenId, onResult }: CareerChatBubbleProps) {
  const [visible, setVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [contextId] = useState(() => crypto.randomUUID());
  const { status, stage, progress, result, error, startAnalysis, sendMessage } = useCareerAgent();

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (cvVersionId && citizenId) {
      startAnalysis(cvVersionId, citizenId);
    }
  }, [cvVersionId, citizenId, startAnalysis]);

  useEffect(() => {
    if (result && onResult) {
      onResult(result);
    }
  }, [result, onResult]);

  const handleChipClick = (chip: string) => {
    if (!citizenId) return;
    sendMessage(chip, contextId, citizenId);
  };

  const handleSend = () => {
    if (!inputValue.trim() || !citizenId) return;
    sendMessage(inputValue.trim(), contextId, citizenId);
    setInputValue("");
  };

  return (
    <div
      className={`fixed top-0 right-0 z-50 w-[400px] h-full bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
        visible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <PanelHeader status={status} />
      <div className="flex-1 overflow-y-auto min-h-0 py-3">
        {status === "idle" && <IdleState />}
        {status === "running" && (
          <CareerProgressBubble stage={stage} progress={progress} />
        )}
        {status === "failed" && (
          <div className="px-4 py-3 text-sm text-destructive">{error ?? "Analysis failed."}</div>
        )}
        {status === "completed" && result && (
          <div className="flex flex-col gap-3 px-4 py-2">
            <p className="text-xs text-muted-foreground leading-relaxed">{result.summary}</p>
            <div className="flex flex-wrap gap-2">
              {result.chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  className="px-3 py-1.5 rounded-full border border-border/50 bg-background text-xs text-foreground hover:bg-muted transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 p-3 border-t border-border/30 shrink-0">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={status === "running" ? "Analyzing your profile..." : "Ask your career guide..."}
          disabled={status === "running"}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-border/50 bg-background focus:outline-none min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSend}
          disabled={status === "running" || !inputValue.trim()}
          className="px-3 py-2 rounded-lg bg-[hsl(var(--pine-green))] text-white min-h-[40px] disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
