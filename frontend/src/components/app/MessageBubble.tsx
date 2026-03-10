import ReactMarkdown from "react-markdown";
import yellowhammer from "@/assets/yellowhammer.png";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/lib/types";
import BenefitsCliffCard from "@/components/app/cards/BenefitsCliffCard";
import JobCard from "@/components/app/cards/JobCard";
import MedicaidCard from "@/components/app/cards/MedicaidCard";
import SkillGapCard from "@/components/app/cards/SkillGapCard";
import ReentryCard from "@/components/app/cards/ReentryCard";
import PdfPreviewCard from "@/components/app/cards/PdfPreviewCard";
import PredictiveInsightCard from "@/components/app/cards/PredictiveInsightCard";

interface MessageBubbleProps {
  message: ChatMessage;
  onChipClick?: (text: string) => void;
}

const MessageBubble = ({ message, onChipClick }: MessageBubbleProps) => {
  if (message.role === "user") {
    return (
      <div className="flex justify-end px-4 py-1.5 animate-fade-up">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%]">
          <p className="text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="animate-fade-up">
      <div className="flex gap-2 px-4 py-1.5">
        <img src={yellowhammer} alt="AI" className="w-7 h-7 rounded-full object-cover shrink-0 mt-1" />
        <div className="bg-card rounded-2xl rounded-tl-md p-4 border-l-4 border-secondary max-w-[calc(100%-48px)] min-w-0 shadow-sm space-y-3 overflow-hidden">
          {/* Markdown content */}
          {message.content && (
            <div className="text-sm text-foreground leading-relaxed prose prose-sm max-w-none break-words overflow-wrap-anywhere
              prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
              prose-headings:text-foreground prose-headings:font-bold
              prose-h3:text-sm prose-h4:text-sm
              prose-strong:text-foreground prose-strong:font-semibold
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            ">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}

          {/* Embedded cards based on type */}
          {message.type === "benefits-cliff" && <BenefitsCliffCard />}
          {message.type === "job-card" && <JobCard />}
          {message.type === "medicaid" && <MedicaidCard />}
          {message.type === "skill-gap" && <SkillGapCard />}
          {message.type === "reentry" && <ReentryCard />}
          {message.type === "pdf-preview" && <PdfPreviewCard />}

          {/* Predictive insight card when hotspots are present */}
          {message.hotspots && message.hotspots.length > 0 && (
            <PredictiveInsightCard hotspots={message.hotspots} />
          )}
        </div>
      </div>

      {/* Chips below bubble */}
      {message.chips && message.chips.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-1 pb-1 ml-11">
          {message.chips.map((chip) => (
            <Button
              key={chip}
              variant="chip"
              size="chip"
              onClick={() => onChipClick?.(chip)}
            >
              {chip}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
