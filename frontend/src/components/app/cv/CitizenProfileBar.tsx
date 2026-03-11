import {
  Briefcase,
  Star,
  RefreshCw,
} from "lucide-react";
import { useApp } from "@/lib/appContext";

const CitizenProfileBar = () => {
  const { state, dispatch } = useApp();
  const cv = state.cvResult;

  if (!cv) return null;

  const matchedJobs = state.jobMatches.filter((m) => m.matchPercent >= 40).length;
  const totalJobs = state.jobListings.length;
  const totalSkills = cv.skills.length + cv.soft_skills.length + cv.tools.length;

  return (
    <div className="flex items-center gap-4 px-5 py-3 bg-white border-b border-border/50">
      <div className="flex items-center gap-4 text-xs">
        <ProfileStat icon={Star} label="Skills" value={String(totalSkills)} />
        <ProfileStat icon={Briefcase} label="Experience" value={`${cv.experience.length} roles`} />
        <ProfileStat
          icon={Briefcase}
          label="Matches"
          value={`${matchedJobs}/${totalJobs}`}
          highlight
        />
      </div>

      <div className="flex-1" />

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
