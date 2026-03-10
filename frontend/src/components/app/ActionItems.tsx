import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useApp } from "@/lib/appContext";
import type { ActionItem } from "@/lib/types";

const TIMEFRAME_LABELS: Record<ActionItem["timeframe"], string> = {
  this_week: "This Week",
  this_month: "This Month",
  "3_months": "Next 3 Months",
};

const TIMEFRAME_ORDER: ActionItem["timeframe"][] = ["this_week", "this_month", "3_months"];

function groupItemsByTimeframe(items: ActionItem[]): Record<ActionItem["timeframe"], ActionItem[]> {
  return {
    this_week: items.filter((i) => i.timeframe === "this_week"),
    this_month: items.filter((i) => i.timeframe === "this_month"),
    "3_months": items.filter((i) => i.timeframe === "3_months"),
  };
}

export default function ActionItems() {
  const { state, dispatch } = useApp();
  const [isExpanded, setIsExpanded] = useState(true);
  const { actionItems } = state;

  const completedCount = actionItems.filter((i) => i.completed).length;
  const grouped = groupItemsByTimeframe(actionItems);

  return (
    <div className="px-4 py-3">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex justify-between items-center w-full"
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Action Items {actionItems.length > 0 ? `(${completedCount}/${actionItems.length})` : ""}
        </p>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3">
          {actionItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Your to-do list will build as we create your plan.
            </p>
          ) : (
            <div className="space-y-4">
              {TIMEFRAME_ORDER.filter((tf) => grouped[tf].length > 0).map((timeframe) => (
                <div key={timeframe}>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    {TIMEFRAME_LABELS[timeframe]}
                  </p>
                  <div className="space-y-2">
                    {grouped[timeframe].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => dispatch({ type: "TOGGLE_ACTION_ITEM", id: item.id })}
                        className="flex items-start gap-2.5 w-full text-left"
                      >
                        <span
                          className={`mt-0.5 w-4 h-4 shrink-0 rounded flex items-center justify-center text-[10px] border transition-colors ${
                            item.completed
                              ? "bg-pine-green border-pine-green text-white"
                              : "border-border hover:border-primary"
                          }`}
                        >
                          {item.completed && "✓"}
                        </span>
                        <span
                          className={`text-xs leading-snug ${
                            item.completed ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
