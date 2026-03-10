import type { JobMatch } from "@/lib/types";
import JobMatchCard from "../JobMatchCard";

interface JobResultsListProps {
  jobs: JobMatch[];
  hasCv: boolean;
  expandedJobId: string | null;
  onToggleExpand: (jobId: string) => void;
  resultsRef: React.RefObject<HTMLDivElement>;
}

export function JobResultsList({
  jobs,
  hasCv,
  expandedJobId,
  onToggleExpand,
  resultsRef,
}: JobResultsListProps) {
  return (
    <>
      <div ref={resultsRef} className="flex items-center justify-between scroll-mt-4">
        <h3 className="text-sm font-semibold text-foreground">
          {hasCv ? "Jobs Ranked by Your Skill Match" : "All Montgomery Jobs"}
        </h3>
        <span className="text-xs text-muted-foreground">{jobs.length} results</span>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <JobMatchCard
            key={job.id}
            job={job}
            showMatch={hasCv}
            isExpanded={expandedJobId === job.id}
            onToggleExpand={() => onToggleExpand(job.id)}
          />
        ))}
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No jobs match your filters</p>
        </div>
      )}
    </>
  );
}
