import { useState } from "react";
import { SlidersHorizontal, ChevronDown, ArrowUpDown, X } from "lucide-react";
import { type JobFilterState, createDefaultFilters } from "./jobFilterHelpers";
import { FilterPanel } from "./FilterPanel";

export type { JobFilterState };
export { createDefaultFilters };
export { countActiveFilters } from "./jobFilterHelpers";

const SORT_LABELS: Record<string, string> = { recent: "Most Recent", match: "Best Match", salary: "Salary" };

interface JobFiltersProps {
  filters: JobFilterState;
  onFiltersChange: (filters: JobFilterState) => void;
  industries: string[];
  showMatchSort: boolean;
  activeFilterCount: number;
}

export default function JobFilters({ filters, onFiltersChange, industries, showMatchSort, activeFilterCount }: JobFiltersProps) {
  const [expanded, setExpanded] = useState(false);
  const sortKeys = ["recent", ...(showMatchSort ? ["match"] : []), "salary"] as const;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground mr-1" />
          {sortKeys.map((key) => (
            <button
              key={key}
              onClick={() => onFiltersChange({ ...filters, sortBy: key as JobFilterState["sortBy"] })}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                filters.sortBy === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
            expanded || activeFilterCount > 0 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {(filters.titleKeyword || filters.skill) && (
        <div className="flex flex-wrap gap-1.5">
          {filters.titleKeyword && (
            <button
              onClick={() => onFiltersChange({ ...filters, titleKeyword: "" })}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              Role: {filters.titleKeyword}
              <X className="w-3 h-3" />
            </button>
          )}
          {filters.skill && (
            <button
              onClick={() => onFiltersChange({ ...filters, skill: "" })}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              Skill: {filters.skill}
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {expanded && (
        <FilterPanel
          filters={filters}
          industries={industries}
          activeFilterCount={activeFilterCount}
          onFiltersChange={onFiltersChange}
        />
      )}
    </div>
  );
}
