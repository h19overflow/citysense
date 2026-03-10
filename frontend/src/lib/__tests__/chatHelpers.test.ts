import { describe, it, expect } from "vitest";
import {
  buildWelcomeMessage,
  buildUserMessage,
  buildArtifactForResponse,
  INITIAL_PROCESSING_STEPS,
} from "../chatHelpers";

// ------------------------------------------------------------------
// buildWelcomeMessage
// ------------------------------------------------------------------

describe("buildWelcomeMessage", () => {
  it("returns a message with role assistant", () => {
    const message = buildWelcomeMessage();
    expect(message.role).toBe("assistant");
  });

  it("returns a message with id 'welcome'", () => {
    const message = buildWelcomeMessage();
    expect(message.id).toBe("welcome");
  });

  it("returns a message with type text", () => {
    const message = buildWelcomeMessage();
    expect(message.type).toBe("text");
  });

  it("returns a non-empty content string", () => {
    const message = buildWelcomeMessage();
    expect(message.content.length).toBeGreaterThan(0);
  });

  it("returns chips as a non-empty array", () => {
    const message = buildWelcomeMessage();
    expect(Array.isArray(message.chips)).toBe(true);
    expect(message.chips.length).toBeGreaterThan(0);
  });

  it("returns all chips as non-empty strings", () => {
    const message = buildWelcomeMessage();
    for (const chip of message.chips) {
      expect(typeof chip).toBe("string");
      expect(chip.length).toBeGreaterThan(0);
    }
  });

  it("returns a consistent message shape on repeated calls", () => {
    const first = buildWelcomeMessage();
    const second = buildWelcomeMessage();
    expect(first.id).toBe(second.id);
    expect(first.content).toBe(second.content);
    expect(first.chips).toEqual(second.chips);
  });
});

// ------------------------------------------------------------------
// buildUserMessage
// ------------------------------------------------------------------

describe("buildUserMessage", () => {
  it("returns a message with role user", () => {
    const message = buildUserMessage("hello");
    expect(message.role).toBe("user");
  });

  it("returns a message with type text", () => {
    const message = buildUserMessage("hello");
    expect(message.type).toBe("text");
  });

  it("preserves the content string exactly", () => {
    const message = buildUserMessage("I need help with benefits");
    expect(message.content).toBe("I need help with benefits");
  });

  it("returns a string id", () => {
    const message = buildUserMessage("hello");
    expect(typeof message.id).toBe("string");
    expect(message.id.length).toBeGreaterThan(0);
  });

  it("handles empty string content without throwing", () => {
    const message = buildUserMessage("");
    expect(message.content).toBe("");
  });

  it("handles long content without truncating", () => {
    const longText = "a".repeat(1000);
    const message = buildUserMessage(longText);
    expect(message.content).toBe(longText);
  });
});

// ------------------------------------------------------------------
// buildArtifactForResponse
// ------------------------------------------------------------------

describe("buildArtifactForResponse", () => {
  it("returns an artifact for a known response type 'benefits-cliff'", () => {
    const artifact = buildArtifactForResponse("msg-1", "benefits-cliff");
    expect(artifact).not.toBeNull();
    expect(artifact!.title).toBe("Benefits Cliff Analysis");
  });

  it("returns an artifact for response type 'job-card'", () => {
    const artifact = buildArtifactForResponse("msg-2", "job-card");
    expect(artifact).not.toBeNull();
    expect(artifact!.title).toBe("Job Recommendations");
  });

  it("returns an artifact for response type 'medicaid'", () => {
    const artifact = buildArtifactForResponse("msg-3", "medicaid");
    expect(artifact!.title).toBe("Medicaid Coverage Options");
  });

  it("returns an artifact for response type 'skill-gap'", () => {
    const artifact = buildArtifactForResponse("msg-4", "skill-gap");
    expect(artifact!.title).toBe("Skill Gap Analysis");
  });

  it("returns an artifact for response type 'reentry'", () => {
    const artifact = buildArtifactForResponse("msg-5", "reentry");
    expect(artifact!.title).toBe("Reentry Resource Guide");
  });

  it("returns an artifact for response type 'pdf-preview'", () => {
    const artifact = buildArtifactForResponse("msg-6", "pdf-preview");
    expect(artifact!.title).toBe("Benefits Eligibility Report");
  });

  it("returns null for an unknown response type", () => {
    const artifact = buildArtifactForResponse("msg-7", "unknown-type");
    expect(artifact).toBeNull();
  });

  it("includes the messageId in the returned artifact", () => {
    const artifact = buildArtifactForResponse("msg-abc", "job-card");
    expect(artifact!.messageId).toBe("msg-abc");
  });

  it("sets the artifact id as 'artifact-{messageId}'", () => {
    const artifact = buildArtifactForResponse("msg-abc", "job-card");
    expect(artifact!.id).toBe("artifact-msg-abc");
  });

  it("sets type to 'A1' for all known response types", () => {
    const artifact = buildArtifactForResponse("msg-1", "medicaid");
    expect(artifact!.type).toBe("A1");
  });

  it("includes a createdAt Date object", () => {
    const artifact = buildArtifactForResponse("msg-1", "medicaid");
    expect(artifact!.createdAt).toBeInstanceOf(Date);
  });

  it("returns null for empty string response type", () => {
    const artifact = buildArtifactForResponse("msg-1", "");
    expect(artifact).toBeNull();
  });
});

// ------------------------------------------------------------------
// INITIAL_PROCESSING_STEPS (contract)
// ------------------------------------------------------------------

describe("INITIAL_PROCESSING_STEPS", () => {
  it("exports an array with exactly 3 steps", () => {
    expect(INITIAL_PROCESSING_STEPS).toHaveLength(3);
  });

  it("has the first step in_progress and the rest pending", () => {
    expect(INITIAL_PROCESSING_STEPS[0].status).toBe("in_progress");
    expect(INITIAL_PROCESSING_STEPS[1].status).toBe("pending");
    expect(INITIAL_PROCESSING_STEPS[2].status).toBe("pending");
  });

  it("has non-empty label strings for every step", () => {
    for (const step of INITIAL_PROCESSING_STEPS) {
      expect(typeof step.label).toBe("string");
      expect(step.label.length).toBeGreaterThan(0);
    }
  });
});
