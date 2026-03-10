import { ArrowLeft, ShieldAlert } from "lucide-react";
import type { NewsCategory } from "@/lib/types";
import { CATEGORY_META } from "@/lib/newsMapUtils";

interface NewsMapCategoryBarProps {
  activeCategory: NewsCategory;
  onCategoryChange: (category: NewsCategory) => void;
  showMisinfoOnly: boolean;
  onMisinfoToggle: () => void;
  onBack?: () => void;
}

export function NewsMapCategoryBar({
  activeCategory,
  onCategoryChange,
  showMisinfoOnly,
  onMisinfoToggle,
  onBack,
}: NewsMapCategoryBarProps) {
  return (
    <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 bg-card/95 backdrop-blur rounded-xl px-2 py-1.5 shadow-lg border border-border/50">
      {onBack && (
        <>
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-secondary hover:bg-muted/60 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Feed
          </button>
          <div className="w-px h-5 bg-border mx-0.5" />
        </>
      )}
      {CATEGORY_META.map(({ key, label, emoji }) => (
        <button
          key={key}
          onClick={() => onCategoryChange(key)}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
            activeCategory === key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/60"
          }`}
        >
          <span>{emoji}</span>
          {label}
        </button>
      ))}

      <div className="w-px h-5 bg-border mx-0.5" />

      <button
        onClick={onMisinfoToggle}
        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
          showMisinfoOnly
            ? "bg-red-100 text-red-800 ring-1 ring-red-300"
            : "text-muted-foreground hover:bg-red-50 hover:text-red-600"
        }`}
      >
        <ShieldAlert className="w-3 h-3" />
        Misinfo
      </button>
    </div>
  );
}
