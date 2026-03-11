import { Briefcase } from "lucide-react";
import type { ExperienceEntry } from "@/lib/types";

interface ExperienceCardProps {
  experience: ExperienceEntry[];
}

function ExperienceRow({ entry, isLast }: { entry: ExperienceEntry; isLast: boolean }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-foreground">{entry.role}</p>
        <span className="inline-block px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-xs border border-secondary/20 shrink-0">
          {entry.duration}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{entry.company}</p>
      {entry.description && (
        <p className="text-sm text-foreground/80 leading-relaxed">{entry.description}</p>
      )}
      {!isLast && <div className="border-t border-border/50 mt-4" />}
    </div>
  );
}

const ExperienceCard = ({ experience }: ExperienceCardProps) => (
  <div className="rounded-xl border border-border/50 bg-white px-5 py-4">
    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
      <Briefcase className="w-4 h-4 text-primary" />
      Work Experience
    </h3>
    <div className="space-y-4">
      {experience.map((entry, index) => (
        <ExperienceRow
          key={`${entry.company}-${entry.role}`}
          entry={entry}
          isLast={index === experience.length - 1}
        />
      ))}
    </div>
  </div>
);

export default ExperienceCard;
