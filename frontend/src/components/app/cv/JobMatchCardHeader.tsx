import { Briefcase, MapPin, Clock, ChevronDown, ChevronUp } from "lucide-react";
import type { JobMatch } from "@/lib/types";

const SOURCE_ICONS: Record<string, string> = {
  indeed: "🔵",
  linkedin: "🟦",
};

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function matchColor(percent: number): string {
  if (percent >= 70) return "text-pine-green bg-pine-green/10 border-pine-green/30";
  if (percent >= 40) return "text-amber-gold bg-amber-gold/10 border-amber-gold/30";
  return "text-muted-foreground bg-muted/50 border-border";
}

interface JobMatchCardHeaderProps {
  job: JobMatch;
  showMatch: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function JobMatchCardHeader({ job, showMatch, isExpanded, onToggleExpand }: JobMatchCardHeaderProps) {
  const posted = formatTimeAgo(job.posted);

  return (
    <button onClick={onToggleExpand} className="w-full text-left p-4 pb-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm">
            {SOURCE_ICONS[job.source] ?? <Briefcase className="w-4 h-4 text-primary" />}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-foreground leading-tight">{job.title}</h4>
            <p className="text-xs text-muted-foreground">{job.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showMatch && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${matchColor(job.matchPercent)}`}>
              {job.matchPercent}%
            </span>
          )}
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          }
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
        {job.salary && <span className="font-semibold text-foreground">{job.salary}</span>}
        {job.jobType && <span className="px-1.5 py-0.5 bg-muted/50 rounded text-[10px]">{job.jobType}</span>}
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {job.address || "Montgomery, AL"}
        </span>
        {posted && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {posted}
          </span>
        )}
      </div>
    </button>
  );
}
