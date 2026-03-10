import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { computeSentimentBreakdown } from "@/lib/newsAggregations";
import { getSentimentColor } from "@/lib/newsMapMarkers";
import type { NewsArticle } from "@/lib/types";
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { CollapsibleSection } from "./CollapsibleSection";

interface SentimentOverviewProps {
  articles: NewsArticle[];
  onAskAI?: (question: string) => void;
}

const SENTIMENT_CHART_CONFIG: ChartConfig = {
  positive: { label: "Positive", color: "#22c55e" },
  mixed: { label: "Mixed", color: "#eab308" },
  negative: { label: "Negative", color: "#ef4444" },
};

function buildPieData(articles: NewsArticle[]) {
  const { positive, neutral, negative } = computeSentimentBreakdown(articles);
  return [
    { name: "Positive", value: positive },
    { name: "Mixed", value: neutral },
    { name: "Negative", value: negative },
  ].filter((d) => d.value > 0);
}

function buildCategoryBarData(articles: NewsArticle[]) {
  const categoryMap = new Map<string, { positive: number; mixed: number; negative: number }>();
  for (const article of articles) {
    const cat = article.category?.trim() || "other";
    const existing = categoryMap.get(cat) ?? { positive: 0, mixed: 0, negative: 0 };
    const sentiment = article.sentiment ?? "neutral";
    if (sentiment === "neutral") existing.mixed++;
    else existing[sentiment]++;
    categoryMap.set(cat, existing);
  }
  return Array.from(categoryMap.entries()).map(([category, counts]) => ({ category, ...counts }));
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

function renderPieValueLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  value,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  value: number;
}) {
  if (!value || percent < 0.06) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.65;
  const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
  const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${value} (${Math.round(percent * 100)}%)`}
    </text>
  );
}

function renderStackedLabel(textColor: string) {
  return ({
    x,
    y,
    width,
    height,
    value,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
    value: number;
  }) => {
    if (!value || height < 14) return null;
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill={textColor}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontWeight={600}
      >
        {value}
      </text>
    );
  };
}

function SentimentBar({ articles }: { articles: NewsArticle[] }) {
  const { positive, neutral, negative } = computeSentimentBreakdown(articles);
  const total = positive + neutral + negative;
  if (total === 0) return <p className="text-sm text-muted-foreground">No articles yet.</p>;
  const positivePercent = Math.round((positive / total) * 100);
  const neutralPercent = Math.round((neutral / total) * 100);
  const negativePercent = 100 - positivePercent - neutralPercent;

  return (
    <div className="space-y-2">
      <div className="flex h-4 rounded-full overflow-hidden gap-px">
        <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${positivePercent}%` }} />
        <div className="bg-yellow-400 transition-all duration-500" style={{ width: `${neutralPercent}%` }} />
        <div className="bg-red-500 transition-all duration-500" style={{ width: `${negativePercent}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="text-emerald-600 font-medium">😊 {positivePercent}% Positive</span>
        <span className="text-yellow-600 font-medium">😐 {neutralPercent}% Mixed</span>
        <span className="text-red-600 font-medium">😟 {negativePercent}% Negative</span>
      </div>
    </div>
  );
}

export function SentimentOverview({ articles, onAskAI }: SentimentOverviewProps) {
  const pieData = buildPieData(articles);
  const barData = buildCategoryBarData(articles);
  const summary = buildSentimentSummary(articles);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Community Mood</CardTitle>
        <p className="text-xs text-muted-foreground">How residents feel about recent stories</p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground mb-3 leading-relaxed">{summary}</p>
        <button
          onClick={() => onAskAI?.("Give me the full city-wide sentiment summary with breakdown by category")}
          className="w-full text-left hover:opacity-80 transition-opacity"
        >
          <SentimentBar articles={articles} />
        </button>
        <CollapsibleSection title="See Breakdown">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Sentiment Share</p>
                <p className="text-xs text-muted-foreground">Each slice shows article count and percent of total.</p>
              </div>
              <ChartContainer config={SENTIMENT_CHART_CONFIG} className="h-[220px]">
                <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={74}
                    labelLine={false}
                    label={renderPieValueLabel}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={getSentimentColor(entry.name === "Mixed" ? "neutral" : entry.name.toLowerCase())} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [value, name]} />
                </PieChart>
              </ChartContainer>
            </div>
            {barData.length > 0 && (
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Sentiment by Category</p>
                  <p className="text-xs text-muted-foreground">X-axis: topic category · Y-axis: article count.</p>
                </div>
                <ChartContainer config={SENTIMENT_CHART_CONFIG} className="h-[220px]">
                  <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 40 }}>
                    <XAxis
                      dataKey="category"
                      interval={0}
                      tick={{ fontSize: 10, angle: -30, textAnchor: "end", dy: 4 }}
                      height={52}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      label={{ value: "Articles", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="positive" fill="#22c55e" stackId="a">
                      <LabelList dataKey="positive" content={renderStackedLabel("white")} />
                    </Bar>
                    <Bar dataKey="mixed" fill="#eab308" stackId="a">
                      <LabelList dataKey="mixed" content={renderStackedLabel("#1f2937")} />
                    </Bar>
                    <Bar dataKey="negative" fill="#ef4444" stackId="a">
                      <LabelList dataKey="negative" content={renderStackedLabel("white")} />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </div>
        </CollapsibleSection>
      </CardContent>
    </Card>
  );
}
