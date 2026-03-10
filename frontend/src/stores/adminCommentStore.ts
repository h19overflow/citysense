import { create } from "zustand";
import { fetchNewsComments } from "@/lib/newsService";
import type { NewsComment } from "@/lib/types";

interface AdminCommentState {
  comments: NewsComment[];
  isLoading: boolean;
  hasFetched: boolean;
  fetchComments: () => Promise<void>;
  mergeWithLocal: (localComments: NewsComment[]) => NewsComment[];
}

export const useAdminCommentStore = create<AdminCommentState>((set, get) => ({
  comments: [],
  isLoading: false,
  hasFetched: false,

  fetchComments: async () => {
    if (get().hasFetched) return;
    set({ isLoading: true });
    try {
      const seeded = await fetchNewsComments();
      set({ comments: seeded, hasFetched: true });
    } catch (error) {
      console.error("[adminCommentStore] Failed to fetch:", error);
      set({ hasFetched: true });
    } finally {
      set({ isLoading: false });
    }
  },

  mergeWithLocal: (localComments: NewsComment[]) => {
    const apiComments = get().comments;
    const seen = new Set<string>();
    const merged: NewsComment[] = [];
    for (const c of [...apiComments, ...localComments]) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        merged.push(c);
      }
    }
    return merged;
  },
}));
