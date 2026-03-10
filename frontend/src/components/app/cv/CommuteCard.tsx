import { memo } from "react";
import { MapPin, Car, Bus, Footprints } from "lucide-react";
import type { CommuteEstimate } from "@/lib/types";
import { TravelMode } from "./TravelMode";

interface CommuteCardProps {
  estimate: CommuteEstimate;
  isSelected: boolean;
  onSelect: (jobId: string) => void;
}

export const CommuteCard = memo(function CommuteCard({ estimate, isSelected, onSelect }: CommuteCardProps) {
  return (
    <button
      onClick={() => onSelect(estimate.jobId)}
      className={`w-full text-left rounded-lg p-3 flex items-center gap-4 transition-colors ${
        isSelected
          ? "bg-primary/5 border border-primary/30"
          : "bg-white border border-border/30 hover:bg-muted/30"
      }`}
    >
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-bold text-foreground truncate">{estimate.jobTitle}</h4>
        <p className="text-xs text-muted-foreground truncate">{estimate.company}</p>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
          <MapPin className="w-2.5 h-2.5" />
          {estimate.distanceMiles} mi
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <TravelMode icon={Car} minutes={estimate.drivingMinutes} label="Drive" color="text-foreground" />
        {estimate.transitMinutes !== null && (
          <TravelMode icon={Bus} minutes={estimate.transitMinutes} label="Bus" color="text-blue-600" />
        )}
        {estimate.walkingMinutes !== null && (
          <TravelMode icon={Footprints} minutes={estimate.walkingMinutes} label="Walk" color="text-emerald-600" />
        )}
      </div>
    </button>
  );
});
