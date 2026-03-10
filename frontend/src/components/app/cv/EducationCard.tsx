import { GraduationCap } from "lucide-react";
import type { CvData } from "@/lib/types";

interface EducationCardProps {
  education: CvData["education"];
}

const EducationCard = ({ education }: EducationCardProps) => (
  <div className="rounded-xl border border-border/50 bg-white px-5 py-4">
    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
      <GraduationCap className="w-4 h-4 text-primary" />
      Education
    </h3>
    <div className="space-y-3">
      {education.map((entry) => (
        <div key={`${entry.school}-${entry.year}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{entry.school}</p>
              <p className="text-xs text-muted-foreground">{entry.location}</p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{entry.year}</span>
          </div>
          <p className="text-sm text-foreground/80 mt-1">{entry.degree}</p>
        </div>
      ))}
    </div>
  </div>
);

export default EducationCard;
