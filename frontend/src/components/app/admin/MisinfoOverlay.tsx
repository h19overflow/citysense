import { CircleMarker, Popup } from "react-leaflet";
import { useApp } from "@/lib/appContext";
import { filterGeolocatedArticles } from "@/lib/newsMapMarkers";
import { formatRelativeTime } from "@/lib/newsService";
import type { NewsArticle } from "@/lib/types";

interface MisinfoOverlayProps {
  onAskAI?: (question: string) => void;
}

function getRiskLabel(risk: number): string {
  if (risk > 60) return "High";
  if (risk > 30) return "Medium";
  return "Low";
}

function getRiskColor(risk: number): string {
  if (risk > 60) return "#dc2626";
  if (risk > 30) return "#ea580c";
  return "#16a34a";
}

function isMisinfoRelevant(article: NewsArticle): boolean {
  return (article.misinfoRisk ?? 0) > 30 || (article.flagCount ?? 0) > 0;
}

function MisinfoPopup({ article, onAskAI }: { article: NewsArticle; onAskAI?: (q: string) => void }) {
  const risk = article.misinfoRisk ?? 0;
  const flags = article.flagCount ?? 0;
  const color = getRiskColor(risk);

  return (
    <div style={{ minWidth: 220, maxWidth: 280, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color }}>
          {risk}
        </span>
        <span style={{ fontSize: 11, color: "#666" }}>/ 100 misinfo risk</span>
        <span style={{
          marginLeft: "auto", fontSize: 10, fontWeight: 600,
          padding: "2px 6px", borderRadius: 4,
          background: `${color}18`, color,
          textTransform: "uppercase",
        }}>
          {getRiskLabel(risk)}
        </span>
      </div>

      {flags > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 4, marginBottom: 6,
          padding: "4px 8px", borderRadius: 6,
          background: "#fef2f2", border: "1px solid #fecaca",
          fontSize: 11, fontWeight: 600, color: "#dc2626",
        }}>
          🚩 Flagged by {flags} citizen{flags !== 1 ? "s" : ""}
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, lineHeight: 1.3 }}>
        {article.title}
      </div>

      <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>
        {article.source} · {formatRelativeTime(article.publishedAt)}
        {article.location?.neighborhood && ` · ${article.location.neighborhood}`}
      </div>

      {article.misinfoReason && (
        <div style={{ fontSize: 11, color: "#444", lineHeight: 1.4, marginBottom: 6 }}>
          {article.misinfoReason}
        </div>
      )}

      {onAskAI && (
        <button
          onClick={() => onAskAI(
            `Analyze the misinformation risk for the article "${article.title}" from ${article.source}. ` +
            `It has a risk score of ${risk}/100. ` +
            (flags > 0 ? `${flags} citizen(s) have flagged this article. ` : "") +
            `Reason: ${article.misinfoReason ?? "unknown"}. ` +
            `What should we communicate to residents about this?`
          )}
          style={{
            width: "100%", padding: "6px 10px", fontSize: 11, fontWeight: 600,
            background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca",
            borderRadius: 6, cursor: "pointer",
          }}
        >
          Ask AI Analyst
        </button>
      )}
    </div>
  );
}

export function MisinfoOverlay({ onAskAI }: MisinfoOverlayProps) {
  const { state } = useApp();

  const misinfoArticles = filterGeolocatedArticles(state.newsArticles)
    .filter(isMisinfoRelevant);

  if (misinfoArticles.length === 0) return null;

  return (
    <>
      {misinfoArticles.map((article) => {
        const risk = article.misinfoRisk ?? 0;
        const flags = article.flagCount ?? 0;
        // Citizen flags boost the effective risk for visual sizing
        const effectiveRisk = Math.min(risk + flags * 10, 100);
        const color = getRiskColor(effectiveRisk);
        const radius = effectiveRisk > 60 ? 22 : 16;

        return (
          <CircleMarker
            key={`misinfo-${article.id}`}
            center={[article.location!.lat, article.location!.lng]}
            radius={radius}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.25,
              color,
              weight: 2,
              opacity: 0.8,
              dashArray: "4 4",
            }}
          >
            <Popup maxWidth={280}>
              <MisinfoPopup article={article} onAskAI={onAskAI} />
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
