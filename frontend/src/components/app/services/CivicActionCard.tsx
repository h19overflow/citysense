import {
  Heart,
  Building2,
  Baby,
  GraduationCap,
  ShieldAlert,
  BookOpen,
  MapPin,
  ArrowRight,
} from "lucide-react";
import type { CivicAction, ServiceCategory } from "@/lib/types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  heart: Heart,
  building: Building2,
  baby: Baby,
  "graduation-cap": GraduationCap,
  shield: ShieldAlert,
  book: BookOpen,
};

const COLOR_MAP: Record<ServiceCategory, string> = {
  health: "text-red-500 bg-red-50",
  community: "text-green-500 bg-green-50",
  childcare: "text-amber-500 bg-amber-50",
  education: "text-blue-500 bg-blue-50",
  safety: "text-orange-500 bg-orange-50",
  libraries: "text-purple-500 bg-purple-50",
};

interface CivicActionCardProps {
  action: CivicAction;
  onShowOnMap: (action: CivicAction) => void;
  onHelpMePrepare: (action: CivicAction) => void;
}

export function CivicActionCard({
  action,
  onShowOnMap,
  onHelpMePrepare,
}: CivicActionCardProps) {
  const Icon = ICON_MAP[action.icon] ?? Heart;
  const colorClass = COLOR_MAP[action.category];

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className={`rounded-md p-1.5 ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{action.title}</h4>
            {action.distance && (
              <span className="text-xs text-muted-foreground ml-2 shrink-0">
                {action.distance}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {action.description}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {action.relatedPinId && (
          <button
            onClick={() => onShowOnMap(action)}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <MapPin className="h-3 w-3" />
            Show on Map
          </button>
        )}
        <button
          onClick={() => onHelpMePrepare(action)}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Help me prepare
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
