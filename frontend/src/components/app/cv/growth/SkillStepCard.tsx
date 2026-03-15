import { ExternalLink, MessageSquare, BookOpen, Code, Users, FileText } from "lucide-react";
import type { SkillStep } from "@/lib/types";

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  course:        <BookOpen className="w-4 h-4" />,
  book:          <BookOpen className="w-4 h-4" />,
  project:       <Code className="w-4 h-4" />,
  community:     <Users className="w-4 h-4" />,
  documentation: <FileText className="w-4 h-4" />,
};

interface SkillStepCardProps {
  step: SkillStep;
  index: number;
  accentColor: string;
  onDiscuss: (context: string) => void;
}

const ACCENT_STYLES: Record<string, { bg: string; border: string; label: string }> = {
  blue:   { bg: "bg-blue-600",   border: "border-blue-300",   label: "text-blue-700" },
  amber:  { bg: "bg-amber-600",  border: "border-amber-300",  label: "text-amber-700" },
  violet: { bg: "bg-violet-600", border: "border-violet-300", label: "text-violet-700" },
};

function extractUrl(step: SkillStep): string | null {
  if (step.resource_url) return step.resource_url;
  // Detect if the resource text itself is or contains a URL
  const urlMatch = step.resource.match(/https?:\/\/[^\s)]+/);
  return urlMatch ? urlMatch[0] : null;
}

export function SkillStepCard({ step, index, accentColor, onDiscuss }: SkillStepCardProps) {
  const accent = ACCENT_STYLES[accentColor] ?? ACCENT_STYLES.blue;
  const accentBg = accent.bg;
  const borderClass = accent.border;
  const labelClass = accent.label;
  const linkUrl = extractUrl(step);

  return (
    <li className="flex gap-3 relative">
      <span className={`shrink-0 w-8 h-8 rounded-full ${accentBg} flex items-center justify-center text-sm font-bold text-white z-10`}>
        {index + 1}
      </span>
      <div className="min-w-0 flex-1 pb-1">
        <p className="text-base font-semibold text-foreground">{step.skill}</p>
        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{step.why}</p>

        {step.importance && (
          <div className={`mt-2 pl-3 border-l-2 ${borderClass}`}>
            <p className={`text-xs font-medium ${labelClass}`}>Why this matters</p>
            <p className="text-sm text-muted-foreground">{step.importance}</p>
          </div>
        )}

        {step.mindset && (
          <p className="mt-1.5 text-sm italic text-muted-foreground/80">
            Mindset: {step.mindset}
          </p>
        )}

        <div className="mt-2.5 flex items-center gap-3 p-2.5 rounded-lg border border-border/60 bg-muted/30">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            {RESOURCE_ICONS[step.resource_type]}
          </div>
          <div className="min-w-0 flex-1">
            {linkUrl ? (
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                {step.resource}
              </a>
            ) : (
              <p className="text-sm font-medium text-foreground">{step.resource}</p>
            )}
            <p className="text-xs text-muted-foreground capitalize">{step.resource_type}</p>
          </div>
          {linkUrl && (
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Open <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={() => onDiscuss(`step ${index + 1}: ${step.skill} — ${step.why}`)}
          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Discuss this step
        </button>
      </div>
    </li>
  );
}
