import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminCommentStore } from "@/stores/adminCommentStore";
import type { NewsArticle, NewsComment } from "@/lib/types";
import { CommentRow } from "./comments/CommentRow";
import { GroupedByStory, GroupedByArea } from "./comments/CollapsibleGroup";
import {
  buildArticleIndex,
  sortComments,
  SORT_OPTIONS,
  type SortMode,
} from "./comments/commentFeedHelpers";

interface CommentFeedProps {
  comments?: NewsComment[];
  articles: NewsArticle[];
  onAskAI?: (question: string) => void;
}

export function CommentFeed({ comments: propComments = [], articles, onAskAI }: CommentFeedProps) {
  const { isLoading, fetchComments, mergeWithLocal } = useAdminCommentStore();
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const articleIndex = buildArticleIndex(articles);
  const allComments = mergeWithLocal(propComments);
  const sortedComments = sortComments(allComments, sortMode, articleIndex);

  function renderCommentList() {
    if (sortMode === "by-article") {
      return <GroupedByStory comments={allComments} articleIndex={articleIndex} onAskAI={onAskAI} />;
    }
    if (sortMode === "by-neighborhood") {
      return <GroupedByArea comments={allComments} articleIndex={articleIndex} onAskAI={onAskAI} />;
    }
    return (
      <ul className="space-y-4">
        {sortedComments.map((comment) => (
          <CommentRow key={comment.id} comment={comment} article={articleIndex.get(comment.articleId)} onAskAI={onAskAI} />
        ))}
      </ul>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">What Citizens Are Saying</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 min-h-0 flex flex-col">
        <div className="flex gap-2 flex-wrap">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSortMode(option.value)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors min-h-[32px] ${
                sortMode === option.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-foreground border-border hover:bg-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {isLoading && <p className="text-sm text-muted-foreground animate-pulse">Loading comments…</p>}
        {!isLoading && allComments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        {!isLoading && allComments.length > 0 && (
          <div className="relative flex-1 min-h-0">
            <div className="h-full overflow-y-auto pr-3 scroll-smooth">
              {renderCommentList()}
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
