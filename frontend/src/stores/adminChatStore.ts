import { create } from "zustand";

import { getToolLabel } from "@/lib/toolLabels";
import { readSseStream } from "@/lib/sseClient";
import { API_BASE } from "@/lib/apiConfig";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
}

type StreamState = "idle" | "streaming";

interface AdminChatState {
  messages: ChatMessage[];
  streamState: StreamState;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

const TOOL_MSG_ID = "active-tool-call";

function generateId(): string {
  return crypto.randomUUID();
}

export const useAdminChatStore = create<AdminChatState>((set, get) => ({
  messages: [],
  streamState: "idle",
  isOpen: false,
  setIsOpen: (open) => set({ isOpen: open }),

  sendMessage: async (text: string) => {
    if (get().streamState === "streaming") return;

    const userMsg: ChatMessage = { id: generateId(), role: "user", content: text };
    const assistantMsg: ChatMessage = { id: generateId(), role: "assistant", content: "" };
    const assistantId = assistantMsg.id;

    set((state) => ({
      messages: [...state.messages, userMsg, assistantMsg],
      streamState: "streaming",
    }));

    // Build history from prior messages (exclude tool messages and current empty assistant)
    const history = get()
      .messages.filter((m) => m.role !== "tool" && m.id !== assistantId && m.content.trim() !== "")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      await readSseStream(
        `${API_BASE}/api/chat`,
        { message: text, history },
        (token) => {
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + token } : m,
            ),
          }));
        },
        (toolName) => {
          // Replace the single tool indicator instead of stacking
          const label = getToolLabel(toolName);
          set((state) => {
            const hasToolMsg = state.messages.some((m) => m.id === TOOL_MSG_ID);
            if (hasToolMsg) {
              return {
                messages: state.messages.map((m) =>
                  m.id === TOOL_MSG_ID ? { ...m, content: label } : m,
                ),
              };
            }
            return {
              messages: [...state.messages, { id: TOOL_MSG_ID, role: "tool" as const, content: label }],
            };
          });
        },
      );
    } catch (error) {
      console.error("[adminChatStore] Stream failed:", error);
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Sorry, something went wrong. Please try again." }
            : m,
        ),
      }));
    } finally {
      set((state) => ({
        messages: state.messages.filter((m) => m.role !== "tool"),
        streamState: "idle",
      }));
    }
  },

  clearMessages: () => set({ messages: [], streamState: "idle" }),
}));
