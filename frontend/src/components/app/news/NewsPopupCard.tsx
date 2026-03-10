import { ExternalLink } from "lucide-react";
import type { NewsArticle, ReactionType } from "@/lib/types";
import { getSentimentColor } from "@/lib/newsMapMarkers";
import { formatRelativeTime } from "@/lib/newsService";

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "thumbs_up", emoji: "👍", label: "Like" },
  { type: "thumbs_down", emoji: "👎", label: "Dislike" },
  { type: "heart", emoji: "❤️", label: "Love" },
  { type: "sad", emoji: "😢", label: "Sad" },
  { type: "angry", emoji: "😡", label: "Angry" },
];

interface NewsPopupCardProps {
  article: NewsArticle;
  reactionCounts: Record<ReactionType, number>;
  userReaction: ReactionType | undefined;
  onReact: (articleId: string, reaction: ReactionType) => void;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const color = getSentimentColor(sentiment);
  const label = sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{ background: `${color}20`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function CommunitySentimentBadge({ article }: { article: NewsArticle }) {
  if (!article.communitySentiment) return null;
  const color = getSentimentColor(article.communitySentiment);
  const label = article.communitySentiment.charAt(0).toUpperCase() + article.communitySentiment.slice(1);
  const breakdown = article.sentimentBreakdown;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{ background: `${color}20`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      Community: {label}
      {breakdown && (
        <span className="text-[9px] opacity-70 ml-0.5">
          +{breakdown.positive ?? 0} ~{breakdown.neutral ?? 0} -{breakdown.negative ?? 0}
        </span>
      )}
    </span>
  );
}

export function NewsPopupCard({ article, reactionCounts, userReaction, onReact }: NewsPopupCardProps) {
  const totalReactions = Object.values(reactionCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="w-full max-w-[300px] font-sans overflow-hidden">
      {article.imageUrl && (
        <img
          src={article.imageUrl}
          alt=""
          className="block w-full h-[120px] object-cover rounded-t-md mb-2"
        />
      )}

      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <SentimentBadge sentiment={article.sentiment ?? "neutral"} />
        <CommunitySentimentBadge article={article} />
        <span className="text-[10px] text-muted-foreground capitalize">{article.category}</span>
      </div>

      <a
        href={article.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[13px] font-bold leading-snug text-foreground mb-1 hover:text-primary hover:underline"
      >
        {article.title}
        <ExternalLink className="w-2.5 h-2.5" />
      </a>

      {article.summary && (
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-2 line-clamp-3">
          {article.summary}
        </p>
      )}
      {!article.summary && article.excerpt && (
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-2 line-clamp-2">
          {article.excerpt}
        </p>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between mb-2 text-[10px] text-muted-foreground">
        <span>{article.source} · {formatRelativeTime(article.publishedAt || article.scrapedAt)}</span>
        {article.location?.neighborhood && (
          <span className="font-medium text-foreground/70">
            📍 {article.location.neighborhood}
          </span>
        )}
      </div>

      {/* Reactions */}
      <div className="flex gap-0.5 pt-2 border-t border-border/40 mb-1.5">
        {REACTIONS.map(({ type, emoji, label }) => {
          const isActive = userReaction === type;
          const count = reactionCounts[type] ?? 0;
          return (
            <button
              key={type}
              onClick={() => onReact(article.id, type)}
              aria-label={label}
              title={label}
              className={`flex items-center gap-0.5 px-1.5 py-1 rounded-full text-xs border transition-colors
                ${isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 bg-transparent text-foreground hover:bg-muted/50"
                }`}
            >
              <span>{emoji}</span>
              {count > 0 && <span className="text-[10px]">{count}</span>}
            </button>
          );
        })}
      </div>

      {totalReactions > 0 && (
        <p className="text-[10px] text-muted-foreground mb-2">
          {totalReactions} reaction{totalReactions !== 1 ? "s" : ""} from residents
        </p>
      )}

    </div>
  );
}
