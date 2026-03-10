import { ExternalLink, Building2, Star, DollarSign, Users } from "lucide-react";
import type { JobMatch } from "@/lib/types";

interface JobMatchCardDetailProps {
  job: JobMatch;
  showMatch: boolean;
}

export function JobMatchCardDetail({ job, showMatch }: JobMatchCardDetailProps) {
  return (
    <div className="px-4 pb-4 space-y-3 border-t border-border/20 pt-3">
      <div className="grid grid-cols-2 gap-2">
        {job.industry && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="w-3 h-3 shrink-0" />
            <span>{job.industry}</span>
          </div>
        )}
        {job.seniority && job.seniority !== "Not Applicable" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Star className="w-3 h-3 shrink-0" />
            <span>{job.seniority}</span>
          </div>
        )}
        {job.salary && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="w-3 h-3 shrink-0" />
            <span>{job.salary}</span>
          </div>
        )}
        {typeof job.applicants === "number" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="w-3 h-3 shrink-0" />
            <span>{job.applicants} applicants</span>
          </div>
        )}
      </div>

      {!showMatch && job.skillSummary && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Required Skills</p>
          <div className="flex flex-wrap gap-1">
            {job.skillSummary.split(", ").slice(0, 8).map((skill) => (
              <span key={skill} className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-medium border border-secondary/20">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {showMatch && job.matchedSkills.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-pine-green mb-1.5">Your matching skills</p>
          <div className="flex flex-wrap gap-1">
            {job.matchedSkills.map((skill) => (
              <span key={skill} className="px-2 py-0.5 rounded-full bg-pine-green/10 text-pine-green text-[10px] font-medium">{skill}</span>
            ))}
          </div>
        </div>
      )}

      {showMatch && job.missingSkills.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5">Skills to develop</p>
          <div className="flex flex-wrap gap-1">
            {job.missingSkills.map((skill) => (
              <span key={skill} className="px-2 py-0.5 rounded-full border border-primary/30 text-primary text-[10px] font-medium">{skill}</span>
            ))}
          </div>
        </div>
      )}

      {job.benefits.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Benefits</p>
          <div className="flex flex-wrap gap-1">
            {job.benefits.map((benefit) => (
              <span key={benefit} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                {benefit}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <a
          href={job.applyLink || job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-xs font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
        >
          Apply Now
          <ExternalLink className="w-3 h-3" />
        </a>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 border border-border rounded-lg py-2.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1.5"
        >
          Full Details
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
