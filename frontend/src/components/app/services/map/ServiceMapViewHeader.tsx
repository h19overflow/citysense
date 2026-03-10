import { ArrowLeft, MessageCircle } from "lucide-react";

interface ServiceMapViewHeaderProps {
  visiblePointCount: number;
  guideOpen: boolean;
  onBack: () => void;
  onToggleGuide: () => void;
}

export function ServiceMapViewHeader({ visiblePointCount, guideOpen, onBack, onToggleGuide }: ServiceMapViewHeaderProps) {
  return (
    <div className="shrink-0 px-6 py-4 border-b border-border/30 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        <h1 className="text-base font-bold text-foreground">All Services Map</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">{visiblePointCount} locations</span>
        <button
          onClick={onToggleGuide}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            guideOpen
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Guide
        </button>
      </div>
    </div>
  );
}
