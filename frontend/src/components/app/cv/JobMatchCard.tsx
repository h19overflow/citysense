import { memo, useState } from "react";
import type { JobMatch } from "@/lib/types";
import { JobMatchCardHeader } from "./JobMatchCardHeader";
import { JobMatchCardDetail } from "./JobMatchCardDetail";

interface JobMatchCardProps {
  job: JobMatch;
  showMatch?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const JobMatchCard = memo(({ job, showMatch = false, isExpanded = false, onToggleExpand }: JobMatchCardProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const topSkills = job.skillSummary ? job.skillSummary.split(", ").slice(0, 3) : [];

  return (
    <div
      className={`rounded-xl border bg-white transition-all relative ${
        isExpanded ? "border-primary/30 shadow-md" : "border-border/50 hover:shadow-md"
      }`}
      onMouseEnter={() => { if (!isExpanded) setShowTooltip(true); }}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {showTooltip && !isExpanded && topSkills.length > 0 && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-20 pointer-events-none">
          <div className="bg-foreground text-white rounded-lg px-3 py-2 text-[10px] shadow-lg max-w-56">
            <div className="flex items-center gap-2 mb-1">
              {job.salary && <span className="font-bold">{job.salary}</span>}
              {showMatch && <span className="font-bold">{job.matchPercent}% match</span>}
            </div>
            <div className="flex flex-wrap gap-1">
              {topSkills.map((s) => (
                <span key={s} className="px-1.5 py-0.5 bg-white/20 rounded text-[9px]">{s}</span>
              ))}
            </div>
          </div>
          <div className="w-2 h-2 bg-foreground rotate-45 mx-auto -mt-1" />
        </div>
      )}

      <JobMatchCardHeader
        job={job}
        showMatch={showMatch}
        isExpanded={isExpanded}
        onToggleExpand={() => { setShowTooltip(false); onToggleExpand?.(); }}
      />

      {isExpanded && <JobMatchCardDetail job={job} showMatch={showMatch} />}
    </div>
  );
});

export default JobMatchCard;
