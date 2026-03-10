import type { FlowMeta, MessageType, ActionItem, ProcessingStep } from "./common";
import type { ProfileData } from "./profile";
import type { MapCommand, PredictionHotspot } from "./map";
import type { ServiceCardData } from "./services";

export type CivicIntent =
  | "report_issue"
  | "find_service"
  | "city_events"
  | "traffic_or_disruption_reason"
  | "neighborhood_summary"
  | "suggest_next_step"
  | "new_resident"
  | "job_loss_support"
  | "trending_issues"
  | "public_safety"
  | "general";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type: MessageType;
  chips?: string[];
  flowMeta?: FlowMeta;
  profileData?: ProfileData;
  actionItems?: ActionItem[];
  processingSteps?: ProcessingStep[];
  mapAction?: MapCommand;
  hotspots?: PredictionHotspot[];
  serviceCards?: ServiceCardData[];
  serviceId?: string;
  serviceTitle?: string;
}

export interface AiChatResponse {
  intent: CivicIntent;
  answer: string;
  confidence: number;
  extracted_entities: Record<string, string | null>;
  follow_up_question: string | null;
  suggested_actions: { label: string; action_type: string; url?: string }[];
  source_items: ServiceCardData[];
  map_highlights: { lat: number; lng: number; label: string; category?: string }[];
  map_commands?: MapCommand[];
  chips: string[];
  answer_summary: string | null;
  reasoning_notes: string | null;
  warnings: string[];
  source_count: number;
}
