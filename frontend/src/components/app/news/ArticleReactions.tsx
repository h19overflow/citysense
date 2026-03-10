import { useState, useRef, useEffect } from "react";
import { Flag, Smile } from "lucide-react";

export const REACTIONS = [
  { emoji: "\ud83d\udc4d", label: "Like"  },
  { emoji: "\u2764\ufe0f", label: "Love"  },
  { emoji: "\ud83d\ude2e", label: "Wow"   },
  { emoji: "\ud83d\ude22", label: "Sad"   },
  { emoji: "\ud83d\ude21", label: "Angry" },
] as const;

interface ArticleReactionsProps {
  articleId: string;
  reactionCounts: Record<string, number>;
  userReaction: string | null;
  flagCount: number;
  isFlagged: boolean;
  onReact: (articleId: string, emoji: string | null) => void;
  onFlag: (articleId: string) => void;
  compact?: boolean;
}

export function ArticleReactions({
  articleId, reactionCounts, userReaction, flagCount, isFlagged,
  onReact, onFlag, compact = false,
}: ArticleReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [pickerOpen]);

  function togglePicker(e: React.MouseEvent) {
    e.stopPropagation();
    setPickerOpen((v) => !v);
  }

  function pickEmoji(e: React.MouseEvent, emoji: string) {
    e.stopPropagation();
    onReact(articleId, userReaction === emoji ? null : emoji);
    setPickerOpen(false);
  }

  function flag(e: React.MouseEvent) {
    e.stopPropagation();
    onFlag(articleId);
  }

  const totalReactions = Object.values(reactionCounts).reduce((s, n) => s + n, 0);

  return (
    <div className="flex items-center justify-between gap-2" ref={ref}>
      {/* Left: reaction trigger + picker */}
      <div className="relative flex items-center gap-1.5">
        <button
          onClick={togglePicker}
          title={userReaction ?? "React"}
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${
            userReaction
              ? "bg-primary/10 ring-1 ring-primary/30 text-primary"
              : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
          }`}
        >
          {userReaction
            ? <span className={compact ? "text-sm" : "text-base"} style={{ lineHeight: 1 }}>{userReaction}</span>
            : <Smile className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />}
          {totalReactions > 0 && (
            <span className={compact ? "text-[10px]" : "text-xs"}>{totalReactions}</span>
          )}
        </button>

        {/* Emoji picker popover */}
        {pickerOpen && (
          <div
            className="absolute bottom-full mb-1.5 left-0 z-50 flex items-center gap-1 p-1.5 rounded-2xl bg-white border border-border shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {REACTIONS.map(({ emoji, label }) => {
              const count = reactionCounts[emoji] ?? 0;
              const active = userReaction === emoji;
              return (
                <button
                  key={emoji}
                  onClick={(e) => pickEmoji(e, emoji)}
                  title={label}
                  className={`relative flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all hover:scale-125 ${
                    active ? "bg-primary/10 scale-110" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="text-xl leading-none">{emoji}</span>
                  {count > 0 && (
                    <span className="text-[9px] text-muted-foreground font-medium leading-none">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: flag button */}
      <button
        onClick={flag}
        title={isFlagged ? "Remove flag" : "Flag as misinformation"}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
          isFlagged
            ? "text-red-600 bg-red-50 ring-1 ring-red-200"
            : "text-muted-foreground hover:text-red-500 hover:bg-red-50/60"
        }`}
      >
        <Flag className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        {compact
          ? flagCount > 0 ? <span className="text-[10px]">{flagCount}</span> : null
          : <span>{isFlagged ? `Flagged \u00b7 ${flagCount} report${flagCount !== 1 ? "s" : ""}` : "Flag as misinformation"}</span>
        }
      </button>
    </div>
  );
}
