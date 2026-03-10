import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, MessageSquareText } from "lucide-react";
import { useApp } from "@/lib/appContext";
import type { NewsArticle, NewsComment } from "@/lib/types";
import type { ParsedRecommendation } from "./chatParsers";

export { parseRecommendations } from "./chatParsers";
export type { ParsedRecommendation } from "./chatParsers";

const PRIORITY_DOT: Record<string, string> = {
  HIGH: "bg-red-500",
  MEDIUM: "bg-amber-500",
  LOW: "bg-blue-400",
};

const PRIORITY_LABEL: Record<string, string> = {
  HIGH: "text-red-600 dark:text-red-400",
  MEDIUM: "text-amber-600 dark:text-amber-400",
  LOW: "text-blue-600 dark:text-blue-400",
};

const SENTIMENT_DOT: Record<string, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-muted-foreground/40",
  negative: "bg-red-500",
};

export function RecommendationsCard({ items }: { items: ParsedRecommendation[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="w-full mt-2 border-t border-border/20 pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Actions ({items.length})
      </button>
      {open && (
        <div className="mt-1.5 space-y-1">
          {items.map((rec, i) => (
            <div key={i} className="flex items-start gap-2 py-1">
              <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[rec.priority] ?? PRIORITY_DOT.MEDIUM}`} />
              <div className="min-w-0 flex-1">
                <span className={`text-[10px] font-bold ${PRIORITY_LABEL[rec.priority] ?? PRIORITY_LABEL.MEDIUM}`}>
                  {rec.priority}
                </span>
                <p className="text-xs text-foreground leading-snug break-words">{rec.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArticleComments({ articleId }: { articleId: string }) {
  const { state } = useApp();
  const comments = state.newsComments.filter((c: NewsComment) => c.articleId === articleId);
  const [open, setOpen] = useState(false);

  if (comments.length === 0) return null;

  return (
    <div className="ml-3.5 mt-0.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageSquareText className="w-2.5 h-2.5" />
        {comments.length} comment{comments.length !== 1 ? "s" : ""}
        {open ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
      </button>
      {open && (
        <div className="mt-1 space-y-1 border-l-2 border-border/30 pl-2">
          {comments.slice(0, 5).map((c: NewsComment) => (
            <div key={c.id} className="text-[11px] text-muted-foreground leading-snug">
              <span className="font-medium text-foreground">{c.avatarInitials}</span>
              {" — "}
              <span className="break-words">{c.content.slice(0, 150)}{c.content.length > 150 ? "…" : ""}</span>
            </div>
          ))}
          {comments.length > 5 && (
            <p className="text-[10px] text-muted-foreground">+{comments.length - 5} more</p>
          )}
        </div>
      )}
    </div>
  );
}

export function SourceCards({ articles }: { articles: NewsArticle[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full mt-1.5 border-t border-border/20 pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Sources ({articles.length})
      </button>
      {open && (
        <div className="mt-1 space-y-0.5">
          {articles.map((article) => {
            const sentiment = article.sentiment ?? "neutral";
            const dotClass = SENTIMENT_DOT[sentiment] ?? SENTIMENT_DOT.neutral;
            return (
              <div key={article.id}>
                <div className="flex items-center gap-2 py-1 group min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
                  <span className="text-xs text-foreground truncate flex-1 min-w-0">{article.title}</span>
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-foreground transition-opacity"
                    title="Read article"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <ArticleComments articleId={article.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
