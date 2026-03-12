import { useCallback, useRef, useState } from "react";

export type CareerStatus = "idle" | "running" | "completed" | "failed";

export interface JobOpportunity {
  title: string;
  company: string;
  source: "local_db" | "web";
  url: string | null;
  match_percent: number;
  matched_skills: string[];
  missing_skills: string[];
}

export interface SkillGap {
  skill: string;
  importance: "critical" | "high" | "medium";
  target_roles: string[];
}

export interface UpskillResource {
  skill: string;
  resource_name: string;
  provider: string;
  url: string | null;
  is_local: boolean;
}

export interface CareerAgentResult {
  summary: string;
  job_opportunities: JobOpportunity[];
  skill_gaps: SkillGap[];
  upskill_resources: UpskillResource[];
  next_role_target: string;
  chips: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface CareerAgentState {
  status: CareerStatus;
  stage: string;
  progress: number;
  result: CareerAgentResult | null;
  error: string | null;
  jobId: string | null;
  messages: ChatMessage[];
}

export function useCareerAgent() {
  const [state, setState] = useState<CareerAgentState>({
    status: "idle",
    stage: "",
    progress: 0,
    result: null,
    error: null,
    jobId: null,
    messages: [],
  });
  const eventSourceRef = useRef<EventSource | null>(null);
  // Ref tracks current messages so sendMessage always reads the latest list,
  // avoiding the stale-closure problem with state.messages in useCallback.
  const messagesRef = useRef<ChatMessage[]>([]);

  const startAnalysis = useCallback(
    async (cvVersionId: string, citizenId: string) => {
      messagesRef.current = [];
      setState({
        status: "running",
        stage: "Starting analysis...",
        progress: 0,
        result: null,
        error: null,
        jobId: null,
        messages: [],
      });

      const response = await fetch("/api/career/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_upload_id: cvVersionId, citizen_id: citizenId }),
      });

      if (!response.ok) {
        setState((s) => ({ ...s, status: "failed", error: "Failed to start analysis" }));
        return;
      }

      const { job_id } = await response.json();
      setState((s) => ({ ...s, jobId: job_id }));

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(`/api/career/jobs/${job_id}/stream`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.status === "completed") {
          setState((s) => ({ ...s, status: "completed", stage: "Done", progress: 100, result: data.result, error: null, jobId: job_id }));
          es.close();
        } else if (data.status === "failed") {
          setState((s) => ({ ...s, status: "failed", error: data.stage }));
          es.close();
        } else {
          setState((s) => ({ ...s, stage: data.stage, progress: data.progress_pct }));
        }
      };

      es.onerror = () => {
        setState((s) => ({ ...s, status: "failed", error: "Stream connection lost" }));
        es.close();
      };
    },
    []
  );

  const sendMessage = useCallback(
    async (
      message: string,
      contextId: string,
      citizenId: string
    ): Promise<CareerAgentResult | null> => {
      // Read current history from ref (always up-to-date, no stale closure)
      const currentHistory = messagesRef.current;

      const userMessage: ChatMessage = { role: "user", content: message };
      const updatedMessages = [...currentHistory, userMessage];
      messagesRef.current = updatedMessages;
      setState((s) => ({ ...s, messages: updatedMessages }));

      const response = await fetch("/api/career/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          career_context_id: contextId,
          citizen_id: citizenId,
          history: currentHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!response.ok) return null;
      const result: CareerAgentResult = await response.json();

      const assistantMessage: ChatMessage = { role: "assistant", content: result.summary };
      const finalMessages = [...updatedMessages, assistantMessage];
      messagesRef.current = finalMessages;
      setState((s) => ({
        ...s,
        status: "completed",
        result,
        messages: finalMessages,
      }));
      return result;
    },
    []
  );

  return { ...state, startAnalysis, sendMessage };
}
