import { useEffect, useRef } from "react";
import { Minus, MessageSquare } from "lucide-react";
import { useApp } from "@/lib/appContext";
import MessageBubble from "../MessageBubble";
import ChatInput from "../ChatInput";
import FlowBanner from "../FlowBanner";
import ProcessingIndicator from "../ProcessingIndicator";

function computeDesktopPanelPosition(bubblePos: { x: number; y: number }) {
  const panelW = 440;
  const panelH = 600;
  const bubbleSize = 64;
  const margin = 12;

  let left = bubblePos.x - panelW + bubbleSize;
  let top = bubblePos.y - panelH - margin;

  if (left < 8) left = 8;
  if (left + panelW > window.innerWidth - 8) left = window.innerWidth - panelW - 8;
  if (top < 8) top = bubblePos.y + bubbleSize + margin;
  if (top + panelH > window.innerHeight - 8) top = window.innerHeight - panelH - 8;

  return { left, top };
}

function PanelHeader({ onMinimize }: { onMinimize: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-gradient-to-r from-secondary/8 to-secondary/4 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <MessageSquare className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold text-foreground">Montgomery Assistant</span>
      </div>
      <button
        onClick={onMinimize}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Minimize"
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ExpandedPanelProps {
  onSendMessage: (text: string) => void;
  onMinimize: () => void;
  position: { x: number; y: number };
  isMobile: boolean;
}

export function ExpandedPanel({ onSendMessage, onMinimize, position, isMobile }: ExpandedPanelProps) {
  const { state } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.messages, state.isTyping]);

  const panelStyle = isMobile
    ? { bottom: 0, left: 0, right: 0 }
    : computeDesktopPanelPosition(position);

  return (
    <div
      className={`
        fixed z-[9999] animate-bubble-in
        ${isMobile
          ? "h-[75vh] w-full rounded-t-2xl"
          : "w-[440px] h-[600px] rounded-2xl"
        }
        bg-background border border-border shadow-2xl
        flex flex-col overflow-hidden
      `}
      style={panelStyle}
    >
      <PanelHeader onMinimize={onMinimize} />
      <FlowBanner />
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 py-2">
        {state.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onChipClick={onSendMessage} />
        ))}
        <ProcessingIndicator />
      </div>
      <ChatInput onSend={onSendMessage} placeholder="Ask about Montgomery..." />
    </div>
  );
}
