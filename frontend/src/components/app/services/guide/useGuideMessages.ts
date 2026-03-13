import { useEffect, useRef, useCallback } from "react";
import { useApp } from "@/lib/appContext";
import { generatePinGuideResponse } from "@/lib/guideResponses";
import { getSmartResponse } from "@/lib/aiChatService";
import type { GuideMessage } from "@/lib/types";

// Module-level claim set: whichever hook instance claims a pending message first wins.
// Prevents duplicate sends when multiple ServiceGuideChat instances are mounted.
const _claimedMessages = new Set<string>();

const WELCOME_MESSAGE: GuideMessage = {
  id: "guide-welcome",
  role: "assistant",
  content:
    "Hi! I'm your services guide. I can help you find and understand city services on the map — healthcare, childcare, education, and more. What are you looking for?",
};

export function useGuideMessages(setInput: (value: string) => void) {
  const { state, dispatch } = useApp();
  const prevPinRef = useRef<string | null>(null);
  const isSendingRef = useRef(false);

  useEffect(() => {
    dispatch({ type: "INIT_GUIDE_WELCOME", message: WELCOME_MESSAGE });
  }, []);

  useEffect(() => {
    const pin = state.selectedPin;
    if (!pin || pin.id === prevPinRef.current) return;
    prevPinRef.current = pin.id;

    dispatch({ type: "SET_GUIDE_TYPING", typing: true });
    setTimeout(() => {
      dispatch({ type: "ADD_GUIDE_MESSAGE", message: generatePinGuideResponse(pin) });
      dispatch({ type: "SET_GUIDE_TYPING", typing: false });
    }, 600);
  }, [state.selectedPin]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isSendingRef.current) return;
    isSendingRef.current = true;
    const userMsg: GuideMessage = {
      id: `guide-user-${Date.now()}`,
      role: "user",
      content: text.trim(),
    };
    dispatch({ type: "ADD_GUIDE_MESSAGE", message: userMsg });
    dispatch({ type: "SET_GUIDE_TYPING", typing: true });
    setInput("");

    const chatResponse = await getSmartResponse(text);
    const guideResponse: GuideMessage = {
      id: `guide-ai-${Date.now()}`,
      role: "assistant",
      content: chatResponse.content,
      chips: chatResponse.chips,
      serviceCards: chatResponse.serviceCards,
    };
    dispatch({ type: "ADD_GUIDE_MESSAGE", message: guideResponse });
    dispatch({ type: "SET_GUIDE_TYPING", typing: false });

    if (chatResponse.mapAction) {
      dispatch({ type: "SET_MAP_COMMAND", command: chatResponse.mapAction });
    }
    isSendingRef.current = false;
  }, [dispatch, setInput]);

  useEffect(() => {
    const msg = state.guidePendingMessage;
    if (!msg || _claimedMessages.has(msg)) return;
    _claimedMessages.add(msg);
    dispatch({ type: "CLEAR_GUIDE_PENDING" });
    sendMessage(msg).finally(() => {
      _claimedMessages.delete(msg);
    });
  }, [state.guidePendingMessage, dispatch, sendMessage]);

  function selectPinById(pinId: string) {
    const pin = state.servicePoints.find((p) => p.id === pinId);
    if (pin) dispatch({ type: "SET_SELECTED_PIN", pin });
  }

  return {
    messages: state.guideMessages,
    isTyping: state.guideTyping,
    sendMessage,
    selectPinById,
  };
}
