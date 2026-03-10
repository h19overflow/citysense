import type { AppState } from "../../types";
import type { AppAction } from "../types";

export function applyNewsAction(state: AppState, action: AppAction): AppState | null {
  switch (action.type) {
    case "SET_NEWS_ARTICLES":
      return { ...state, newsArticles: action.articles };
    case "SET_NEWS_LOADING":
      return { ...state, newsLoading: action.loading };
    case "SET_NEWS_CATEGORY":
      return { ...state, newsCategory: action.category };
    case "SET_SELECTED_ARTICLE":
      return { ...state, selectedArticleId: action.articleId };
    case "TOGGLE_NEWS_MAP":
      return { ...state, newsMapVisible: !state.newsMapVisible };
    case "SET_NEWS_MAP_MODE":
      return { ...state, newsMapMode: action.mode };
    case "SET_NEWS_COMMENTS":
      return { ...state, newsComments: action.comments };
    case "MERGE_NEWS_ARTICLES": {
      const existingIds = new Set(state.newsArticles.map((a) => a.id));
      const fresh = action.articles.filter((a) => !existingIds.has(a.id));
      return { ...state, newsArticles: [...fresh, ...state.newsArticles] };
    }
    case "TOGGLE_ARTICLE_LIKE": {
      const wasLiked = state.likedArticleIds.includes(action.articleId);
      return {
        ...state,
        likedArticleIds: wasLiked
          ? state.likedArticleIds.filter((id) => id !== action.articleId)
          : [...state.likedArticleIds, action.articleId],
        newsArticles: state.newsArticles.map((a) =>
          a.id === action.articleId
            ? { ...a, upvotes: a.upvotes + (wasLiked ? -1 : 1) }
            : a
        ),
      };
    }
    case "ADD_NEWS_COMMENT":
      return {
        ...state,
        newsComments: [...state.newsComments, action.comment],
        newsArticles: state.newsArticles.map((a) =>
          a.id === action.comment.articleId
            ? { ...a, commentCount: a.commentCount + 1 }
            : a
        ),
      };
    case "SET_ARTICLE_REACTION": {
      const prev = state.newsReactions[action.articleId] ?? {};
      const oldReaction = state.userReactions[action.articleId];
      const updated = { ...prev };
      if (oldReaction) {
        updated[oldReaction] = Math.max((updated[oldReaction] ?? 0) - 1, 0);
      }
      updated[action.reaction] = (updated[action.reaction] ?? 0) + 1;
      return {
        ...state,
        newsReactions: { ...state.newsReactions, [action.articleId]: updated },
        userReactions: { ...state.userReactions, [action.articleId]: action.reaction },
      };
    }
    case "SET_EMOJI_REACTION": {
      const prev = state.articleReactions[action.articleId];
      if (prev === action.emoji) {
        const { [action.articleId]: _, ...rest } = state.articleReactions;
        return { ...state, articleReactions: rest };
      }
      return {
        ...state,
        articleReactions: { ...state.articleReactions, [action.articleId]: action.emoji },
      };
    }
    case "TOGGLE_ARTICLE_FLAG": {
      const wasFlagged = state.flaggedArticleIds.includes(action.articleId);
      return {
        ...state,
        flaggedArticleIds: wasFlagged
          ? state.flaggedArticleIds.filter((id) => id !== action.articleId)
          : [...state.flaggedArticleIds, action.articleId],
        newsArticles: state.newsArticles.map((a) =>
          a.id === action.articleId
            ? { ...a, flagCount: (a.flagCount ?? 0) + (wasFlagged ? -1 : 1) }
            : a,
        ),
      };
    }
    case "UPDATE_MISINFO_SCORES":
      return {
        ...state,
        newsArticles: state.newsArticles.map((a) => {
          const score = action.scores.find((s) => s.articleId === a.id);
          return score ? { ...a, misinfoRisk: score.risk, misinfoReason: score.reason } : a;
        }),
      };
    default:
      return null;
  }
}
