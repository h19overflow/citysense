import { Search, ArrowUpDown, ShieldAlert } from "lucide-react";

type SortMode = "newest" | "oldest" | "most_liked" | "most_comments";
type SentimentFilter = "" | "positive" | "negative" | "neutral";

interface NewsFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  sourceFilter: string;
  onSourceChange: (source: string) => void;
  uniqueSources: string[];
  sentimentFilter: SentimentFilter;
  onSentimentChange: (filter: SentimentFilter) => void;
  showFlaggedOnly?: boolean;
  onFlaggedChange?: (flagged: boolean) => void;
}

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "most_liked", label: "Popular" },
  { key: "most_comments", label: "Most Discussed" },
];

const SENTIMENT_OPTIONS: { key: SentimentFilter; label: string; color: string; activeColor: string }[] = [
  { key: "", label: "All", color: "bg-white text-muted-foreground", activeColor: "bg-primary text-primary-foreground" },
  { key: "positive", label: "Positive", color: "bg-white text-emerald-700", activeColor: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300" },
  { key: "neutral", label: "Neutral", color: "bg-white text-gray-600", activeColor: "bg-gray-100 text-gray-800 ring-1 ring-gray-300" },
  { key: "negative", label: "Negative", color: "bg-white text-rose-700", activeColor: "bg-rose-100 text-rose-800 ring-1 ring-rose-300" },
];

export function NewsFilterBar({
  searchQuery, onSearchChange, sortMode, onSortChange,
  sourceFilter, onSourceChange, uniqueSources,
  sentimentFilter, onSentimentChange,
  showFlaggedOnly, onFlaggedChange,
}: NewsFilterBarProps) {
  return (
    <div className="space-y-2">
      {/* Row 1: Search + Sort + Source */}
      <div className="flex gap-2 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search articles, sources..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border/50 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Sort toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border/50 overflow-hidden">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground ml-2.5" />
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onSortChange(key)}
              className={`px-2.5 py-2 text-xs font-medium transition-colors ${
                sortMode === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-white text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Source dropdown */}
        <select
          value={sourceFilter}
          onChange={(e) => onSourceChange(e.target.value)}
          className="text-xs px-2.5 py-2 rounded-lg border border-border/50 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[120px]"
        >
          <option value="">All Sources</option>
          {uniqueSources.map((src) => (
            <option key={src} value={src}>{src}</option>
          ))}
        </select>
      </div>

      {/* Row 2: Sentiment filter pills + misinfo filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mr-1">Sentiment:</span>
        {SENTIMENT_OPTIONS.map(({ key, label, color, activeColor }) => (
          <button
            key={key}
            onClick={() => onSentimentChange(key)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
              sentimentFilter === key ? activeColor : `${color} hover:bg-muted/50`
            }`}
          >
            {label}
          </button>
        ))}

        {onFlaggedChange && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              onClick={() => onFlaggedChange(!showFlaggedOnly)}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                showFlaggedOnly
                  ? "bg-orange-100 text-orange-800 ring-1 ring-orange-300"
                  : "bg-white text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              Misinfo Risk
            </button>
          </>
        )}
      </div>
    </div>
  );
}
