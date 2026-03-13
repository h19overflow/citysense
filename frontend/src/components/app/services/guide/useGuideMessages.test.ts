/**
 * Tests for the double-message prevention in useGuideMessages.
 *
 * Root cause: multiple ServiceGuideChat instances can be mounted simultaneously
 * (one in ServiceDetailView, one in ContextPanel). Each runs useGuideMessages
 * and both would see the same guidePendingMessage and call sendMessage — causing
 * duplicate user messages in the chat.
 *
 * Fix: module-level _claimedMessages Set — the first instance to claim a pending
 * message wins; all others skip it.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ----- Mocks ----------------------------------------------------------------

const mockDispatch = vi.fn();
let mockState: Record<string, unknown> = {};

vi.mock("@/lib/appContext", () => ({
  useApp: () => ({ state: mockState, dispatch: mockDispatch }),
}));

vi.mock("@/lib/guideResponses", () => ({
  generatePinGuideResponse: vi.fn(() => ({
    id: "pin-response",
    role: "assistant",
    content: "Here is info about the pin.",
  })),
}));

vi.mock("@/lib/aiChatService", () => ({
  getSmartResponse: vi.fn(async () => ({
    content: "AI response",
    chips: [],
    serviceCards: [],
    mapAction: null,
  })),
}));

// ----- Helpers --------------------------------------------------------------

// Import after mocks are set up
import { renderHook, act } from "@testing-library/react";
import { useGuideMessages } from "./useGuideMessages";

function buildState(overrides: Record<string, unknown> = {}) {
  return {
    guideMessages: [],
    guideTyping: false,
    guideInitialized: false,
    guidePendingMessage: null,
    selectedPin: null,
    servicePoints: [],
    ...overrides,
  };
}

// Reset module-level _claimedMessages between tests by re-importing the module
// (vitest isolates modules per test file so the Set persists within the file —
// we reset it by clearing side effects via beforeEach dispatch reset).

beforeEach(() => {
  vi.clearAllMocks();
  mockState = buildState();
});

// ----- Tests ----------------------------------------------------------------

describe("useGuideMessages — double-message prevention", () => {
  it("sends the message exactly once when a single instance is mounted", async () => {
    const pendingMsg = "Tell me about Service A";
    mockState = buildState({ guidePendingMessage: pendingMsg });

    const setInput = vi.fn();
    const { rerender } = renderHook(() => useGuideMessages(setInput));

    // Allow async sendMessage to resolve
    await act(async () => {});

    const addMessageCalls = mockDispatch.mock.calls.filter(
      (call) => call[0].type === "ADD_GUIDE_MESSAGE" && call[0].message?.role === "user"
    );

    expect(addMessageCalls).toHaveLength(1);
    expect(addMessageCalls[0][0].message.content).toBe(pendingMsg);

    rerender();
  });

  it("sends the message exactly once when two instances are mounted with the same pending message", async () => {
    const pendingMsg = "Tell me about Service B";
    mockState = buildState({ guidePendingMessage: pendingMsg });

    const setInput1 = vi.fn();
    const setInput2 = vi.fn();

    // Mount two instances simultaneously — simulates ServiceDetailView + ContextPanel
    const hook1 = renderHook(() => useGuideMessages(setInput1));
    const hook2 = renderHook(() => useGuideMessages(setInput2));

    await act(async () => {});

    const userMessageDispatches = mockDispatch.mock.calls.filter(
      (call) => call[0].type === "ADD_GUIDE_MESSAGE" && call[0].message?.role === "user"
    );

    expect(userMessageDispatches).toHaveLength(1);
    expect(userMessageDispatches[0][0].message.content).toBe(pendingMsg);

    hook1.unmount();
    hook2.unmount();
  });

  it("clears guidePendingMessage from state after consuming it", async () => {
    const pendingMsg = "Tell me about Service C";
    mockState = buildState({ guidePendingMessage: pendingMsg });

    const setInput = vi.fn();
    renderHook(() => useGuideMessages(setInput));

    await act(async () => {});

    const clearCalls = mockDispatch.mock.calls.filter(
      (call) => call[0].type === "CLEAR_GUIDE_PENDING"
    );
    expect(clearCalls).toHaveLength(1);
  });

  it("does not send when guidePendingMessage is null", async () => {
    mockState = buildState({ guidePendingMessage: null });

    const setInput = vi.fn();
    renderHook(() => useGuideMessages(setInput));

    await act(async () => {});

    const userMessageDispatches = mockDispatch.mock.calls.filter(
      (call) => call[0].type === "ADD_GUIDE_MESSAGE" && call[0].message?.role === "user"
    );
    expect(userMessageDispatches).toHaveLength(0);
  });

  it("does not send when text is empty", async () => {
    mockState = buildState({ guidePendingMessage: "   " });

    const setInput = vi.fn();
    renderHook(() => useGuideMessages(setInput));

    await act(async () => {});

    const userMessageDispatches = mockDispatch.mock.calls.filter(
      (call) => call[0].type === "ADD_GUIDE_MESSAGE" && call[0].message?.role === "user"
    );
    expect(userMessageDispatches).toHaveLength(0);
  });

  it("sendMessage clears the input field", async () => {
    mockState = buildState({ guidePendingMessage: "What services are near me?" });

    const setInput = vi.fn();
    renderHook(() => useGuideMessages(setInput));

    await act(async () => {});

    expect(setInput).toHaveBeenCalledWith("");
  });
});
