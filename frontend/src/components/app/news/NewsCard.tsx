import { ExternalLink, MessageCircle, Clock, Globe } from "lucide-react";
import type { NewsArticle } from "@/lib/types";
import { formatRelativeTime } from "@/lib/newsService";
import { ArticleReactions } from "./ArticleReactions";

interface NewsCardProps {
  article: NewsArticle;
  reactionCounts: Record<string, number>;
  userReaction: string | null;
  flagCount: number;
  isFlagged: boolean;
  commentCount?: number;
  onSelect: (article: NewsArticle) => void;
  onReact: (articleId: string, emoji: string | null) => void;
  onFlag: (articleId: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-slate-500",
  development: "bg-blue-500",
  government: "bg-[hsl(var(--amber-gold))]",
  community: "bg-emerald-500",
  events: "bg-purple-500",
};

const CATEGORY_BADGE: Record<string, string> = {
  general: "text-slate-600",
  development: "text-blue-600",
  government: "text-[hsl(var(--amber-gold))]",
  community: "text-emerald-600",
  events: "text-purple-600",
};

const SENTIMENT_DOTS: Record<string, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-gray-400",
  negative: "bg-rose-500",
};

function accentColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.general;
}

function badgeColor(category: string): string {
  return CATEGORY_BADGE[category] ?? CATEGORY_BADGE.general;
}

function formatScrapedDate(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MisinfoRiskBadge({ risk }: { risk: number }) {
  if (risk > 60) {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
        High Risk
      </span>
    );
  }
  if (risk > 30) {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
        Med Risk
      </span>
    );
  }
  return null;
}

export function NewsCard({ article, reactionCounts, userReaction, flagCount, isFlagged, commentCount, onSelect, onReact, onFlag }: NewsCardProps) {
  const scrapedDate = formatScrapedDate(article.scrapedAt);

  return (
    <div
      className="group relative w-full text-left rounded-2xl bg-white border border-border/40
                 hover:shadow-lg hover:-translate-y-0.5 hover:z-10 transition-all duration-200 cursor-pointer magnolia-bg"
      onClick={() => onSelect(article)}
    >
      {/* Left accent stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor(article.category)} rounded-l-2xl`} />

      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        {article.imageUrl && (
          <div className="sm:w-36 sm:shrink-0 h-36 sm:h-auto overflow-hidden bg-muted">
            <img
              src={article.imageUrl}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        <div className="flex flex-col gap-2 p-4 pl-5 flex-1 min-w-0">
          {/* Top line: category + sentiment dot + time */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${badgeColor(article.category)}`}>
              {article.category}
            </span>
            {article.sentiment && (
              <span className={`w-1.5 h-1.5 rounded-full ${SENTIMENT_DOTS[article.sentiment] ?? SENTIMENT_DOTS.neutral}`} />
            )}
            {article.misinfoRisk != null && article.misinfoRisk > 30 && (
              <MisinfoRiskBadge risk={article.misinfoRisk} />
            )}
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(article.publishedAt)}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold text-secondary leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
          </h3>

          {/* Excerpt */}
          {(article.excerpt || article.summary) && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {article.excerpt || article.summary}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/20 flex-wrap gap-2">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {article.source && (
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {article.source}
                </span>
              )}
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-primary/70 hover:text-primary font-medium transition-colors"
              >
                Read
                <ExternalLink className="w-3 h-3" />
              </a>
              {scrapedDate && (
                <span className="text-[10px] text-muted-foreground/50">{scrapedDate}</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <ArticleReactions
                articleId={article.id}
                reactionCounts={reactionCounts}
                userReaction={userReaction}
                flagCount={flagCount}
                isFlagged={isFlagged}
                onReact={onReact}
                onFlag={onFlag}
                compact
              />
              <button
                onClick={(e) => { e.stopPropagation(); onSelect(article); }}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                {commentCount ?? article.commentCount}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
