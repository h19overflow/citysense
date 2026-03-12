import { useEffect, useState } from "react";
import { MessageSquare, Sparkles } from "lucide-react";

const SUGGESTION_CHIPS = [
  "What jobs match my skills?",
  "How can I upskill faster?",
  "What's the job market like?",
  "Tips for my resume?",
];

function PanelHeader() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/30 shrink-0 bg-[hsl(var(--pine-green))] text-white">
      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <div>
        <span className="text-sm font-semibold tracking-tight">Career Guide</span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-white/60 font-medium">Ready</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 pt-8 px-4">
      <div className="w-12 h-12 rounded-full bg-[hsl(var(--pine-green))]/10 flex items-center justify-center">
        <MessageSquare className="w-5 h-5 text-[hsl(var(--pine-green))]" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">Your Career Guide</p>
        <p className="text-xs text-muted-foreground max-w-[240px]">
          Ask about job matches, upskilling paths, or the Montgomery job market.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip}
            className="px-3 py-1.5 rounded-full border border-border/50 bg-background text-xs text-foreground hover:bg-muted transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatInputPlaceholder() {
  return (
    <div className="flex gap-2 p-3 border-t border-border/30 shrink-0">
      <input
        disabled
        placeholder="Career assistant coming soon…"
        className="flex-1 px-3 py-2 text-sm rounded-lg border border-border/50 bg-muted/50 text-muted-foreground placeholder:text-muted-foreground focus:outline-none min-h-[40px] cursor-not-allowed"
      />
      <button
        disabled
        className="px-3 py-2 rounded-lg bg-[hsl(var(--pine-green))] text-white opacity-40 min-h-[40px] cursor-not-allowed"
        aria-label="Send message"
      >
        <Sparkles className="w-4 h-4" />
      </button>
    </div>
  );
}

export function CareerChatBubble() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`fixed top-0 right-0 z-50 w-[400px] h-full bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
        visible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <PanelHeader />
      <div className="flex-1 overflow-y-auto min-h-0 py-3">
        <EmptyState />
      </div>
      <ChatInputPlaceholder />
    </div>
  );
}
