import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { NewsArticle, ReactionType } from "@/lib/types";
import { getCategoryEmoji, getSentimentColor, isHighMisinfoRisk } from "@/lib/newsMapUtils";
import { NewsPopupCard } from "./NewsPopupCard";
import "./news-map.css";

interface NewsMapMarkerProps {
  article: NewsArticle;
  reactionCounts: Record<ReactionType, number>;
  userReaction: ReactionType | undefined;
  onReact: (articleId: string, reaction: ReactionType) => void;
}

function buildMarkerIcon(article: NewsArticle): L.DivIcon {
  const emoji = getCategoryEmoji(article.category);
  const borderColor = getSentimentColor(article.sentiment ?? "neutral");
  const hasMisinfo = isHighMisinfoRisk(article);

  const pulseRing = hasMisinfo
    ? `<div class="news-map-pulse-ring"></div>`
    : "";

  return L.divIcon({
    className: "news-map-marker-wrapper",
    html: `
      <div class="news-map-marker" style="border-color: ${borderColor}">
        ${emoji}
        ${pulseRing}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

export function NewsMapMarker({ article, reactionCounts, userReaction, onReact }: NewsMapMarkerProps) {
  if (!article.location) return null;

  return (
    <Marker
      position={[article.location.lat, article.location.lng]}
      icon={buildMarkerIcon(article)}
    >
      <Popup maxWidth={300} minWidth={260} className="news-map-popup">
        <NewsPopupCard
          article={article}
          reactionCounts={reactionCounts}
          userReaction={userReaction}
          onReact={onReact}
        />
      </Popup>
    </Marker>
  );
}
