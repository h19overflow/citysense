import type { CvData } from "@/lib/types";
import PersonalInfoCard from "./PersonalInfoCard";
import ExperienceCard from "./ExperienceCard";
import EducationCard from "./EducationCard";
import SkillBadges from "./SkillBadges";
import CvSummaryCard from "./CvSummaryCard";

interface CvAnalysisResultsProps {
  data: CvData;
}

const CvAnalysisResults = ({ data }: CvAnalysisResultsProps) => (
  <div className="space-y-4 p-4">
    <PersonalInfoCard data={data} />
    <ExperienceCard experience={data.experience} />
    <EducationCard education={data.education} />
    <SkillBadges skills={data.skills} />
    <CvSummaryCard summary={data.summary} />
  </div>
);

export default CvAnalysisResults;
