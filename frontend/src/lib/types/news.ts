export type NewsCategory = "all" | "general" | "development" | "government" | "community" | "events";

export type ReactionType = "thumbs_up" | "thumbs_down" | "heart" | "sad" | "angry";

export interface NewsLocation {
  lat: number;
  lng: number;
  neighborhood: string;
  address: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  source: string;
  sourceUrl: string;
  imageUrl?: string | null;
  category: string;
  publishedAt: string;
  scrapedAt: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  sentiment?: "positive" | "negative" | "neutral";
  sentimentScore?: number;
  summary?: string;
  misinfoRisk?: number;
  misinfoReason?: string;
  reactionCounts?: Record<string, number>;
  flagCount?: number;
  location?: NewsLocation | null;
  communitySentiment?: "positive" | "negative" | "neutral";
  communityConfidence?: number;
  sentimentBreakdown?: Record<string, number>;
  communitySummary?: string;
  urgentConcerns?: string[];
}

export interface NewsComment {
  id: string;
  articleId: string;
  citizenId: string;
  citizenName: string;
  avatarInitials: string;
  avatarColor: string;
  content: string;
  createdAt: string;
}
