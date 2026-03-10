import type { AppState, ActionItem, ChatMessage } from "../../types";
import type { AppAction } from "../types";

function applyMessageSideEffects(state: AppState, message: ChatMessage): AppState {
  const next = { ...state, messages: [...state.messages, message] };
  if (message.flowMeta) next.activeFlow = message.flowMeta;
  if (message.profileData) next.profile = { ...state.profile, ...message.profileData };
  if (message.actionItems) next.actionItems = message.actionItems;
  if (message.role === "assistant" && !state.chatBubbleOpen) {
    next.chatBubbleHasUnread = true;
  }
  return next;
}

function toggleActionItemById(items: ActionItem[], targetId: string): ActionItem[] {
  return items.map((item) =>
    item.id === targetId ? { ...item, completed: !item.completed } : item
  );
}

export function applyChatAction(state: AppState, action: AppAction): AppState | null {
  switch (action.type) {
    case "ADD_MESSAGE":
      return applyMessageSideEffects(state, action.message);
    case "SET_LANGUAGE":
      return { ...state, language: action.language };
    case "SET_FLOW":
      return { ...state, activeFlow: action.flow };
    case "UPDATE_PROFILE":
      return { ...state, profile: { ...state.profile, ...action.data } };
    case "ADD_ARTIFACT":
      return { ...state, artifacts: [...state.artifacts, action.artifact] };
    case "SET_ACTIVE_ARTIFACT":
      return { ...state, activeArtifactId: action.id };
    case "SET_ACTION_ITEMS":
      return { ...state, actionItems: action.items };
    case "TOGGLE_ACTION_ITEM":
      return { ...state, actionItems: toggleActionItemById(state.actionItems, action.id) };
    case "SET_TYPING":
      return { ...state, isTyping: action.isTyping };
    case "SET_PROCESSING_STEPS":
      return { ...state, processingSteps: action.steps };
    case "TOGGLE_CHAT_BUBBLE":
      return {
        ...state,
        chatBubbleOpen: !state.chatBubbleOpen,
        chatBubbleHasUnread: state.chatBubbleOpen ? state.chatBubbleHasUnread : false,
      };
    case "SET_CHAT_BUBBLE_OPEN":
      return {
        ...state,
        chatBubbleOpen: action.open,
        chatBubbleHasUnread: action.open ? false : state.chatBubbleHasUnread,
      };
    case "MARK_CHAT_READ":
      return { ...state, chatBubbleHasUnread: false };
    default:
      return null;
  }
}
