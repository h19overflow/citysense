import { useApp } from "@/lib/appContext";
import type { MessageType } from "@/lib/types";
import BenefitsCliffCard from "./cards/BenefitsCliffCard";
import JobCard from "./cards/JobCard";
import MedicaidCard from "./cards/MedicaidCard";
import SkillGapCard from "./cards/SkillGapCard";
import ReentryCard from "./cards/ReentryCard";
import PdfPreviewCard from "./cards/PdfPreviewCard";

const CARD_BY_MESSAGE_TYPE: Partial<Record<MessageType, React.ComponentType>> = {
  "benefits-cliff": BenefitsCliffCard,
  "job-card": JobCard,
  "medicaid": MedicaidCard,
  "skill-gap": SkillGapCard,
  "reentry": ReentryCard,
  "pdf-preview": PdfPreviewCard,
};

function findLastArtifactMessage(messages: ReturnType<typeof useApp>["state"]["messages"]) {
  return [...messages].reverse().find((m) => m.role === "assistant" && m.type !== "text");
}

export default function ActiveArtifact() {
  const { state } = useApp();
  const artifactMessage = findLastArtifactMessage(state.messages);
  const CardComponent = artifactMessage ? CARD_BY_MESSAGE_TYPE[artifactMessage.type] : undefined;

  return (
    <div className="px-4 py-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Active Insight
      </p>
      <div className="rounded-xl border border-border p-3">
        {CardComponent ? (
          <CardComponent />
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            Insights will appear here as we explore your options.
          </p>
        )}
      </div>
    </div>
  );
}
