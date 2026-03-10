import { Briefcase } from "lucide-react";
import type { CvData } from "@/lib/types";

interface ExperienceCardProps {
  experience: CvData["experience"];
}

const ExperienceEntry = ({
  entry,
  isLast,
}: {
  entry: CvData["experience"][number];
  isLast: boolean;
}) => (
  <div>
    <div className="flex items-start justify-between gap-2 mb-1">
      <div>
        <p className="text-sm font-semibold text-foreground">{entry.company}</p>
        <p className="text-xs text-muted-foreground">{entry.location}</p>
      </div>
    </div>
    <div className="flex items-center gap-2 mb-2">
      <p className="text-sm text-foreground">{entry.title}</p>
      <span className="text-xs text-muted-foreground">·</span>
      <p className="text-xs text-muted-foreground">{entry.period}</p>
      <span className="inline-block px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-xs border border-secondary/20">
        {entry.duration}
      </span>
    </div>
    <ul className="space-y-1">
      {entry.bullets.map((bullet) => (
        <li key={bullet} className="text-sm text-foreground/80 flex gap-2">
          <span className="text-primary mt-1 shrink-0">·</span>
          {bullet}
        </li>
      ))}
    </ul>
    {!isLast && <div className="border-t border-border/50 mt-4" />}
  </div>
);

const ExperienceCard = ({ experience }: ExperienceCardProps) => (
  <div className="rounded-xl border border-border/50 bg-white px-5 py-4">
    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
      <Briefcase className="w-4 h-4 text-primary" />
      Work Experience
    </h3>
    <div className="space-y-4">
      {experience.map((entry, index) => (
        <ExperienceEntry
          key={`${entry.company}-${entry.period}`}
          entry={entry}
          isLast={index === experience.length - 1}
        />
      ))}
    </div>
  </div>
);

export default ExperienceCard;
