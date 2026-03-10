import type { ServiceCategory } from "@/lib/types";
import type { ServiceGuide } from "@/lib/govServices";
import type { CategoryCardConfig } from "./serviceCategories";
import { SituationCards, CategoryCard } from "./ServiceDirectoryParts";
import ServiceGuideCards from "./ServiceGuideCards";

export function ServicesTabContent({
  visibleCategories,
  searchQuery,
  countLocations,
  onSelectCategory,
}: {
  visibleCategories: CategoryCardConfig[];
  searchQuery: string;
  countLocations: (id: ServiceCategory) => number;
  onSelectCategory: (category: ServiceCategory) => void;
}) {
  return (
    <>
      <div className="px-8 pb-4">
        <SituationCards onSelectCategory={onSelectCategory} />
      </div>
      <div className="px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleCategories.map((cat) => (
            <CategoryCard
              key={cat.id}
              config={cat}
              locationCount={countLocations(cat.id)}
              onSelect={() => onSelectCategory(cat.id)}
            />
          ))}
          {visibleCategories.length === 0 && (
            <p className="col-span-2 py-8 text-center text-sm text-muted-foreground">
              No services match &ldquo;{searchQuery}&rdquo;.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export function BenefitsTabContent({
  guides,
  searchQuery,
  onNavigateToChat,
}: {
  guides: ServiceGuide[];
  searchQuery: string;
  onNavigateToChat: (message: string) => void;
}) {
  if (guides.length === 0) {
    return (
      <div className="px-8 pb-8">
        <p className="py-8 text-center text-sm text-muted-foreground">
          {searchQuery ? `No benefits match "${searchQuery}".` : "Loading benefit programs..."}
        </p>
      </div>
    );
  }

  return (
    <div className="px-8 pb-8">
      <ServiceGuideCards guides={guides} onNavigateToChat={onNavigateToChat} />
    </div>
  );
}
