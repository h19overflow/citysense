import { ArrowRight } from "lucide-react";

export function HelpPromptCard({
  onNavigateToChat,
}: {
  onNavigateToChat: (msg: string) => void;
}) {
  return (
    <button
      onClick={() => onNavigateToChat("I need help finding the right services for my situation")}
      className="w-full relative rounded-2xl border border-[hsl(var(--amber-gold))]/20 bg-[hsl(var(--amber-gold))]/[0.04] p-5 text-left hover:border-[hsl(var(--amber-gold))]/40 hover:bg-[hsl(var(--amber-gold))]/[0.07] transition-all group magnolia-bg overflow-hidden"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(var(--amber-gold))] rounded-l-2xl" />

      <div className="pl-3">
        <p className="text-sm font-semibold text-secondary mb-0.5">Not sure where to start?</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Tell us your situation and we'll match you with the right services.
        </p>
        <div className="flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-[hsl(var(--amber-gold))] group-hover:gap-2.5 transition-all">
          Talk to a guide
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </button>
  );
}
