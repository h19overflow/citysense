import { useState } from "react";
import { HelpCircle, X, MessageSquare, BarChart3, MapPin, Sparkles } from "lucide-react";

const TIPS = [
  { icon: MessageSquare, text: "Click any item to ask the AI Analyst for more details" },
  { icon: Sparkles, text: "Run AI Analysis to generate insights from articles and comments" },
  { icon: BarChart3, text: "Expand sections for detailed charts and breakdowns" },
  { icon: MapPin, text: "Use View Map to see news stories on the city map" },
];

const DISMISSED_KEY = "admin-onboarding-dismissed";

export function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "true");

  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, "true");
  }

  return (
    <div className="rounded-xl border border-[hsl(var(--amber-gold))]/20 bg-[hsl(var(--amber-gold))]/5 px-4 py-3 space-y-2 magnolia-bg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[hsl(var(--amber-gold))]" />
          <span className="text-sm font-semibold text-secondary">Quick Tips</span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Dismiss tips"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TIPS.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-start gap-2">
            <Icon className="w-3.5 h-3.5 text-[hsl(var(--amber-gold))] mt-0.5 shrink-0" />
            <span className="text-xs text-muted-foreground leading-snug">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
