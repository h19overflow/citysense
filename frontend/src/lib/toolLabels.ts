/** Maps raw tool names to user-friendly labels shown in the chat UI. */
const TOOL_LABELS: Record<string, string> = {
  get_sentiment_summary: "Checking city-wide sentiment",
  get_top_concerns: "Looking up top concerns",
  get_neighborhood_mood: "Analyzing neighborhood mood",
  get_article_details: "Reading article details",
  get_trending_articles: "Finding trending articles",
  search_news_by_topic: "Searching news",
  get_news_by_category: "Browsing news category",
  get_recent_comments: "Reading recent comments",
  search_montgomery_web: "Searching the web for Montgomery info",
};

export function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] ?? `Using ${toolName.replace(/_/g, " ")}`;
}
