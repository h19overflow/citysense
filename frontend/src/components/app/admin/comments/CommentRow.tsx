import { formatRelativeTime } from "@/lib/newsService";
import type { NewsArticle, NewsComment } from "@/lib/types";

interface CommentRowProps {
  comment: NewsComment;
  article: NewsArticle | undefined;
  onAskAI?: (question: string) => void;
  showMeta?: boolean;
}

export function CommentRow({ comment, article, onAskAI, showMeta = true }: CommentRowProps) {
  const neighborhood = article?.location?.neighborhood;
  const articleTitle = article?.title ?? "Unknown article";

  function handleClick() {
    if (!onAskAI || !article) return;
    onAskAI(`Tell me more about "${articleTitle}" and what citizens are saying about it`);
  }

  return (
    <li
      className={`flex gap-3 ${onAskAI && article ? "cursor-pointer hover:bg-muted/50 -mx-1 px-1 py-1 rounded-lg transition-colors" : ""}`}
      onClick={handleClick}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 text-white"
        style={{ backgroundColor: comment.avatarColor }}
      >
        {comment.avatarInitials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{comment.citizenName}</span>
          <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-foreground mt-0.5 leading-snug">{comment.content}</p>
        {showMeta && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {articleTitle}
            {neighborhood && <> · {neighborhood}</>}
          </p>
        )}
      </div>
    </li>
  );
}
