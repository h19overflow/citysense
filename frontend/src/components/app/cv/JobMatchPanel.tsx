import { useCallback, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useApp } from "@/lib/appContext";
import TrendingSkillsBar from "./TrendingSkillsBar";
import MarketPulse from "./MarketPulse";
import JobFilters, {
  createDefaultFilters,
  countActiveFilters,
  type JobFilterState,
} from "./JobFilters";
import { useJobFiltering } from "./job-match/useJobFiltering";
import { JobResultsList } from "./job-match/JobResultsList";

const SOURCE_FILTERS = ["All", "Indeed", "LinkedIn"] as const;

const JobMatchPanel = () => {
  const { state } = useApp();
  const [sourceFilter, setSourceFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<JobFilterState>(createDefaultFilters);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const hasCv = !!state.cvData;

  const scrollToResults = useCallback(() => {
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, []);

  const { displayJobs, industries, matchedCount } = useJobFiltering({
    sourceFilter,
    searchQuery,
    filters,
    hasCv,
  });

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const handleFilterByIndustry = useCallback((industry: string) => {
    setFilters((prev) => ({ ...prev, industry }));
    if (industry) scrollToResults();
  }, [scrollToResults]);

  const handleFilterByRole = useCallback((role: string) => {
    setFilters((prev) => ({ ...prev, titleKeyword: role }));
    if (role) scrollToResults();
  }, [scrollToResults]);

  const handleFilterBySeniority = useCallback((level: string) => {
    setFilters((prev) => {
      const next = new Set(prev.seniority);
      if (next.has(level)) next.delete(level);
      else { next.clear(); next.add(level); }
      return { ...prev, seniority: next };
    });
    scrollToResults();
  }, [scrollToResults]);

  const handleToggleExpand = useCallback((jobId: string) => {
    setExpandedJobId((prev) => prev === jobId ? null : jobId);
  }, []);

  const handleFilterBySkill = useCallback((skill: string) => {
    setFilters((prev) => ({ ...prev, skill }));
    if (skill) scrollToResults();
  }, [scrollToResults]);

  if (state.jobsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Loading Montgomery job market data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Montgomery Job Market</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasCv ? `${matchedCount} jobs match your profile (40%+)` : "Live data from Indeed & LinkedIn"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-pine-green animate-pulse" />
          Updated daily
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search jobs, skills, companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border/50 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex rounded-lg border border-border/50 overflow-hidden">
          {SOURCE_FILTERS.map((src) => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                sourceFilter === src ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {state.jobListings.length > 0 && (
        <MarketPulse
          jobs={state.jobListings}
          activeIndustry={filters.industry}
          activeRole={filters.titleKeyword}
          onFilterByIndustry={handleFilterByIndustry}
          onFilterByRole={handleFilterByRole}
          onFilterBySeniority={handleFilterBySeniority}
        />
      )}
      {state.trendingSkills.length > 0 && (
        <TrendingSkillsBar
          skills={state.trendingSkills}
          activeSkill={filters.skill}
          onFilterBySkill={handleFilterBySkill}
        />
      )}

      <JobFilters
        filters={filters}
        onFiltersChange={setFilters}
        industries={industries}
        showMatchSort={hasCv}
        activeFilterCount={activeFilterCount}
      />

      <JobResultsList
        jobs={displayJobs}
        hasCv={hasCv}
        expandedJobId={expandedJobId}
        onToggleExpand={handleToggleExpand}
        resultsRef={resultsRef}
      />
    </div>
  );
};

export default JobMatchPanel;
