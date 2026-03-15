import { motion } from "framer-motion";
import { MessageSquare, Sparkles } from "lucide-react";

export function PanelHeader({ status }: { status: string }) {
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

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 flex gap-1 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export function ChatBubbleMessage({ role, content }: { role: "user" | "assistant"; content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          role === "user"
            ? "bg-[hsl(var(--pine-green))] text-white rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        }`}
      >
        {content}
      </div>
    </motion.div>
  );
}

export function IdleState() {
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
