import { MapPin } from "lucide-react";
import { MiniMapPreview } from "./MiniMapPreview";

export function DirectoryHero({ onShowMap }: { onShowMap: () => void }) {
  return (
    <div className="px-6 pt-6 pb-5">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 max-w-[32px] bg-[hsl(var(--amber-gold))]" />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--amber-gold))]">
              Montgomery, Alabama
            </p>
          </div>
          <h1 className="text-2xl font-bold text-secondary leading-tight tracking-tight">
            City Services
          </h1>
          <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed max-w-md">
            Healthcare, childcare, job training, and more — with locations,
            eligibility details, and step-by-step guides.
          </p>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-1.5">
          <div className="h-[200px] lg:h-[220px] rounded-2xl overflow-hidden border border-border/40 shadow-sm">
            <MiniMapPreview onShowMap={onShowMap} />
          </div>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70 font-medium">
            <MapPin className="w-3 h-3" />
            Tap the map to explore all service locations
          </p>
        </div>
      </div>
    </div>
  );
}
