import L from "leaflet";
import type { NewsArticle } from "./types";

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#22c55e",
  neutral: "#eab308",
  negative: "#ef4444",
};

const newsIconCache = new Map<string, L.DivIcon>();

function buildCommunityRingHtml(communitySentiment: string): string {
  const color = SENTIMENT_COLORS[communitySentiment] ?? SENTIMENT_COLORS.neutral;
  return `<div style="
    position:absolute;bottom:-2px;right:-2px;
    width:12px;height:12px;border-radius:50%;
    background:${color};border:1.5px solid white;
    box-shadow:0 1px 3px rgba(0,0,0,0.3);
  "></div>`;
}

function buildNewsMarkerHtml(sentiment: string, communitySentiment: string | undefined, size: number): string {
  const color = SENTIMENT_COLORS[sentiment] ?? SENTIMENT_COLORS.neutral;
  const ring = communitySentiment ? buildCommunityRingHtml(communitySentiment) : "";
  return `<div style="
    position:relative;width:${size}px;height:${size}px;border-radius:50%;
    background:${color};border:2.5px solid white;
    box-shadow:0 2px 6px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
    font-size:${Math.round(size * 0.45)}px;line-height:1;
  ">📰${ring}</div>`;
}

export function createNewsMarker(sentiment: string = "neutral", communitySentiment?: string): L.DivIcon {
  const size = 30;
  const cacheKey = `news-${sentiment}-${communitySentiment ?? "none"}-${size}`;
  const cached = newsIconCache.get(cacheKey);
  if (cached) return cached;

  const icon = L.divIcon({
    className: "news-marker",
    html: buildNewsMarkerHtml(sentiment, communitySentiment, size),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  newsIconCache.set(cacheKey, icon);
  return icon;
}

export function buildClusterMarkerHtml(count: number, avgSentiment: string): string {
  const color = SENTIMENT_COLORS[avgSentiment] ?? SENTIMENT_COLORS.neutral;
  return `<div style="
    width:36px;height:36px;border-radius:50%;
    background:${color};border:2.5px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.4);
    display:flex;align-items:center;justify-content:center;
    font-size:13px;font-weight:700;color:white;line-height:1;
  ">${count}</div>`;
}

export function getSentimentColor(sentiment: string): string {
  return SENTIMENT_COLORS[sentiment] ?? SENTIMENT_COLORS.neutral;
}

export function filterGeolocatedArticles(articles: NewsArticle[]): NewsArticle[] {
  return articles.filter(
    (a) => a.location && !isNaN(a.location.lat) && !isNaN(a.location.lng),
  );
}

export function computeAverageSentiment(articles: NewsArticle[]): string {
  if (articles.length === 0) return "neutral";
  const scores = articles.map((a) => {
    if (a.sentiment === "positive") return 1;
    if (a.sentiment === "negative") return -1;
    return 0;
  });
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  if (avg > 0.3) return "positive";
  if (avg < -0.3) return "negative";
  return "neutral";
}
