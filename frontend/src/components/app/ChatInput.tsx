import { useState } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
}

const ChatInput = ({ onSend, placeholder = "Type your situation..." }: ChatInputProps) => {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 py-3 bg-background border-t border-border shrink-0">
      <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-2">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-muted-foreground shrink-0">
          <circle cx="10" cy="13" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 13v-1a2 2 0 114 0v1M10 2v4M4 6l2 2M16 6l-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="hsl(var(--primary-foreground))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
