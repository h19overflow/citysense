import { describe, it, expect } from "vitest";
import { appReducer } from "../reducer";
import { initialState } from "../initialState";
import type { AppAction } from "../types";
import type { ChatMessage, JobListing } from "../../types";

const BASE_MESSAGE: ChatMessage = {
  id: "m1",
  role: "user",
  content: "Hello",
  timestamp: new Date().toISOString(),
};

const BASE_JOB: JobListing = {
  id: "j1",
  title: "Software Engineer",
  company: "Acme",
  source: "indeed",
  address: "Montgomery, AL",
  lat: 32.37,
  lng: -86.30,
  geocodeSource: "nominatim",
  jobType: "Full-time",
  salary: "$80k",
  seniority: "Mid",
  industry: "Tech",
  posted: "2026-03-01",
  url: "",
  applyLink: "",
  skills: {},
  skillSummary: "",
  benefits: [],
  scrapedAt: "2026-03-05T18:00:00Z",
};

describe("appReducer — ADD_MESSAGE", () => {
  it("appends the message to the messages array", () => {
    const action: AppAction = { type: "ADD_MESSAGE", message: BASE_MESSAGE };
    const nextState = appReducer(initialState, action);
    expect(nextState.messages).toHaveLength(1);
    expect(nextState.messages[0]).toEqual(BASE_MESSAGE);
  });

  it("preserves existing messages when adding a new one", () => {
    const stateWithOne = appReducer(initialState, { type: "ADD_MESSAGE", message: BASE_MESSAGE });
    const second: ChatMessage = { ...BASE_MESSAGE, id: "m2", content: "World" };
    const nextState = appReducer(stateWithOne, { type: "ADD_MESSAGE", message: second });
    expect(nextState.messages).toHaveLength(2);
    expect(nextState.messages[1].id).toBe("m2");
  });

  it("marks chatBubbleHasUnread when an assistant message arrives and bubble is closed", () => {
    const assistantMessage: ChatMessage = { ...BASE_MESSAGE, id: "m2", role: "assistant" };
    const nextState = appReducer(initialState, { type: "ADD_MESSAGE", message: assistantMessage });
    expect(nextState.chatBubbleHasUnread).toBe(true);
  });

  it("does NOT mark unread when assistant message arrives and bubble is open", () => {
    const openBubble = { ...initialState, chatBubbleOpen: true };
    const assistantMessage: ChatMessage = { ...BASE_MESSAGE, id: "m2", role: "assistant" };
    const nextState = appReducer(openBubble, { type: "ADD_MESSAGE", message: assistantMessage });
    expect(nextState.chatBubbleHasUnread).toBe(false);
  });

  it("does not mutate the original state", () => {
    const before = { ...initialState };
    appReducer(initialState, { type: "ADD_MESSAGE", message: BASE_MESSAGE });
    expect(initialState.messages).toEqual(before.messages);
  });
});

describe("appReducer — SET_JOB_LISTINGS", () => {
  it("replaces jobListings with the provided array", () => {
    const action: AppAction = { type: "SET_JOB_LISTINGS", listings: [BASE_JOB] };
    const nextState = appReducer(initialState, action);
    expect(nextState.jobListings).toHaveLength(1);
    expect(nextState.jobListings[0].id).toBe("j1");
  });

  it("clears existing listings when an empty array is dispatched", () => {
    const stateWithJobs = appReducer(initialState, { type: "SET_JOB_LISTINGS", listings: [BASE_JOB] });
    const nextState = appReducer(stateWithJobs, { type: "SET_JOB_LISTINGS", listings: [] });
    expect(nextState.jobListings).toHaveLength(0);
  });
});

describe("appReducer — MERGE_JOB_LISTINGS", () => {
  it("prepends only listings with new IDs", () => {
    const stateWithOne = appReducer(initialState, { type: "SET_JOB_LISTINGS", listings: [BASE_JOB] });
    const newJob: JobListing = { ...BASE_JOB, id: "j2", title: "Designer" };
    const nextState = appReducer(stateWithOne, { type: "MERGE_JOB_LISTINGS", listings: [BASE_JOB, newJob] });
    expect(nextState.jobListings).toHaveLength(2);
    expect(nextState.jobListings[0].id).toBe("j2");
  });

  it("skips duplicate IDs entirely", () => {
    const stateWithOne = appReducer(initialState, { type: "SET_JOB_LISTINGS", listings: [BASE_JOB] });
    const nextState = appReducer(stateWithOne, { type: "MERGE_JOB_LISTINGS", listings: [BASE_JOB] });
    expect(nextState.jobListings).toHaveLength(1);
  });
});

describe("appReducer — SET_VIEW", () => {
  it("updates activeView to the given view", () => {
    const action: AppAction = { type: "SET_VIEW", view: "jobs" };
    const nextState = appReducer(initialState, action);
    expect(nextState.activeView).toBe("jobs");
  });

  it("does not change other state fields", () => {
    const action: AppAction = { type: "SET_VIEW", view: "jobs" };
    const nextState = appReducer(initialState, action);
    expect(nextState.messages).toEqual(initialState.messages);
    expect(nextState.jobListings).toEqual(initialState.jobListings);
  });
});

describe("appReducer — SET_TYPING", () => {
  it("sets isTyping to true", () => {
    const nextState = appReducer(initialState, { type: "SET_TYPING", isTyping: true });
    expect(nextState.isTyping).toBe(true);
  });

  it("sets isTyping back to false", () => {
    const typing = appReducer(initialState, { type: "SET_TYPING", isTyping: true });
    const nextState = appReducer(typing, { type: "SET_TYPING", isTyping: false });
    expect(nextState.isTyping).toBe(false);
  });
});

describe("appReducer — TOGGLE_CHAT_BUBBLE", () => {
  it("opens the bubble when closed", () => {
    const nextState = appReducer(initialState, { type: "TOGGLE_CHAT_BUBBLE" });
    expect(nextState.chatBubbleOpen).toBe(true);
  });

  it("clears unread flag when opening the bubble", () => {
    const withUnread = { ...initialState, chatBubbleHasUnread: true };
    const nextState = appReducer(withUnread, { type: "TOGGLE_CHAT_BUBBLE" });
    expect(nextState.chatBubbleHasUnread).toBe(false);
  });

  it("closes the bubble when open", () => {
    const open = { ...initialState, chatBubbleOpen: true };
    const nextState = appReducer(open, { type: "TOGGLE_CHAT_BUBBLE" });
    expect(nextState.chatBubbleOpen).toBe(false);
  });
});

describe("appReducer — unknown action", () => {
  it("returns the same state reference for unrecognised action types", () => {
    const nextState = appReducer(initialState, { type: "UNKNOWN_ACTION" } as unknown as AppAction);
    expect(nextState).toBe(initialState);
  });
});
