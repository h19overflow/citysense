import { Wrench } from "lucide-react";

interface SkillBadgesProps {
  skills: string[];
}

const SkillBadges = ({ skills }: SkillBadgesProps) => (
  <div className="rounded-xl border border-border/50 bg-white px-5 py-4">
    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
      <Wrench className="w-4 h-4 text-primary" />
      Skills
    </h3>
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <span
          key={skill}
          className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm border border-secondary/20"
        >
          {skill}
        </span>
      ))}
    </div>
  </div>
);

export default SkillBadges;
