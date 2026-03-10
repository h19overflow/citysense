import { ArrowLeft, MapPin, Sparkles } from "lucide-react";
import type { CategoryMeta } from "./serviceCategoryMeta";

interface DetailViewHeaderProps {
  meta: CategoryMeta;
  Icon: React.ComponentType<{ className?: string }>;
  totalCount: number;
  onBack: () => void;
  guideOpen?: boolean;
  onToggleGuide?: () => void;
}

export function DetailViewHeader({ meta, Icon, totalCount, onBack, guideOpen, onToggleGuide }: DetailViewHeaderProps) {
  return (
    <div className="shrink-0 border-b border-border/30 bg-background">
      <div className="px-6 py-4 flex items-start gap-4">
        <button
          onClick={onBack}
          className="mt-1 flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-px w-5 bg-[hsl(var(--amber-gold))]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[hsl(var(--amber-gold))]">
              Montgomery Services
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg border shadow-sm flex items-center justify-center ${meta.color}`}
              style={{ backgroundColor: `${meta.markerColor}10` }}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-secondary leading-tight">{meta.label}</h1>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 max-w-md">
                {meta.description}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-1">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 text-xs font-medium text-muted-foreground">
            <MapPin className="w-3 h-3" />
            {totalCount} location{totalCount !== 1 ? "s" : ""}
          </div>
          {onToggleGuide && (
            <button
              onClick={onToggleGuide}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shadow-sm ${
                guideOpen
                  ? "bg-[hsl(var(--amber-gold))] text-white"
                  : "bg-[hsl(var(--amber-gold))]/10 text-[hsl(var(--amber-gold))] hover:bg-[hsl(var(--amber-gold))]/20"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Help me prepare
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
