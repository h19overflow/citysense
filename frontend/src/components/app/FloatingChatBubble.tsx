import { useApp } from "@/lib/appContext";
import { useDraggable } from "@/lib/useDraggable";
import { CollapsedBubble } from "./chat-bubble/CollapsedBubble";
import { ExpandedPanel } from "./chat-bubble/ExpandedPanel";

interface FloatingChatBubbleProps {
  onSendMessage: (text: string) => void;
}

function useIsMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 1024;
}

export default function FloatingChatBubble({ onSendMessage }: FloatingChatBubbleProps) {
  const { state, dispatch } = useApp();
  const isMobile = useIsMobile();
  const { position, ref, wasDragged, handlePointerDown, handlePointerMove, handlePointerUp } =
    useDraggable({ disabled: isMobile });

  // Show on all views — AI chatbot is available everywhere

  const handleToggle = () => dispatch({ type: "TOGGLE_CHAT_BUBBLE" });
  const handleMinimize = () => dispatch({ type: "SET_CHAT_BUBBLE_OPEN", open: false });

  if (state.chatBubbleOpen) {
    return (
      <>
        {/* Backdrop on mobile */}
        {isMobile && (
          <div
            className="fixed inset-0 z-[9998] bg-black/30"
            onClick={handleMinimize}
          />
        )}
        <ExpandedPanel
          onSendMessage={onSendMessage}
          onMinimize={handleMinimize}
          position={position}
          isMobile={isMobile}
        />
      </>
    );
  }

  return (
    <CollapsedBubble
      hasUnread={state.chatBubbleHasUnread}
      onToggle={handleToggle}
      dragHandlers={{ handlePointerDown, handlePointerMove, handlePointerUp, wasDragged }}
      bubbleRef={ref}
      position={position}
      isMobile={isMobile}
    />
  );
}
