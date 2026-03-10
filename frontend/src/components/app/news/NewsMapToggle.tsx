import { Newspaper } from "lucide-react";

interface NewsMapToggleProps {
  active: boolean;
  onToggle: () => void;
  articleCount: number;
}

export function NewsMapToggle({ active, onToggle, articleCount }: NewsMapToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-sm ${
        active
          ? "bg-amber-500 text-white shadow-amber-500/25"
          : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
      }`}
    >
      <Newspaper className="w-3.5 h-3.5" />
      {active ? "✕ Hide" : "📰"} What's Happening
      {articleCount > 0 && (
        <span className={`text-[10px] ${active ? "opacity-80" : "opacity-60"}`}>
          ({articleCount})
        </span>
      )}
    </button>
  );
}
