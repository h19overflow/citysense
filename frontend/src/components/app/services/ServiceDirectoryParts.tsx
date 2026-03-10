/**
 * Barrel re-export for service directory components.
 * Individual components live in ./directory/
 */
export { DirectoryHero } from "./directory/DirectoryHero";
export { CategoryCard } from "./directory/CategoryCard";
export { HelpPromptCard } from "./directory/HelpPromptCard";
export { MiniMapPreview } from "./directory/MiniMapPreview";

import { Search } from "lucide-react";
import type { ServiceCategory } from "@/lib/types";

export function DirectorySearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search services, locations, or benefits..."
        className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/50 bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
      />
    </div>
  );
}

/** No longer used — kept for backward compat */
export function SituationCards({ onSelectCategory }: { onSelectCategory: (c: ServiceCategory) => void }) {
  return null;
}
