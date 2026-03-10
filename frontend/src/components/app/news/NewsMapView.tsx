import { ArrowLeft } from "lucide-react";
import { MapContainer, TileLayer } from "react-leaflet";
import "@/lib/leafletSetup";
import {
  MONTGOMERY_CENTER,
  SENTIMENT_LEGEND,
  NEWS_MAP_CATEGORIES,
  computeMisinfoScore,
} from "@/lib/newsMapUtils";
import { NewsMapCategoryBar } from "./NewsMapCategoryBar";
import { NewsMapMarker } from "./NewsMapMarker";
import type { NewsArticle } from "@/lib/types";

interface NewsMapViewProps {
  articles: NewsArticle[];
  flaggedArticleIds: string[];
  activeCategories: Set<string>;
  misinfoOnly: boolean;
  onToggleCategory: (id: string) => void;
  onToggleMisinfoOnly: () => void;
  onBack: () => void;
  onSelectArticle: (article: NewsArticle) => void;
}

export function NewsMapView({
  articles,
  flaggedArticleIds,
  activeCategories,
  misinfoOnly,
  onToggleCategory,
  onToggleMisinfoOnly,
  onBack,
  onSelectArticle,
}: NewsMapViewProps) {

  function isMisinfoArticle(a: (typeof articles)[0]) {
    return flaggedArticleIds.includes(a.id) || (a.misinfoRisk != null && a.misinfoRisk > 30);
  }

  const visibleArticles = articles.filter((a) => {
    if (!activeCategories.has(a.category)) return false;
    if (misinfoOnly && !isMisinfoArticle(a)) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border/30 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </button>
          <span className="text-muted-foreground/40">|</span>
          <h1 className="text-base font-bold text-foreground">News Map</h1>
        </div>
        <span className="text-xs text-muted-foreground">
          {visibleArticles.length} article{visibleArticles.length !== 1 ? "s" : ""} shown
        </span>
      </div>

      {/* Category filter pills */}
      <NewsMapCategoryBar
        articles={articles}
        activeCategories={activeCategories}
        onToggle={onToggleCategory}
        misinfoOnly={misinfoOnly}
        onMisinfoToggle={onToggleMisinfoOnly}
        flaggedArticleIds={flaggedArticleIds}
      />

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        <MapContainer
          center={MONTGOMERY_CENTER}
          zoom={12}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {visibleArticles.map((article) => (
            <NewsMapMarker
              key={article.id}
              article={article}
              flaggedIds={flaggedArticleIds}
              onSelect={onSelectArticle}
            />
          ))}
        </MapContainer>

        {/* Sentiment + misinfo legend */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2.5 shadow-md z-[1000]">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Sentiment
          </p>
          <div className="flex flex-col gap-1.5">
            {SENTIMENT_LEGEND.map(({ key, label, color }) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1 border-t border-border/30 mt-0.5">
              <div className="w-3 h-3 rounded-full border-2 border-red-500/70 bg-red-200/50 animate-pulse" />
              <span className="text-[10px] text-muted-foreground">Misinformation</span>
            </div>
          </div>
        </div>

        {/* Category icon legend */}
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2.5 shadow-md z-[1000]">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Category
          </p>
          <div className="flex flex-col gap-1.5">
            {NEWS_MAP_CATEGORIES.map(({ id, label, symbol }) => (
              <div key={id} className="flex items-center gap-2">
                <span className="text-sm leading-none">{symbol}</span>
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
