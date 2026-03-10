import type { ServiceCategory, ServicePoint } from "@/lib/types";
import { MAP_CATEGORIES } from "../serviceCategoryMeta";

interface CategoryFilterBarProps {
  activeCategories: Set<ServiceCategory>;
  servicePoints: ServicePoint[];
  onToggleCategory: (id: ServiceCategory) => void;
}

export function CategoryFilterBar({
  activeCategories,
  servicePoints,
  onToggleCategory,
}: CategoryFilterBarProps) {
  return (
    <div className="shrink-0 flex flex-wrap gap-2 px-6 py-3 border-b border-border/20">
      {MAP_CATEGORIES.map(({ id, label, icon: Icon, color }) => {
        const active = activeCategories.has(id);
        const count = servicePoints.filter((p) => p.category === id).length;
        return (
          <button
            key={id}
            onClick={() => onToggleCategory(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
              active ? color : "bg-muted/30 text-muted-foreground border-transparent opacity-50"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {count > 0 && <span className="text-[10px] opacity-70">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
