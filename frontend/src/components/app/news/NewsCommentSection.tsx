import { useState } from "react";
import { Send } from "lucide-react";
import type { NewsComment } from "@/lib/types";
import { useApp } from "@/lib/appContext";
import { saveComment } from "@/lib/newsCommentStore";
import { formatRelativeTime } from "@/lib/newsService";
import { API_BASE } from "@/lib/apiConfig";

interface NewsCommentSectionProps {
  articleId: string;
}

export function NewsCommentSection({ articleId }: NewsCommentSectionProps) {
  const { state, dispatch } = useApp();
  const [text, setText] = useState("");

  const comments = state.newsComments.filter((c) => c.articleId === articleId);
  const citizen = state.citizenMeta;

  function handleSubmitComment() {
    const trimmed = text.trim();
    if (!trimmed) return;

    const comment: NewsComment = {
      id: `cmt-${Date.now()}`,
      articleId,
      citizenId: citizen?.id ?? "guest",
      citizenName: citizen ? citizen.persona : "Resident",
      avatarInitials: citizen?.avatarInitials ?? "R",
      avatarColor: citizen?.avatarColor ?? "#6b7280",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: "ADD_NEWS_COMMENT", comment });
    saveComment(comment);
    // Fire-and-forget: sync comment to backend for AI analysis
    fetch(`${API_BASE}/api/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(comment),
    }).catch(() => {});
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  }

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Comments ({comments.length})
      </h4>

      {/* Comment input */}
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: citizen?.avatarColor ?? "#6b7280" }}
        >
          {citizen?.avatarInitials ?? "R"}
        </div>
        <div className="flex-1 flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share your thoughts..."
            rows={2}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleSubmitComment}
            disabled={!text.trim()}
            className="self-end p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comment list */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <CommentBubble key={comment.id} comment={comment} />
        ))}
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No comments yet. Be the first to share your perspective.
          </p>
        )}
      </div>
    </div>
  );
}

function CommentBubble({ comment }: { comment: NewsComment }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
        style={{ backgroundColor: comment.avatarColor }}
      >
        {comment.avatarInitials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-foreground">{comment.citizenName}</span>
          <span className="text-[10px] text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{comment.content}</p>
      </div>
    </div>
  );
}
