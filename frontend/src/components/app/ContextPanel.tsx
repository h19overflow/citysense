import { useEffect, useState } from "react";
import { Compass, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import ActiveArtifact from "./ActiveArtifact";
import ProfileSummary from "./ProfileSummary";
import ActionItems from "./ActionItems";
import { ServiceGuideChat } from "./services/ServiceGuideChat";
import { useApp } from "@/lib/appContext";

interface ContextPanelProps {
  onNavigateToChat?: (message: string) => void;
}

export default function ContextPanel({ onNavigateToChat }: ContextPanelProps) {
  const { state } = useApp();
  const [guideExpanded, setGuideExpanded] = useState(false);

  // Auto-expand when a guide message is dispatched
  useEffect(() => {
    if (state.guidePendingMessage && !guideExpanded) {
      setGuideExpanded(true);
    }
  }, [state.guidePendingMessage]);

  // Services view: collapsible guide panel
  if (state.activeView === "services") {
    return (
      <aside
        className={`flex-shrink-0 h-full border-l border-border bg-background flex flex-col min-h-0 transition-all duration-300 ${
          guideExpanded ? "w-[380px]" : "w-[52px]"
        }`}
      >
        {guideExpanded ? (
          <>
            {/* Expanded: full guide chat */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Compass className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-xs font-semibold">Services Guide</p>
              </div>
              <button
                onClick={() => setGuideExpanded(false)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors"
                title="Collapse guide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ServiceGuideChat hideHeader />
            </div>
          </>
        ) : (
          /* Collapsed: friendly vertical teaser */
          <CollapsedGuideTeaser onExpand={() => setGuideExpanded(true)} />
        )}
      </aside>
    );
  }

  // Chat view: standard context panel
  return (
    <aside className="w-[380px] flex-shrink-0 h-full border-l border-border bg-background flex flex-col overflow-y-auto">
      <ActiveArtifact />
      <hr className="border-border/30 mx-4" />
      <ProfileSummary />
      <hr className="border-border/30 mx-4" />
      <ActionItems />
    </aside>
  );
}

function CollapsedGuideTeaser({ onExpand }: { onExpand: () => void }) {
  return (
    <button
      onClick={onExpand}
      className="flex flex-col items-center h-full py-4 gap-3 group hover:bg-muted/30 transition-colors"
      title="Open Services Guide"
    >
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <MessageCircle className="w-4 h-4 text-primary" />
      </div>
      <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
      <div className="flex flex-col items-center gap-0.5">
        {["A", "s", "k", " ", "G", "u", "i", "d", "e"].map((char, i) => (
          <span key={i} className="text-[10px] font-medium text-muted-foreground leading-none">
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </div>
      <div className="mt-auto w-2 h-2 rounded-full bg-pine-green animate-pulse" title="Guide is ready" />
    </button>
  );
}
