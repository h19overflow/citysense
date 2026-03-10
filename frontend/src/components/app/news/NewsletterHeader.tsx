import { Search, ShieldAlert } from "lucide-react";
import { NewsCategoryTabs } from "./NewsCategoryTabs";
import type { NewsCategory } from "@/lib/types";
import type { SortMode } from "./newsletterHelpers";

interface NewsletterHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortMode: SortMode;
  onSortChange: (m: SortMode) => void;
  newsCategory: NewsCategory;
  onCategoryChange: (c: NewsCategory) => void;
  articleCounts: Record<string, number>;
  showFlaggedOnly?: boolean;
  onFlaggedChange?: (flagged: boolean) => void;
}

export function NewsletterHeader({
  searchQuery,
  onSearchChange,
  sortMode,
  onSortChange,
  newsCategory,
  onCategoryChange,
  articleCounts,
  showFlaggedOnly,
  onFlaggedChange,
}: NewsletterHeaderProps) {
  return (
    <div className="shrink-0 border-b border-border/50 bg-white">
      {/* Masthead */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-px w-6 bg-[hsl(var(--amber-gold))]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--amber-gold))]">
                Montgomery, AL
              </span>
            </div>
            <h2 className="text-xl font-bold text-secondary tracking-tight">
              City Newsletter
            </h2>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 pb-3 flex items-center justify-between gap-3">
        <NewsCategoryTabs
          activeCategory={newsCategory}
          onCategoryChange={onCategoryChange}
          articleCounts={articleCounts}
        />
        <div className="flex items-center gap-2 shrink-0">
          {onFlaggedChange && (
            <button
              onClick={() => onFlaggedChange(!showFlaggedOnly)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                showFlaggedOnly
                  ? "bg-orange-100 text-orange-800 ring-1 ring-orange-300"
                  : "text-muted-foreground hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              Misinfo
            </button>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-border/50 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary/40 w-36"
            />
          </div>
          <select
            value={sortMode}
            onChange={(e) => onSortChange(e.target.value as SortMode)}
            className="text-xs border border-border/50 rounded-lg px-2 py-1.5 bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="most_liked">Popular</option>
            <option value="most_comments">Most Discussed</option>
          </select>
        </div>
      </div>
    </div>
  );
}
