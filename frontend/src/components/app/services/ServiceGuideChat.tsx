import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Compass } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { GuideBubble } from "./guide/GuideBubble";
import { TypingDots } from "./guide/TypingDots";
import { useGuideMessages } from "./guide/useGuideMessages";

const SUGGESTION_CHIPS = [
  "Where can I find childcare?",
  "Show me healthcare services",
  "I need free computer access",
  "What can you help with?",
];

export function ServiceGuideChat({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const { state } = useApp();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, isTyping, sendMessage, selectPinById } = useGuideMessages(setInput);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
    if (!isTyping) requestAnimationFrame(() => inputRef.current?.focus());
  }, [messages, isTyping, scrollToBottom]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const showSuggestions = state.guideMessages.length <= 1;

  return (
    <div className="flex flex-col h-full min-h-0">
      {!hideHeader && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 shrink-0">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Compass className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold">Services Guide</p>
            <p className="text-[10px] text-muted-foreground">
              Ask about any service on the map
            </p>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.map((msg) => (
          <GuideBubble key={msg.id} message={msg} onPinClick={selectPinById} onChipClick={sendMessage} />
        ))}
        {isTyping && <TypingDots />}

        {showSuggestions && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                className="text-[10px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-border/40 shrink-0">
        <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about services..."
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
          >
            <Send className="h-3 w-3 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
