import type { ReactionType } from "./types";

const STORAGE_KEY = "montgomery-news-reactions";

interface StoredReactions {
  reactions: Record<string, Record<ReactionType, number>>;
  userReactions: Record<string, ReactionType>;
}

export function loadStoredReactions(): StoredReactions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { reactions: {}, userReactions: {} };
    return JSON.parse(raw) as StoredReactions;
  } catch {
    return { reactions: {}, userReactions: {} };
  }
}

export function saveReactions(data: StoredReactions): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}
