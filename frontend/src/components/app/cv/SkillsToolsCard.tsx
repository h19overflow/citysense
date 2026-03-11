import { Wrench, Lightbulb, Users } from "lucide-react";

interface SkillsToolsCardProps {
  skills: string[];
  softSkills: string[];
  tools: string[];
}

const CHIP_STYLES = {
  skills: "bg-primary/10 text-primary border-primary/20",
  softSkills: "bg-secondary/10 text-secondary border-secondary/20",
  tools: "bg-amber-gold/10 text-amber-gold border-amber-gold/20",
} as const;

function ChipSection({ icon: Icon, label, items, chipStyle }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  items: string[];
  chipStyle: string;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={`px-3 py-1 rounded-full text-sm border ${chipStyle}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

const SkillsToolsCard = ({ skills, softSkills, tools }: SkillsToolsCardProps) => (
  <div className="rounded-xl border border-border/50 bg-white px-5 py-4 space-y-4">
    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
      <Wrench className="w-4 h-4 text-primary" />
      Skills & Tools
    </h3>
    <ChipSection icon={Lightbulb} label="Technical Skills" items={skills} chipStyle={CHIP_STYLES.skills} />
    <ChipSection icon={Users} label="Soft Skills" items={softSkills} chipStyle={CHIP_STYLES.softSkills} />
    <ChipSection icon={Wrench} label="Tools" items={tools} chipStyle={CHIP_STYLES.tools} />
  </div>
);

export default SkillsToolsCard;
