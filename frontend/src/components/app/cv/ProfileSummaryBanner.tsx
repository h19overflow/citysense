import { Sparkles, Briefcase, GraduationCap, Star } from "lucide-react";
import type { CVAnalysisResult } from "@/lib/types";

interface ProfileSummaryBannerProps {
  result: CVAnalysisResult;
}

function QuickStat({ icon: Icon, value, label }: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <span className="text-xs font-bold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

const ProfileSummaryBanner = ({ result }: ProfileSummaryBannerProps) => {
  const totalSkills = result.skills.length + result.soft_skills.length + result.tools.length;

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-white to-secondary/5 px-5 py-4">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <QuickStat icon={Star} value={String(totalSkills)} label="skills" />
        <QuickStat icon={Briefcase} value={String(result.experience.length)} label="roles" />
        <QuickStat icon={GraduationCap} value={String(result.education.length)} label="degrees" />
        <QuickStat icon={Sparkles} value={String(result.page_count)} label="pages analyzed" />
      </div>

      {result.summary && (
        <div className="bg-amber-gold/5 border-l-2 border-amber-gold pl-3 pr-2 py-2 rounded-r-md">
          <p className="text-sm text-foreground/80 italic leading-relaxed">{result.summary}</p>
        </div>
      )}
    </div>
  );
};

export default ProfileSummaryBanner;
