interface ChatInputProps {
  placeholder?: string;
}

const ChatInput = ({ placeholder = "Type your situation..." }: ChatInputProps) => (
  <div className="px-4 py-3 bg-background border-t border-border">
    <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-3">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-muted-foreground shrink-0">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 7v6M7 10h6" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="text-muted-foreground text-sm flex-1">{placeholder}</span>
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="hsl(var(--primary-foreground))" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  </div>
);

export default ChatInput;
