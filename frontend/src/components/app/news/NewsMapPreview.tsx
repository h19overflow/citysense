import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import { useEffect } from "react";
import { MapPin } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { filterGeolocatedArticles, getSentimentColor } from "@/lib/newsMapMarkers";
import { filterArticlesByMapCategory } from "@/lib/newsMapUtils";
import "@/lib/leafletSetup";

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];

function DisableInteractions() {
  const map = useMap();
  useEffect(() => {
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    if (map.tap) map.tap.disable();
  }, [map]);
  return null;
}

interface NewsMapPreviewProps {
  onShowMap: () => void;
}

export function NewsMapPreview({ onShowMap }: NewsMapPreviewProps) {
  const { state } = useApp();
  const afterCategory = filterArticlesByMapCategory(state.newsArticles, state.newsCategory);
  const geoArticles = filterGeolocatedArticles(afterCategory);

  if (geoArticles.length === 0) return null;

  return (
    <button
      onClick={onShowMap}
      className="relative w-full h-[160px] rounded-2xl overflow-hidden group cursor-pointer border border-border/30"
      aria-label="Open news map"
    >
      <MapContainer
        center={MONTGOMERY_CENTER}
        zoom={12}
        className="h-full w-full pointer-events-none"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <DisableInteractions />
        {geoArticles.map((article) => (
          <CircleMarker
            key={article.id}
            center={[article.location!.lat, article.location!.lng]}
            radius={5}
            pathOptions={{
              fillColor: getSentimentColor(article.sentiment ?? "neutral"),
              fillOpacity: 0.85,
              stroke: true,
              color: "#fff",
              weight: 1.5,
            }}
          />
        ))}
      </MapContainer>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-[hsl(var(--secondary))]/0 group-hover:bg-[hsl(var(--secondary))]/40 transition-colors duration-300 flex items-center justify-center">
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-card/95 shadow-lg text-sm font-semibold text-secondary opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <MapPin className="w-4 h-4" />
          Explore news map
        </div>
      </div>

      {/* Article count badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/90 backdrop-blur-sm shadow-sm text-xs font-medium text-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--amber-gold))]" />
        {geoArticles.length} stories on map
      </div>

      {/* Sentiment legend */}
      <div className="absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-card/90 backdrop-blur-sm shadow-sm text-[10px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Positive
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          Neutral
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Negative
        </span>
      </div>

    </button>
  );
}
