import {
  Heart,
  Building2,
  Baby,
  GraduationCap,
  ShieldAlert,
  BookOpen,
  Phone,
  Clock,
  MapPin,
  ExternalLink,
  X,
} from "lucide-react";
import type { ServiceCategory, ServicePoint } from "@/lib/types";
import { useApp } from "@/lib/appContext";

const CATEGORY_ICONS: Record<
  ServiceCategory,
  React.ComponentType<{ className?: string }>
> = {
  health: Heart,
  community: Building2,
  childcare: Baby,
  education: GraduationCap,
  safety: ShieldAlert,
  libraries: BookOpen,
};

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  health: "Health",
  community: "Community Center",
  childcare: "Childcare",
  education: "Education",
  safety: "Fire & Safety",
  libraries: "Library",
};

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  health: "bg-red-100 text-red-700",
  community: "bg-green-100 text-green-700",
  childcare: "bg-amber-100 text-amber-700",
  education: "bg-blue-100 text-blue-700",
  safety: "bg-orange-100 text-orange-700",
  libraries: "bg-purple-100 text-purple-700",
};

interface PinDetailCardProps {
  pin: ServicePoint;
  onHelpMePrepare: (pin: ServicePoint) => void;
}

export function PinDetailCard({ pin, onHelpMePrepare }: PinDetailCardProps) {
  const { dispatch } = useApp();
  const Icon = CATEGORY_ICONS[pin.category];
  const colorClass = CATEGORY_COLORS[pin.category];

  function handleClose() {
    dispatch({ type: "SET_SELECTED_PIN", pin: null });
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`rounded-md p-1.5 ${colorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
            {CATEGORY_LABELS[pin.category]}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground p-0.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <h3 className="text-sm font-semibold">{pin.name}</h3>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        {pin.address && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{pin.address}</span>
          </div>
        )}
        {pin.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{pin.phone}</span>
          </div>
        )}
        {pin.hours && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{pin.hours}</span>
          </div>
        )}
        {pin.website && (
          <a
            href={pin.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span>Visit website</span>
          </a>
        )}
      </div>

      <button
        onClick={() => onHelpMePrepare(pin)}
        className="w-full text-xs py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
      >
        Help me prepare
      </button>
    </div>
  );
}
