import {
  User,
  Briefcase,
  Star,
  RefreshCw,
} from "lucide-react";
import { useApp } from "@/lib/appContext";

const CitizenProfileBar = () => {
  const { state, dispatch } = useApp();
  const cv = state.cvData;

  if (!cv) return null;

  const matchedJobs = state.jobMatches.filter((m) => m.matchPercent >= 40).length;
  const totalJobs = state.jobListings.length;

  return (
    <div className="flex items-center gap-4 px-5 py-3 bg-white border-b border-border/50">
      {/* Avatar + identity */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">{cv.name}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {cv.experience[0]?.title ?? "Job Seeker"}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-border/50 shrink-0" />

      {/* Quick stats */}
      <div className="flex items-center gap-4 text-xs">
        <ProfileStat icon={Star} label="Skills" value={String(cv.skills.length)} />
        <ProfileStat icon={Briefcase} label="Experience" value={`${cv.experience.length} roles`} />
        <ProfileStat
          icon={Briefcase}
          label="Matches"
          value={`${matchedJobs}/${totalJobs}`}
          highlight
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Re-upload */}
      <button
        onClick={() => dispatch({ type: "CLEAR_CV" })}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border/50 rounded-lg hover:bg-muted/50 transition-colors shrink-0"
      >
        <RefreshCw className="w-3 h-3" />
        Re-upload CV
      </button>
    </div>
  );
};

function ProfileStat({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`w-3.5 h-3.5 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
      <div>
        <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
        <p className={`text-xs font-bold leading-tight ${highlight ? "text-primary" : "text-foreground"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

export default CitizenProfileBar;
