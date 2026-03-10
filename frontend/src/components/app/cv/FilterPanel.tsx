import { X } from "lucide-react";
import { JOB_TYPES, SENIORITY_LEVELS, createDefaultFilters, type JobFilterState } from "./jobFilterHelpers";

interface FilterPanelProps {
  filters: JobFilterState;
  industries: string[];
  activeFilterCount: number;
  onFiltersChange: (filters: JobFilterState) => void;
}

export function FilterPanel({ filters, industries, activeFilterCount, onFiltersChange }: FilterPanelProps) {
  function toggleJobType(type: string) {
    const next = new Set(filters.jobTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onFiltersChange({ ...filters, jobTypes: next });
  }

  function toggleSeniority(level: string) {
    const next = new Set(filters.seniority);
    if (next.has(level)) next.delete(level);
    else next.add(level);
    onFiltersChange({ ...filters, seniority: next });
  }

  return (
    <div className="rounded-xl border border-border/50 bg-white p-3 space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Job Type</p>
        <div className="flex flex-wrap gap-1.5">
          {JOB_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => toggleJobType(type)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                filters.jobTypes.has(type)
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "border-border/50 text-muted-foreground hover:border-border"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Experience Level</p>
        <div className="flex flex-wrap gap-1.5">
          {SENIORITY_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => toggleSeniority(level)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                filters.seniority.has(level)
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "border-border/50 text-muted-foreground hover:border-border"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Industry</p>
        <select
          value={filters.industry}
          onChange={(e) => onFiltersChange({ ...filters, industry: e.target.value })}
          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border/50 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Industries</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={() => onFiltersChange(createDefaultFilters())}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3 h-3" />
          Clear all filters
        </button>
      )}
    </div>
  );
}
