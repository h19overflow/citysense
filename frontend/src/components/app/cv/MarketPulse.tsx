import { Briefcase, Building2, GraduationCap, Users } from "lucide-react";
import type { JobListing } from "@/lib/types";
import { MetricCard } from "./market/MetricCard";
import { HorizontalBarRow } from "./market/HorizontalBarRow";
import {
  countByField,
  computeTopSector,
  computeEntryLevelPercent,
  computeAverageApplicants,
  computeTopSixByCount,
  extractTitleKeyword,
} from "./market/marketPulseHelpers";

export { extractTitleKeyword };

interface MarketPulseProps {
  jobs: JobListing[];
  activeIndustry?: string;
  activeRole?: string;
  onFilterByIndustry?: (industry: string) => void;
  onFilterByRole?: (role: string) => void;
  onFilterBySeniority?: (level: string) => void;
}

// ── Main component ──────────────────────────────────────────

const MarketPulse = ({ jobs, activeIndustry, activeRole, onFilterByIndustry, onFilterByRole, onFilterBySeniority }: MarketPulseProps) => {
  const topSector = computeTopSector(jobs);
  const entryLevelPercent = computeEntryLevelPercent(jobs);
  const averageApplicants = computeAverageApplicants(jobs);

  const industryCounts = countByField(jobs, (job) => job.industry);
  const topIndustries = computeTopSixByCount(industryCounts);

  const titleKeywordCounts = countByField(jobs, (job) => extractTitleKeyword(job.title));
  const topTitleKeywords = computeTopSixByCount(titleKeywordCounts);

  const maxIndustryCount = topIndustries[0]?.count ?? 1;
  const maxTitleCount = topTitleKeywords[0]?.count ?? 1;

  return (
    <div className="space-y-3">
      {/* Row 1: Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MetricCard
          icon={<Briefcase className="w-3.5 h-3.5 text-teal-700" />}
          iconBackground="bg-teal-50"
          label="Active Jobs"
          value={String(jobs.length)}
          detail="From Indeed & LinkedIn"
        />
        <MetricCard
          icon={<Building2 className="w-3.5 h-3.5 text-violet-700" />}
          iconBackground="bg-violet-50"
          label="Top Sector"
          value={topSector.name}
          detail={`${topSector.count} open positions — click to filter`}
          onClick={() => onFilterByIndustry?.(activeIndustry === topSector.name ? "" : topSector.name)}
          isActive={activeIndustry === topSector.name}
        />
        <MetricCard
          icon={<GraduationCap className="w-3.5 h-3.5 text-emerald-700" />}
          iconBackground="bg-emerald-50"
          label="Entry Level"
          value={`${entryLevelPercent}%`}
          detail="Click to show entry-level jobs"
          onClick={() => onFilterBySeniority?.("Entry level")}
        />
        <MetricCard
          icon={<Users className="w-3.5 h-3.5 text-amber-700" />}
          iconBackground="bg-amber-50"
          label="Avg Competition"
          value={String(averageApplicants)}
          detail="applicants per listing"
        />
      </div>

      {/* Row 2: Bar chart pair */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/50 bg-white p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">
            Hiring by Industry
            <span className="text-[10px] font-normal text-muted-foreground ml-1.5">click to filter</span>
          </p>
          <div className="space-y-0.5">
            {topIndustries.map(({ name, count }) => (
              <HorizontalBarRow
                key={name}
                name={name}
                count={count}
                maxCount={maxIndustryCount}
                barColor="bg-teal-500"
                activeColor="bg-teal-600"
                isActive={activeIndustry === name}
                onClick={() => onFilterByIndustry?.(activeIndustry === name ? "" : name)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-white p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">
            In-Demand Roles
            <span className="text-[10px] font-normal text-muted-foreground ml-1.5">click to filter</span>
          </p>
          <div className="space-y-0.5">
            {topTitleKeywords.map(({ name, count }) => (
              <HorizontalBarRow
                key={name}
                name={name}
                count={count}
                maxCount={maxTitleCount}
                barColor="bg-amber-400"
                activeColor="bg-amber-500"
                isActive={activeRole === name}
                onClick={() => onFilterByRole?.(activeRole === name ? "" : name)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketPulse;
