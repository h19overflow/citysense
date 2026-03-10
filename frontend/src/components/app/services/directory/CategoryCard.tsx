import { ArrowRight, MapPin } from "lucide-react";
import type { CategoryCardConfig } from "../serviceCategories";

export function CategoryCard({
  config,
  locationCount,
  onSelect,
}: {
  config: CategoryCardConfig;
  locationCount: number;
  onSelect: () => void;
}) {
  const { icon: Icon, label, description, accent, iconBg, iconColor } = config;
  return (
    <button
      onClick={onSelect}
      className="group relative rounded-2xl bg-card border border-border/40 text-left transition-all duration-200 hover:shadow-lg hover:border-border/60 hover:-translate-y-0.5 overflow-hidden magnolia-bg"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent} rounded-l-2xl`} />

      <div className="pl-5 pr-5 py-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center ring-1 ring-black/[0.04]`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-[hsl(var(--amber-gold))] group-hover:translate-x-0.5 transition-all duration-200 mt-1" />
        </div>

        <h3 className="text-[15px] font-semibold text-secondary mb-1 group-hover:text-primary transition-colors">
          {label}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {description}
        </p>

        {locationCount > 0 && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30">
            <MapPin className="w-3 h-3 text-[hsl(var(--amber-gold))]" />
            <span className="text-xs font-medium text-muted-foreground">
              {locationCount} location{locationCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
