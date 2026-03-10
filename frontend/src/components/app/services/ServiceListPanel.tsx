import { Search } from "lucide-react";
import type { ServicePoint } from "@/lib/types";
import type { SortOption } from "./ServiceDetailView";
import { ServiceLocationCard } from "./serviceDetailHelpers";

interface ServiceListPanelProps {
  points: ServicePoint[];
  selectedPointId: string | null;
  categoryColor: string;
  locationSearch: string;
  sortOption: SortOption;
  onChangeLocationSearch: (value: string) => void;
  onChangeSortOption: (option: SortOption) => void;
  onSelectPoint: (point: ServicePoint) => void;
  onNavigateToChat: (msg: string) => void;
}

export function ServiceListPanel({
  points,
  selectedPointId,
  categoryColor,
  locationSearch,
  sortOption,
  onChangeLocationSearch,
  onChangeSortOption,
  onSelectPoint,
  onNavigateToChat,
}: ServiceListPanelProps) {
  return (
    <div className="p-4">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={locationSearch}
          onChange={(e) => onChangeLocationSearch(e.target.value)}
          placeholder="Search locations..."
          className="w-full pl-8 pr-3 py-2 rounded-lg border border-border/50 bg-white text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />
      </div>

      <SortToggle selected={sortOption} onSelect={onChangeSortOption} />

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Locations
      </p>

      {points.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {locationSearch ? `No locations match "${locationSearch}".` : "No locations available."}
        </p>
      ) : (
        <div className="space-y-2">
          {points.map((point) => (
            <ServiceLocationCard
              key={point.id}
              point={point}
              isSelected={point.id === selectedPointId}
              categoryColor={categoryColor}
              onSelect={() => onSelectPoint(point)}
              onNavigateToChat={onNavigateToChat}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SortToggle({
  selected,
  onSelect,
}: {
  selected: SortOption;
  onSelect: (option: SortOption) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Sort:
      </span>
      {(["alphabetical", "nearest"] as SortOption[]).map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
            selected === option
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-white text-muted-foreground border-border/50 hover:border-border"
          }`}
        >
          {option === "alphabetical" ? "A–Z" : "Nearest"}
        </button>
      ))}
    </div>
  );
}
