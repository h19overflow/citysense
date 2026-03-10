import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { ServiceCard } from "../ServiceCard";
import type { GuideMessage } from "@/lib/types";

interface GuideBubbleProps {
  message: GuideMessage;
  onPinClick: (pinId: string) => void;
  onChipClick: (text: string) => void;
}

function renderBoldSegments(line: string): ReactNode {
  const parts = line.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

function renderMessageLine(line: string, index: number) {
  if (line === "---") return <hr key={index} className="my-2 border-border/40" />;
  return (
    <p key={index} className={line === "" ? "h-1.5" : ""}>
      {renderBoldSegments(line)}
    </p>
  );
}

export function GuideBubble({ message, onPinClick, onChipClick }: GuideBubbleProps) {
  const isUser = message.role === "user";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed overflow-hidden break-words ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {message.content.split("\n").map(renderMessageLine)}
        {message.pinIds && message.pinIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.pinIds.map((pinId) => (
              <button
                key={pinId}
                onClick={() => onPinClick(pinId)}
                className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <MapPin className="h-2.5 w-2.5" />
                View
              </button>
            ))}
          </div>
        )}
      </div>
      {!isUser && message.serviceCards && message.serviceCards.length > 0 && (
        <div className="mt-2 max-w-[90%] space-y-2 overflow-hidden">
          {message.serviceCards.map((card, i) => (
            <ServiceCard key={`${card.title}-${i}`} card={card} />
          ))}
        </div>
      )}
      {!isUser && message.chips && message.chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5 max-w-[85%]">
          {message.chips.map((chip) => (
            <button
              key={chip}
              onClick={() => onChipClick(chip)}
              className="text-[10px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
