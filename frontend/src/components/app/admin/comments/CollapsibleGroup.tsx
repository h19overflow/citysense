import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { NewsArticle, NewsComment } from "@/lib/types";
import { CommentRow } from "./CommentRow";
import { groupCommentsByArticle, groupCommentsByNeighborhood } from "./commentFeedHelpers";

interface CollapsibleGroupProps {
  label: string;
  sublabel?: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleGroup({ label, sublabel, count, defaultOpen = true, children }: CollapsibleGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted/60 border border-border/30 hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {isOpen
            ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          }
          <div className="min-w-0 text-left">
            <p className="text-sm font-medium text-foreground truncate">{label}</p>
            {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
          </div>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
          {count} {count === 1 ? "comment" : "comments"}
        </span>
      </button>
      {isOpen && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function GroupedByStory({ comments, articleIndex, onAskAI }: {
  comments: NewsComment[];
  articleIndex: Map<string, NewsArticle>;
  onAskAI?: (q: string) => void;
}) {
  const groups = groupCommentsByArticle(comments, articleIndex);
  return (
    <div className="space-y-3">
      {groups.map(({ articleId, article, comments: groupComments }, index) => (
        <CollapsibleGroup
          key={articleId}
          label={article?.title ?? "Unknown article"}
          sublabel={article?.location?.neighborhood}
          count={groupComments.length}
          defaultOpen={index === 0}
        >
          <ul className="space-y-3 pl-3 border-l-2 border-border/30">
            {groupComments.map((comment) => (
              <CommentRow key={comment.id} comment={comment} article={article} onAskAI={onAskAI} showMeta={false} />
            ))}
          </ul>
        </CollapsibleGroup>
      ))}
    </div>
  );
}

export function GroupedByArea({ comments, articleIndex, onAskAI }: {
  comments: NewsComment[];
  articleIndex: Map<string, NewsArticle>;
  onAskAI?: (q: string) => void;
}) {
  const groups = groupCommentsByNeighborhood(comments, articleIndex);
  return (
    <div className="space-y-3">
      {groups.map(({ neighborhood, comments: groupComments }, index) => (
        <CollapsibleGroup
          key={neighborhood}
          label={neighborhood}
          count={groupComments.length}
          defaultOpen={index === 0}
        >
          <ul className="space-y-3 pl-3 border-l-2 border-border/30">
            {groupComments.map((comment) => (
              <CommentRow key={comment.id} comment={comment} article={articleIndex.get(comment.articleId)} onAskAI={onAskAI} />
            ))}
          </ul>
        </CollapsibleGroup>
      ))}
    </div>
  );
}
