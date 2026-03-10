import type { AggregatedInsights } from "./aiInsightsHelpers";
import { CollapsibleSection } from "./CollapsibleSection";

interface InsightBulletProps {
  text: string;
  question: string;
  onAskAI?: (question: string) => void;
}

function InsightBullet({ text, question, onAskAI }: InsightBulletProps) {
  return (
    <li>
      <button
        onClick={() => onAskAI?.(question)}
        className="text-sm text-left text-foreground hover:text-primary transition-colors leading-snug underline-offset-2 hover:underline w-full"
      >
        {text}
      </button>
    </li>
  );
}

interface InsightsDetailsProps {
  insights: AggregatedInsights;
  onAskAI?: (question: string) => void;
}

export function InsightsDetails({ insights, onAskAI }: InsightsDetailsProps) {
  return (
    <>
      <ul className="space-y-3">
        <InsightBullet
          text={`Top concern: ${insights.topConcern}`}
          question={`Tell me more about: ${insights.topConcern}`}
          onAskAI={onAskAI}
        />
        <InsightBullet
          text={`Trending: ${insights.trendingTopic}`}
          question={`What's happening with ${insights.trendingTopic}?`}
          onAskAI={onAskAI}
        />
        <InsightBullet
          text={insights.keySentiment}
          question="Give me the full city-wide sentiment summary"
          onAskAI={onAskAI}
        />
      </ul>
      <CollapsibleSection title="See Details">
        {insights.topicClusters.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Main Topics</p>
            <div className="flex flex-wrap gap-1.5">
              {insights.topicClusters.map(({ label, count }) => (
                <span key={label} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {label}{count > 1 && <span className="ml-1 opacity-60">×{count}</span>}
                </span>
              ))}
            </div>
          </div>
        )}
        {insights.urgentConcerns.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Needs Attention</p>
            <ul className="space-y-1.5">
              {insights.urgentConcerns.map(({ label, count }) => (
                <li key={label} className="flex items-start gap-2">
                  <span className="text-red-500 mt-1 shrink-0">•</span>
                  <button
                    onClick={() => onAskAI?.(`Tell me more about: ${label}`)}
                    className="text-sm text-left text-foreground hover:text-primary transition-colors leading-snug"
                  >
                    {label}
                    {count > 1 && <span className="ml-1 text-xs text-muted-foreground">(×{count})</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CollapsibleSection>
    </>
  );
}
