import { MessageSquare, ThumbsUp } from "lucide-react";
import { getSentimentColor } from "@/lib/newsMapMarkers";
import { formatRelativeTime } from "@/lib/newsService";
import type { NewsArticle } from "@/lib/types";

interface SidebarArticleRowProps {
  article: NewsArticle;
  reactionCount: number;
  commentCount: number;
  isSelected: boolean;
  onSelect: () => void;
}

export function SidebarArticleRow({
  article, reactionCount, commentCount, isSelected, onSelect,
}: SidebarArticleRowProps) {
  const sentimentColor = getSentimentColor(article.sentiment ?? "neutral");
  const sentimentLabel = article.sentiment ?? "neutral";
  const communityColor = article.communitySentiment
    ? getSentimentColor(article.communitySentiment)
    : null;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 border-b border-border/15 transition-colors
        ${isSelected
          ? "bg-primary/5 border-l-2 border-l-primary"
          : "hover:bg-muted/30 border-l-2 border-l-transparent"
        }`}
    >
      <div className="flex items-start gap-2">
        {/* Sentiment indicators */}
        <div className="mt-1.5 shrink-0 flex gap-0.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: sentimentColor }}
            aria-hidden="true"
          />
          {communityColor && (
            <span
              className="w-2 h-2 rounded-full ring-1 ring-white"
              style={{ backgroundColor: communityColor }}
              aria-label="Community sentiment"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2">
            {article.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground capitalize px-1.5 py-0.5 bg-muted/40 rounded">
              {article.category}
            </span>
            <span className="text-[10px] capitalize" style={{ color: sentimentColor }}>
              {sentimentLabel}
            </span>
            {article.location?.neighborhood && (
              <span className="text-[10px] text-muted-foreground truncate">
                📍 {article.location.neighborhood}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
            <span>{formatRelativeTime(article.publishedAt || article.scrapedAt)}</span>
            {reactionCount > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <ThumbsUp className="w-2.5 h-2.5" /> {reactionCount}
              </span>
            )}
            {commentCount > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <MessageSquare className="w-2.5 h-2.5" /> {commentCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
