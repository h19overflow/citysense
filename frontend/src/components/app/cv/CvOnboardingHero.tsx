import {
  Target,
  CheckCircle,
  Sparkles,
  MapPin,
  GraduationCap,
} from "lucide-react";
import UploadZone from "./UploadZone";

const VALUE_PROPS = [
  { icon: Target, text: "Match scores for every job" },
  { icon: Sparkles, text: "Personalized skill gap analysis" },
  { icon: GraduationCap, text: "Training programs near you" },
  { icon: MapPin, text: "Commute time estimates" },
];

export default function CvOnboardingHero() {
  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-white to-secondary/5 p-6">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left: value proposition */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Unlock Your Career Match</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Upload your resume and we'll match you against every job in Montgomery,
            show your skill gaps, and recommend training programs.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {VALUE_PROPS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-pine-green shrink-0" />
                <span className="text-xs text-foreground font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: upload zone */}
        <div className="w-full md:w-[280px] shrink-0">
          <UploadZone compact />
        </div>
      </div>
    </div>
  );
}
