import { MapPin, DollarSign, Users } from "lucide-react";
import type { CitizenProfile } from "@/lib/citizenProfiles";

interface PersonaCardProps {
  citizen: CitizenProfile;
  isSelected: boolean;
  onSelect: () => void;
}

export function PersonaCard({ citizen, isSelected, onSelect }: PersonaCardProps) {
  const p = citizen.profile;
  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-xl border p-4 transition-all ${
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-md"
          : "border-border/50 hover:border-border hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: citizen.avatarColor }}
        >
          {citizen.avatarInitials}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground">{citizen.cv.name}</h3>
          <p className="text-[11px] text-muted-foreground">{citizen.tagline}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {p.neighborhood}
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" /> ${p.income.toLocaleString()}/yr
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" /> HH {p.householdSize}
        </span>
      </div>
      {p.benefits.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {p.benefits.map((b) => (
            <span key={b} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-medium">
              {b}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
