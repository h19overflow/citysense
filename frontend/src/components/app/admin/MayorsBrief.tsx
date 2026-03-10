import { useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminCommentStore } from "@/stores/adminCommentStore";
import { computeNeighborhoodActivity, computeSentimentBreakdown, findTopConcerns, sortArticlesByEngagement } from "@/lib/newsAggregations";
import { getSentimentColor } from "@/lib/newsMapMarkers";
import type { NeighborhoodActivity, NewsArticle, NewsComment, ReactionType } from "@/lib/types";
import { CollapsibleSection } from "./CollapsibleSection";

interface MayorsBriefProps {
  articles: NewsArticle[];
  comments: NewsComment[];
  reactions: Record<string, Record<ReactionType, number>>;
  onAskAI?: (question: string) => void;
}

function buildSentimentSummary(articles: NewsArticle[]): string {
  const { positive, neutral, negative } = computeSentimentBreakdown(articles);
  const total = positive + neutral + negative;
  if (total === 0) return "No articles this week.";
  const positivePercent = Math.round((positive / total) * 100);
  const negativePercent = Math.round((negative / total) * 100);
  if (positivePercent >= 50) return `Mostly positive this week — ${positivePercent}% of stories are encouraging.`;
  if (negativePercent >= 50) return `Mostly negative this week — ${negativePercent}% of stories are concerning.`;
  return `Mixed sentiment this week: ${positivePercent}% positive, ${negativePercent}% negative.`;
}

function ClickableItem({ text, question, onAskAI }: { text: string; question: string; onAskAI?: (q: string) => void }) {
  if (!onAskAI) return <span className="text-sm text-foreground leading-snug">{text}</span>;
  return (
    <button
      onClick={() => onAskAI(question)}
      className="text-sm text-left text-foreground leading-snug hover:text-primary transition-colors group flex items-center gap-1.5"
    >
      {text}
      <MessageSquare className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
    </button>
  );
}

function SentimentDot({ sentiment }: { sentiment: string }) {
  const color = getSentimentColor(sentiment);
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: color }}
      title={sentiment}
    />
  );
}

function TopConcernsList({ articles, comments, onAskAI }: {
  articles: NewsArticle[];
  comments: NewsComment[];
  onAskAI?: (q: string) => void;
}) {
  const topConcerns = findTopConcerns(articles, comments).slice(0, 3);
  const articleMap = new Map(articles.map((a) => [a.id, a]));

  if (topConcerns.length === 0) return <p className="text-sm text-muted-foreground">No citizen comments yet.</p>;
  return (
    <ul className="space-y-2.5">
      {topConcerns.map((concern) => {
        const article = articleMap.get(concern.articleId);
        const neighborhood = article?.location?.neighborhood;
        const source = article?.source;
        const sentiment = article?.sentiment ?? "neutral";

        return (
          <li key={concern.articleId} className="flex items-start gap-2.5">
            <SentimentDot sentiment={sentiment} />
            <div className="flex-1 min-w-0">
              <ClickableItem
                text={concern.title}
                question={`Tell me more about: ${concern.title}`}
                onAskAI={onAskAI}
              />
              <p className="text-xs text-muted-foreground mt-0.5">
                {source && <>{source}</>}
                {source && neighborhood && " · "}
                {neighborhood && <>{neighborhood}</>}
              </p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap pt-0.5 bg-muted/60 px-1.5 py-0.5 rounded-full">
              {concern.commentCount} comments
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function HottestThisWeek({ articles, comments, reactions, onAskAI }: {
  articles: NewsArticle[];
  comments: NewsComment[];
  reactions: Record<string, Record<ReactionType, number>>;
  onAskAI?: (q: string) => void;
}) {
  const sorted = sortArticlesByEngagement(articles, reactions, comments).slice(0, 3);
  if (sorted.length === 0) return <p className="text-sm text-muted-foreground">No articles yet.</p>;

  return (
    <ul className="space-y-2">
      {sorted.map((article) => {
        const totalReactions = Object.values(reactions[article.id] ?? {}).reduce((sum, n) => sum + n, 0);
        return (
          <li key={article.id}>
            <button
              onClick={() => onAskAI?.(`Tell me more about: ${article.title}`)}
              className="w-full flex items-center gap-2.5 text-left hover:text-primary transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                  {article.title}
                  <MessageSquare className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap shrink-0">
                <span>↑{article.upvotes}</span>
                <span>{totalReactions} reactions</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function NeighborhoodList({ neighborhoods, onAskAI }: { neighborhoods: NeighborhoodActivity[]; onAskAI?: (q: string) => void }) {
  const top = neighborhoods.slice(0, 3);
  if (top.length === 0) return <p className="text-sm text-muted-foreground">No neighborhood data yet.</p>;
  return (
    <ul className="space-y-2">
      {top.map((hood) => (
        <li key={hood.name} className="flex items-center justify-between">
          <ClickableItem
            text={hood.name}
            question={`How does ${hood.name} feel? What are the main concerns there?`}
            onAskAI={onAskAI}
          />
          <span className="text-xs text-muted-foreground">
            {hood.articleCount} articles · {hood.reactionCount + hood.commentCount} comments & reactions
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MayorsBrief({ articles, comments: propComments, reactions, onAskAI }: MayorsBriefProps) {
  const { fetchComments, mergeWithLocal } = useAdminCommentStore();

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const allComments = mergeWithLocal(propComments);
  const neighborhoods = computeNeighborhoodActivity(articles, reactions, allComments);
  const sentimentSummary = buildSentimentSummary(articles);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daily Overview</CardTitle>
        <p className="text-xs text-muted-foreground">Your daily briefing on citizen sentiment</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          onClick={() => onAskAI?.("Give me the full city-wide sentiment summary")}
          className="w-full text-left px-3 py-2.5 rounded-lg bg-muted/50 border border-border hover:border-primary/30 hover:bg-muted/70 transition-colors group"
        >
          <p className="text-sm text-foreground leading-relaxed group-hover:text-primary transition-colors">{sentimentSummary}</p>
        </button>
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2">Most Talked About</h3>
          <TopConcernsList articles={articles} comments={allComments} onAskAI={onAskAI} />
        </section>
        <CollapsibleSection title="Hottest This Week" defaultOpen={false}>
          <HottestThisWeek articles={articles} comments={allComments} reactions={reactions} onAskAI={onAskAI} />
        </CollapsibleSection>
        <CollapsibleSection title="Busiest Areas" defaultOpen={false}>
          <NeighborhoodList neighborhoods={neighborhoods} onAskAI={onAskAI} />
        </CollapsibleSection>
      </CardContent>
    </Card>
  );
}
