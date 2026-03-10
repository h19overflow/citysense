import { MapPin, Phone, Clock, ExternalLink, Navigation, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import type { ServicePoint } from "@/lib/types";

const INTERNAL_FIELDS = new Set([
  "OBJECTID", "OBJECTID_1", "GlobalID", "FID",
  "created_user", "created_date", "last_edited_user", "last_edited_date",
  "LASTUPDATE", "LASTEDITOR", "BUFF_DIST", "FIPS",
  "Status1", "F13", "F14", "F19", "date_", "time",
  "Contact", "Notes", "Status_1",
  "TAZ_2035LR", "TAZ_2030LR", "SCH_ENRL", "ENRLMT", "enr",
  "Zip", "City", "ZIP", "ARC_Street", "ARC_KeyFie",
  "Score", "Match_addr", "Reference", "Status",
]);

const FIELD_LABELS: Record<string, string> = {
  TYPE_FACIL: "Type", EMPLOY: "Employees", BEDS_UNITS: "Beds/Units",
  Day_Ages: "Ages", Night_Hour: "Night hours", Director: "Director",
  Level_: "Level", TYPE: "Type", Enroll: "Enrollment", FACILITY_N: "Facility",
  Day_Hours: "Hours", TELEPHONE: "Phone", PHONE: "Phone",
  Day_Capaci: "Capacity", Night_Capa: "Night cap.", COMPANY_NA: "Company",
};

export function isInternalField(key: string): boolean {
  return INTERNAL_FIELDS.has(key);
}

export function humanizeFieldName(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function ServiceLocationCard({
  point,
  isSelected,
  categoryColor,
  onSelect,
  onNavigateToChat,
}: {
  point: ServicePoint;
  isSelected: boolean;
  categoryColor: string;
  onSelect: () => void;
  onNavigateToChat: (msg: string) => void;
}) {
  return (
    <div
      className={`relative rounded-xl border overflow-hidden transition-all magnolia-bg ${
        isSelected ? "border-primary/30 shadow-sm" : "border-border/40 hover:border-border"
      }`}
    >
      {/* Left accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: categoryColor }} />

      <button onClick={onSelect} className="w-full text-left p-4 pl-5">
        <div className="flex items-start justify-between">
          <h4 className="text-sm font-bold text-secondary leading-snug pr-2">{point.name}</h4>
          {isSelected ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          )}
        </div>
        <div className="mt-2 space-y-1">
          {point.address && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" /><span>{point.address}</span>
            </div>
          )}
          {point.phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="w-3 h-3 shrink-0" /><span>{point.phone}</span>
            </div>
          )}
        </div>
      </button>

      {isSelected && (
        <LocationExpandedDetails point={point} onNavigateToChat={onNavigateToChat} />
      )}
    </div>
  );
}

function LocationExpandedDetails({
  point,
  onNavigateToChat,
}: {
  point: ServicePoint;
  onNavigateToChat: (msg: string) => void;
}) {
  const visibleDetails = Object.entries(point.details ?? {})
    .filter(([key]) => !isInternalField(key))
    .slice(0, 6);

  return (
    <div className="px-4 pb-4 pl-5 space-y-3 border-t border-border/20 pt-3">
      {point.hours && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3 shrink-0" /><span>{point.hours}</span>
        </div>
      )}
      {point.website && (
        <a href={point.website} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-primary hover:underline">
          <ExternalLink className="w-3 h-3 shrink-0" />Visit website
        </a>
      )}
      {visibleDetails.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Details</p>
          {visibleDetails.map(([key, value]) => (
            <div key={key} className="flex items-start gap-2 text-xs">
              <span className="text-muted-foreground shrink-0 w-24 truncate">{humanizeFieldName(key)}</span>
              <span className="text-foreground">{value}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(point.address || `${point.lat},${point.lng}`)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border/50 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />Directions
        </a>
        <button
          onClick={() => onNavigateToChat(`I want to visit ${point.name}. Help me understand what they offer and how to prepare.`)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[hsl(var(--amber-gold))] text-white text-xs font-semibold hover:bg-[hsl(var(--amber-gold))]/90 transition-colors shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Help me prepare
        </button>
      </div>
    </div>
  );
}
