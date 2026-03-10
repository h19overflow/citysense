import { ExternalLink, Clock, Globe } from "lucide-react";
import type { NewsArticle } from "@/lib/types";
import { formatRelativeTime } from "@/lib/newsService";

interface HeroArticleProps {
  article: NewsArticle;
  onSelect: (article: NewsArticle) => void;
}

const SENTIMENT_DOTS: Record<string, string> = {
  positive: "bg-emerald-400",
  neutral: "bg-gray-300",
  negative: "bg-rose-400",
};

export function HeroArticle({ article, onSelect }: HeroArticleProps) {
  const hasImage = !!article.imageUrl && !article.imageUrl.startsWith("data:");

  return (
    <div
      onClick={() => onSelect(article)}
      className="relative w-full rounded-2xl overflow-hidden cursor-pointer group min-h-[280px] flex flex-col justify-end"
    >
      {/* Background */}
      {hasImage ? (
        <img
          src={article.imageUrl!}
          alt=""
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--secondary))] to-[hsl(var(--primary))]" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

      {/* Content */}
      <div className="relative z-10 p-6 space-y-3">
        {/* Badges row */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[hsl(var(--amber-gold))]">
            Featured
          </span>
          <span className="w-px h-3 bg-white/20" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
            {article.category}
          </span>
          {article.sentiment && (
            <span className={`w-1.5 h-1.5 rounded-full ${SENTIMENT_DOTS[article.sentiment] ?? SENTIMENT_DOTS.neutral}`} />
          )}
          {article.misinfoRisk != null && article.misinfoRisk > 60 && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-red-500/30 text-white border border-red-400/30">
              High Risk
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white leading-tight line-clamp-3 group-hover:text-[hsl(var(--amber-gold))]/90 transition-colors">
          {article.title}
        </h2>

        {/* Excerpt */}
        {(article.excerpt || article.summary) && (
          <p className="text-sm text-white/60 line-clamp-2 leading-relaxed">
            {article.excerpt || article.summary}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-white/50 pt-1 border-t border-white/10">
          {article.source && (
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {article.source}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(article.publishedAt)}
          </span>
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[hsl(var(--amber-gold))]/70 hover:text-[hsl(var(--amber-gold))] transition-colors ml-auto"
          >
            Read full article
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
