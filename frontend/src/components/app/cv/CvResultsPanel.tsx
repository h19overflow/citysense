import { useEffect, useState } from "react";
import type { CVAnalysisResult } from "@/lib/types";
import ProfileSummaryBanner from "./ProfileSummaryBanner";
import ExperienceCard from "./ExperienceCard";
import EducationCard from "./EducationCard";
import SkillsToolsCard from "./SkillsToolsCard";
import RolesCard from "./RolesCard";

interface CvResultsPanelProps {
  result: CVAnalysisResult;
}

function AnimatedCard({ index, children }: { index: number; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 150);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={`transition-all duration-500 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {children}
    </div>
  );
}

const CvResultsPanel = ({ result }: CvResultsPanelProps) => {
  const cards = [
    <ProfileSummaryBanner key="summary" result={result} />,
    result.experience.length > 0 && (
      <ExperienceCard key="experience" experience={result.experience} />
    ),
    result.education.length > 0 && (
      <EducationCard key="education" education={result.education} />
    ),
    (result.skills.length > 0 || result.soft_skills.length > 0 || result.tools.length > 0) && (
      <SkillsToolsCard
        key="skills"
        skills={result.skills}
        softSkills={result.soft_skills}
        tools={result.tools}
      />
    ),
    result.roles.length > 0 && <RolesCard key="roles" roles={result.roles} />,
  ].filter(Boolean);

  return (
    <div className="space-y-4 p-4">
      {cards.map((card, index) => (
        <AnimatedCard key={index} index={index}>
          {card}
        </AnimatedCard>
      ))}
    </div>
  );
};

export default CvResultsPanel;
