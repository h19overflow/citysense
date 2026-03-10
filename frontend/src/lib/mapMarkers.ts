import L from "leaflet";
import type { ServiceCategory } from "./types";

const CATEGORY_SYMBOLS: Record<string, string> = {
  health: "✚",
  childcare: "👶",
  education: "🎓",
  community: "🏛",
  libraries: "📖",
  safety: "🔥",
  parks: "🌳",
  police: "🛡",
  jobs: "💼",
};

const CATEGORY_MARKER_COLORS: Record<string, string> = {
  health: "#E74C3C",
  childcare: "#F39C12",
  education: "#3498DB",
  community: "#2ECC71",
  libraries: "#9B59B6",
  safety: "#E67E22",
  parks: "#16A34A",
  police: "#475569",
  jobs: "#1e3a5f",
};

const iconCache = new Map<string, L.DivIcon>();

function buildMarkerHtml(color: string, symbol: string, size: number): string {
  return `<div style="
    width:${size}px;height:${size}px;border-radius:50%;
    background:${color};border:2.5px solid white;
    box-shadow:0 2px 6px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
    font-size:${Math.round(size * 0.45)}px;line-height:1;
  ">${symbol}</div>`;
}

export function createCategoryMarker(
  category: string,
  options?: { selected?: boolean; size?: number },
): L.DivIcon {
  const selected = options?.selected ?? false;
  const baseSize = options?.size ?? 28;
  const size = selected ? baseSize + 6 : baseSize;
  const cacheKey = `${category}-${size}-${selected}`;

  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const color = CATEGORY_MARKER_COLORS[category] ?? "#888";
  const symbol = CATEGORY_SYMBOLS[category] ?? "●";

  const icon = L.divIcon({
    className: "custom-symbol-marker",
    html: buildMarkerHtml(color, symbol, size),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  iconCache.set(cacheKey, icon);
  return icon;
}

export function getMarkerColor(category: string): string {
  return CATEGORY_MARKER_COLORS[category] ?? "#888";
}

export function getMarkerSymbol(category: string): string {
  return CATEGORY_SYMBOLS[category] ?? "●";
}
