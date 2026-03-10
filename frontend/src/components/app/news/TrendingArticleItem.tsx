import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { NewsCommentSection } from "./NewsCommentSection";
import { getSentimentColor } from "@/lib/newsMapMarkers";
import type { NewsArticle, NewsComment, ReactionType } from "@/lib/types";

const REACTION_EMOJIS: Record<ReactionType, string> = {
  thumbs_up: "👍",
  thumbs_down: "👎",
  heart: "❤️",
  sad: "😢",
  angry: "😠",
};

interface TrendingArticleItemProps {
  article: NewsArticle;
  reactionCounts: Record<ReactionType, number>;
  comments: NewsComment[];
  onSelect: (articleId: string) => void;
}

function countTotalReactions(counts: Record<ReactionType, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

function countArticleComments(comments: NewsComment[], articleId: string): number {
  return comments.filter((c) => c.articleId === articleId).length;
}

export function TrendingArticleItem({ article, reactionCounts, comments, onSelect }: TrendingArticleItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sentimentColor = getSentimentColor(article.sentiment ?? "neutral");
  const totalReactions = countTotalReactions(reactionCounts);
  const commentCount = countArticleComments(comments, article.id);
  const reactionEntries = Object.entries(reactionCounts) as [ReactionType, number][];

  return (
    <div className="border-b border-border/20 last:border-0">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full text-left px-4 py-3 min-h-[44px] hover:bg-muted/30 transition-colors flex flex-col gap-1.5"
      >
        <div className="flex items-start gap-2">
          <span
            className="mt-1 shrink-0 w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: sentimentColor }}
            aria-label={`${article.sentiment ?? "neutral"} sentiment`}
          />
          <span className="text-sm font-semibold text-foreground leading-snug flex-1">{article.title}</span>
        </div>
        <div className="flex items-center gap-2 pl-[18px]">
          <Badge variant="secondary" className="text-xs capitalize px-1.5 py-0">
            {article.category}
          </Badge>
          <span className="text-xs text-muted-foreground">{totalReactions} reactions</span>
          <span className="text-xs text-muted-foreground">{commentCount} comments</span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {article.excerpt && (
            <p className="text-sm text-muted-foreground leading-relaxed pl-[18px]">{article.excerpt}</p>
          )}

          {reactionEntries.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-[18px]">
              {reactionEntries.map(([reaction, count]) =>
                count > 0 ? (
                  <span key={reaction} className="text-sm text-foreground">
                    {REACTION_EMOJIS[reaction]} {count}
                  </span>
                ) : null
              )}
            </div>
          )}

          <button
            onClick={() => onSelect(article.id)}
            className="ml-[18px] min-h-[44px] px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            View on Map
          </button>

          <div className="pt-2 border-t border-border/20">
            <NewsCommentSection articleId={article.id} />
          </div>
        </div>
      )}
    </div>
  );
}
