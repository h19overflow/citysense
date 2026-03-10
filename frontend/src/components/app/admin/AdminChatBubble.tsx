import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Trash2, Sparkles } from "lucide-react";
import { useAdminChatStore } from "@/stores/adminChatStore";
import { AssistantBubble, SuggestionChips, ToolCallChip, UserBubble } from "./ChatBubbles";

interface AdminChatBubbleProps {
  initialQuestion?: string;
}

function ChatInput({ onSend }: { onSend: (text: string) => void }) {
  const [draft, setDraft] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-border/30 shrink-0">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Ask about sentiment, concerns, neighborhoods…"
        className="flex-1 px-3 py-2 text-sm rounded-lg border border-border/50 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 min-h-[40px]"
      />
      <button
        type="submit"
        disabled={!draft.trim()}
        className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 min-h-[40px]"
        aria-label="Send message"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}

function AnalystFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 group"
      aria-label="Open AI Analyst"
    >
      <div className="relative flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-full bg-[hsl(218,51%,20%)] text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 hover:scale-[1.03]">
        {/* Pulse ring */}
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[hsl(218,51%,20%)]" />
        </span>

        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">AI Analyst</span>
      </div>
    </button>
  );
}

function PanelHeader({
  messageCount,
  onClear,
  onClose,
}: {
  messageCount: number;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 shrink-0 bg-[hsl(218,51%,20%)] text-white">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-sm font-semibold tracking-tight">AI Analyst</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-white/60 font-medium">Ready</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {messageCount > 0 && (
          <button
            onClick={onClear}
            className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onSelect }: { onSelect: (chip: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-4 pt-8">
      <div className="w-12 h-12 rounded-full bg-[hsl(218,51%,20%)]/10 flex items-center justify-center">
        <MessageSquare className="w-5 h-5 text-primary" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">What would you like to know?</p>
        <p className="text-xs text-muted-foreground max-w-[280px]">
          Ask about citizen sentiment, neighborhood trends, or specific articles.
        </p>
      </div>
      <SuggestionChips onSelect={onSelect} />
    </div>
  );
}

export function AdminChatBubble({ initialQuestion }: AdminChatBubbleProps) {
  const { messages, streamState, sendMessage, clearMessages, isOpen, setIsOpen } = useAdminChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSentQuestionRef = useRef<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (initialQuestion && initialQuestion !== lastSentQuestionRef.current && streamState !== "streaming") {
      lastSentQuestionRef.current = initialQuestion;
      setIsOpen(true);
      sendMessage(initialQuestion);
    }
  }, [initialQuestion, sendMessage, streamState]);

  if (!isOpen) {
    return <AnalystFab onClick={() => setIsOpen(true)} />;
  }

  return (
    <div className="fixed top-0 right-0 z-50 w-[520px] h-full bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      <PanelHeader
        messageCount={messages.length}
        onClear={clearMessages}
        onClose={() => setIsOpen(false)}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 py-3 px-3 space-y-3">
        {messages.length === 0 && <EmptyState onSelect={sendMessage} />}
        {messages.map((msg, index) => {
          const isLastAssistant = msg.role === "assistant" && index === messages.findLastIndex((m) => m.role === "assistant");
          return msg.role === "user" ? (
            <UserBubble key={msg.id} content={msg.content} />
          ) : msg.role === "tool" ? (
            <ToolCallChip key={msg.id} label={msg.content} />
          ) : (
            <AssistantBubble key={msg.id} content={msg.content} isStreaming={isLastAssistant && streamState === "streaming"} isLatest={isLastAssistant} />
          );
        })}
      </div>

      <ChatInput onSend={sendMessage} />
    </div>
  );
}
