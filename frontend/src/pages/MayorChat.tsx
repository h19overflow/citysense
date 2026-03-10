import { useRef, useState } from "react";
import { ArrowLeft, Send, BrainCircuit } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { readSseStream } from "@/lib/sseClient";
import { getToolLabel } from "@/lib/toolLabels";
import { API_BASE } from "@/lib/apiConfig";
import { UserBubble, AssistantBubble, SuggestionChips, ToolCallChip } from "@/components/app/admin/ChatBubbles";

interface ChatHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

function appendTokenToLastEntry(prev: ChatHistoryEntry[], token: string): ChatHistoryEntry[] {
  const updated = [...prev];
  const last = updated[updated.length - 1];
  updated[updated.length - 1] = { ...last, content: last.content + token };
  return updated;
}

function replaceLastEntryWithError(prev: ChatHistoryEntry[]): ChatHistoryEntry[] {
  const updated = [...prev];
  updated[updated.length - 1] = { role: "assistant", content: "Sorry, I couldn't connect to the analysis backend." };
  return updated;
}

export default function MayorChat() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const [activeToolLabel, setActiveToolLabel] = useState<string | null>(null);

  async function sendMessage(message: string): Promise<void> {
    if (!message.trim() || isStreaming) return;

    setHistory((prev) => [...prev, { role: "user", content: message }, { role: "assistant", content: "" }]);
    setInputValue("");
    setIsStreaming(true);

    try {
      await readSseStream(
        `${API_BASE}/api/chat`,
        { message, history },
        (token) => setHistory((prev) => appendTokenToLastEntry(prev, token)),
        (toolName) => setActiveToolLabel(getToolLabel(toolName)),
      );
    } catch (error) {
      console.error("[MayorChat] Stream failed:", error);
      setHistory((prev) => replaceLastEntryWithError(prev));
    } finally {
      setActiveToolLabel(null);
      setIsStreaming(false);
      scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(inputValue);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-[#060f1e] via-secondary to-[#0d1b35] border-b border-secondary/50 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors min-h-[44px] px-2"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-2 ml-1">
          <BrainCircuit className="w-4 h-4 text-[hsl(var(--amber-gold))]" aria-hidden="true" />
          <h1 className="text-base font-semibold text-white">AI Analyst</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-2xl w-full mx-auto">
        {history.length === 0 && (
          <p className="text-sm text-muted-foreground text-center pt-8">
            Ask the AI analyst anything about the city's sentiment and news.
          </p>
        )}
        {history.map((entry, index) => {
          const isLastAssistant = entry.role === "assistant" && index === history.length - 1;
          return entry.role === "user"
            ? <UserBubble key={index} content={entry.content} />
            : <AssistantBubble key={index} content={entry.content} isStreaming={isLastAssistant && isStreaming} isLatest={isLastAssistant} />;
        })}
        {activeToolLabel && <ToolCallChip label={activeToolLabel} />}
        <div ref={scrollAnchorRef} />
      </main>

      <div className="sticky bottom-0 bg-background border-t border-border max-w-2xl w-full mx-auto">
        {history.length === 0 && <SuggestionChips onSelect={(chip) => sendMessage(chip)} />}
        <div className="flex items-center gap-2 px-4 py-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about city sentiment…"
            disabled={isStreaming}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 disabled:opacity-60 transition-colors"
          />
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim() || isStreaming}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
