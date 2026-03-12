import type {
  ChatMessage,
  FlowMeta,
  ProfileData,
  ActionItem,
  Artifact,
  Language,
  ProcessingStep,
  CVAnalysisResult,
  AppView,
  ServicePoint,
  ServiceCategory,
  GuideMessage,
  JobListing,
  JobMatch,
  TrendingSkill,
  UpskillingSummary,
  TransitRoute,
  CommuteEstimate,
  CitizenMeta,
  NewsArticle,
  NewsCategory,
  NewsComment,
  MapCommand,
  ReactionType,
  HousingListing,
  PersonalizedRoadmap,
} from "../types";

export type AppAction =
  | { type: "ADD_MESSAGE"; message: ChatMessage }
  | { type: "SET_LANGUAGE"; language: Language }
  | { type: "SET_VIEW"; view: AppView }
  | { type: "SET_FLOW"; flow: FlowMeta | null }
  | { type: "UPDATE_PROFILE"; data: Partial<ProfileData> }
  | { type: "ADD_ARTIFACT"; artifact: Artifact }
  | { type: "SET_ACTIVE_ARTIFACT"; id: string | null }
  | { type: "SET_ACTION_ITEMS"; items: ActionItem[] }
  | { type: "TOGGLE_ACTION_ITEM"; id: string }
  | { type: "SET_TYPING"; isTyping: boolean }
  | { type: "SET_PROCESSING_STEPS"; steps: ProcessingStep[] }
  | { type: "SET_CV_RESULT"; result: CVAnalysisResult }
  | { type: "SET_CV_FILE"; fileName: string | null }
  | { type: "SET_CV_ANALYZING"; analyzing: boolean }
  | { type: "SET_CV_JOB"; jobId: string }
  | { type: "SET_CV_PROGRESS"; progress: number; stage: string }
  | { type: "CLEAR_CV" }
  | { type: "SET_SELECTED_PIN"; pin: ServicePoint | null }
  | { type: "TOGGLE_CATEGORY"; category: ServiceCategory }
  | { type: "SET_SERVICE_POINTS"; points: ServicePoint[] }
  | { type: "ADD_SERVICE_POINTS"; points: ServicePoint[] }
  | { type: "INIT_GUIDE_WELCOME"; message: GuideMessage }
  | { type: "ADD_GUIDE_MESSAGE"; message: GuideMessage }
  | { type: "SET_GUIDE_TYPING"; typing: boolean }
  | { type: "SET_JOB_LISTINGS"; listings: JobListing[] }
  | { type: "SET_JOB_MATCHES"; matches: JobMatch[] }
  | { type: "SET_TRENDING_SKILLS"; skills: TrendingSkill[] }
  | { type: "SET_JOBS_LOADING"; loading: boolean }
  | { type: "SET_UPSKILLING_SUMMARY"; summary: UpskillingSummary | null }
  | { type: "SET_TRANSIT_ROUTES"; routes: TransitRoute[] }
  | { type: "SET_COMMUTE_ESTIMATES"; estimates: CommuteEstimate[] }
  | { type: "SET_CITIZEN_META"; meta: CitizenMeta | null }
  | { type: "SET_NEWS_ARTICLES"; articles: NewsArticle[] }
  | { type: "SET_NEWS_LOADING"; loading: boolean }
  | { type: "SET_NEWS_CATEGORY"; category: NewsCategory }
  | { type: "TOGGLE_ARTICLE_LIKE"; articleId: string }
  | { type: "ADD_NEWS_COMMENT"; comment: NewsComment }
  | { type: "SET_SELECTED_ARTICLE"; articleId: string | null }
  | { type: "TOGGLE_CHAT_BUBBLE" }
  | { type: "SET_CHAT_BUBBLE_OPEN"; open: boolean }
  | { type: "MARK_CHAT_READ" }
  | { type: "MERGE_JOB_LISTINGS"; listings: JobListing[] }
  | { type: "MERGE_NEWS_ARTICLES"; articles: NewsArticle[] }
  | { type: "MERGE_HOUSING_LISTINGS"; listings: HousingListing[] }
  | { type: "TOGGLE_NEWS_MAP" }
  | { type: "SET_NEWS_MAP_MODE"; mode: "pins" | "heat" }
  | { type: "SET_ARTICLE_REACTION"; articleId: string; reaction: ReactionType }
  | { type: "SET_EMOJI_REACTION"; articleId: string; emoji: string }
  | { type: "TOGGLE_ARTICLE_FLAG"; articleId: string }
  | { type: "UPDATE_MISINFO_SCORES"; scores: { articleId: string; risk: number; reason: string }[] }
  | { type: "SET_NEWS_COMMENTS"; comments: NewsComment[] }
  | { type: "SET_MAP_COMMAND"; command: MapCommand }
  | { type: "CLEAR_MAP_COMMAND" }
  | { type: "SEND_GUIDE_MESSAGE"; message: string }
  | { type: "CLEAR_GUIDE_PENDING" }
  | { type: "SET_ACTIVE_ROADMAP"; roadmap: PersonalizedRoadmap }
  | { type: "CLEAR_ROADMAP" }
  | { type: "TOGGLE_ROADMAP_STEP"; stepId: string };
