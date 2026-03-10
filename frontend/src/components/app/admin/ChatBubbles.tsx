import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useApp } from "@/lib/appContext";
import type { NewsArticle } from "@/lib/types";
import { parseRecommendations, RecommendationsCard, SourceCards } from "./ChatResponseCards";

const SUGGESTION_CHIPS = [
  "What are the top concerns?",
  "How does Downtown feel?",
  "City-wide summary",
];

const COLLAPSE_THRESHOLD = 200; // chars before collapsing body

function findReferencedArticles(text: string, articles: NewsArticle[]): NewsArticle[] {
  if (!text || articles.length === 0) return [];
  const lowerText = text.toLowerCase();
  const matched: NewsArticle[] = [];

  for (const article of articles) {
    const titleWords = article.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (titleWords.length < 2) continue;
    const matchCount = titleWords.filter((word) => lowerText.includes(word)).length;
    if (matchCount / titleWords.length >= 0.6) matched.push(article);
  }

  const seen = new Set<string>();
  return matched.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  }).slice(0, 3);
}

function MarkdownLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  const navigate = useNavigate();
  const isInternal = href?.startsWith("/");
  return (
    <a
      href={href}
      onClick={isInternal ? (e) => { e.preventDefault(); navigate(href!); } : undefined}
      target={isInternal ? undefined : "_blank"}
      rel={isInternal ? undefined : "noopener noreferrer"}
      className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium"
    >
      {children}
    </a>
  );
}

/** Collapsible wrapper for long content blocks. */
function CollapsibleBody({ text, defaultOpen }: { text: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const isLong = text.length > COLLAPSE_THRESHOLD;

  if (!isLong) {
    return (
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 break-words">
        <ReactMarkdown components={{ a: MarkdownLink }}>{text}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div>
      <div className={open ? "" : "max-h-[120px] overflow-hidden relative"}>
        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 break-words">
          <ReactMarkdown components={{ a: MarkdownLink }}>{text}</ReactMarkdown>
        </div>
        {!open && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted to-transparent" />
        )}
      </div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-0.5 mt-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {open ? "Show less" : "Show more"}
      </button>
    </div>
  );
}

export function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-sm bg-primary text-primary-foreground text-sm">
        {content}
      </div>
    </div>
  );
}

export function AssistantBubble({
  content,
  isStreaming,
  isLatest,
}: {
  content: string;
  isStreaming?: boolean;
  isLatest?: boolean;
}) {
  const { state } = useApp();
  const ref = useRef<HTMLDivElement>(null);

  // Scroll into view when this is the latest message
  useEffect(() => {
    if (isLatest && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isLatest, content]);

  if (!content) {
    return (
      <div ref={ref} className="flex justify-start">
        <div className="px-3 py-2 rounded-2xl rounded-bl-sm bg-muted text-foreground text-sm">
          <span className="animate-pulse">▍</span>
        </div>
      </div>
    );
  }

  if (isStreaming) {
    return (
      <div ref={ref} className="w-full min-w-0">
        <div className="px-3 py-2 rounded-2xl rounded-bl-sm bg-muted text-foreground text-sm whitespace-pre-wrap break-words overflow-hidden">
          {content}<span className="animate-pulse">▍</span>
        </div>
      </div>
    );
  }

  const { bodyText, recommendations } = parseRecommendations(content);
  const referencedArticles = findReferencedArticles(bodyText, state.newsArticles);

  return (
    <div ref={ref} className="w-full min-w-0">
      <div className="px-3 py-2 rounded-2xl rounded-bl-sm bg-muted text-foreground text-sm overflow-hidden">
        <CollapsibleBody text={bodyText} defaultOpen={isLatest ?? true} />
        {recommendations.length > 0 && <RecommendationsCard items={recommendations} />}
        {referencedArticles.length > 0 && <SourceCards articles={referencedArticles} />}
      </div>
    </div>
  );
}

export function ToolCallChip({ label }: { label: string }) {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
        {label}
      </div>
    </div>
  );
}

export function SuggestionChips({ onSelect }: { onSelect: (chip: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {SUGGESTION_CHIPS.map((chip) => (
        <button
          key={chip}
          onClick={() => onSelect(chip)}
          className="px-3 py-1.5 rounded-full border border-border/50 bg-background text-xs text-foreground hover:bg-muted transition-colors"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
