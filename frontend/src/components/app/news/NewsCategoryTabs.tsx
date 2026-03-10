import type { NewsCategory } from "@/lib/types";

interface NewsCategoryTabsProps {
  activeCategory: NewsCategory;
  onCategoryChange: (category: NewsCategory) => void;
  articleCounts?: Record<string, number>;
}

const CATEGORY_LABELS: { value: NewsCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  { value: "development", label: "Development" },
  { value: "government", label: "Government" },
  { value: "community", label: "Community" },
  { value: "events", label: "Events" },
];

export function NewsCategoryTabs({
  activeCategory,
  onCategoryChange,
  articleCounts,
}: NewsCategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {CATEGORY_LABELS.map(({ value, label }) => {
        const isActive = activeCategory === value;
        const count = articleCounts?.[value];

        return (
          <button
            key={value}
            onClick={() => onCategoryChange(value)}
            className={[
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            ].join(" ")}
          >
            {label}
            {count !== undefined && (
              <span
                className={[
                  "rounded-full px-1.5 py-0.5 text-xs",
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
