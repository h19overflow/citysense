import { MapPin, Phone, Clock, Navigation } from "lucide-react";
import { Heart } from "lucide-react";
import type { ServiceCategory, ServicePoint } from "@/lib/types";
import { useApp } from "@/lib/appContext";

interface MapCategoryEntry {
  id: ServiceCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  markerColor: string;
}

interface MapPointDetailPanelProps {
  point: ServicePoint;
  categories: MapCategoryEntry[];
  onClose: () => void;
  onNavigateToChat: (msg: string) => void;
  onViewCategory: () => void;
}

export function MapPointDetailPanel({
  point,
  categories,
  onClose,
  onNavigateToChat,
  onViewCategory,
}: MapPointDetailPanelProps) {
  const { dispatch } = useApp();
  const catMeta = categories.find((c) => c.id === point.category);
  const Icon = catMeta?.icon ?? Heart;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onViewCategory}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${catMeta?.color ?? ""}`}
        >
          <Icon className="h-3 w-3" />
          {catMeta?.label}
        </button>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>

      <h3 className="text-base font-bold text-foreground leading-snug">{point.name}</h3>

      <div className="space-y-2">
        {point.address && (
          <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{point.address}</span>
          </div>
        )}
        {point.phone && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Phone className="w-4 h-4 shrink-0" />
            <a href={`tel:${point.phone}`} className="hover:text-foreground">{point.phone}</a>
          </div>
        )}
        {point.hours && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0" />
            <span>{point.hours}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(point.address || `${point.lat},${point.lng}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border/50 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          Directions
        </a>
        <button
          onClick={() => dispatch({
            type: "SEND_GUIDE_MESSAGE",
            message: `Tell me about "${point.name}"${point.address ? ` at ${point.address}` : ""} in Montgomery Alabama. What services do they offer, hours, phone, and what should I bring?`,
          })}
          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          More details
        </button>
      </div>
    </div>
  );
}
