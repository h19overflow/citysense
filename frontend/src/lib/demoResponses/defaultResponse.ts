import type { ChatMessage } from "../types";

export function getDefaultResponse(): ChatMessage {
  return {
    id: Date.now().toString(),
    role: "assistant",
    content: "I'm here to help! Tell me a bit about what you need, and I'll find the right resources for you in Montgomery.\n\nHere are some things I can help with:",
    type: "text",
    chips: [
      "I just got a job offer — will I lose my benefits?",
      "I lost my Medicaid — what do I do?",
      "I want to earn more — how do I move up?",
      "I'm a single parent juggling work and kids",
      "I'm new to Montgomery and need to get started",
      "I'm rebuilding after release — where do I begin?",
    ],
  };
}
