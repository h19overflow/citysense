import { API_BASE } from "./apiConfig";
import type { CVAnalysisResult, CVJobStatus, PipelineEvent } from "./types";

export interface CvUploadResponse {
  job_id: string;
  cv_upload_id: string;
}

export async function uploadCv(
  file: File,
  citizenId: string,
): Promise<CvUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("citizen_id", citizenId);

  const response = await fetch(`${API_BASE}/api/cv/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Upload failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

export async function fetchLatestCv(
  citizenId: string,
): Promise<{ file_name: string; result: CVAnalysisResult } | null> {
  if (!citizenId) return null;
  const response = await fetch(
    `${API_BASE}/api/cv/latest?citizen_id=${encodeURIComponent(citizenId)}`,
  );
  if (response.status === 204 || !response.ok) return null;
  return response.json();
}

export async function fetchJobStatus(jobId: string): Promise<CVJobStatus> {
  const response = await fetch(`${API_BASE}/api/cv/jobs/${jobId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch job status (${response.status})`);
  }

  return response.json();
}

export function streamJobProgress(
  jobId: string,
  onEvent: (event: PipelineEvent) => void,
  onError?: (error: string) => void,
): () => void {
  const url = `${API_BASE}/api/cv/jobs/${jobId}/stream`;
  let eventSource: EventSource | null = new EventSource(url);
  let disposed = false;

  eventSource.onmessage = (raw) => {
    try {
      const event: PipelineEvent = JSON.parse(raw.data);
      if (typeof event.status !== "string" || typeof event.job_id !== "string") return;
      onEvent(event);
    } catch {
      console.warn("[CVStream] Failed to parse SSE message:", raw.data);
    }
  };

  eventSource.onerror = () => {
    if (!disposed) onError?.("Connection lost");
    eventSource?.close();
    eventSource = null;
  };

  return () => {
    disposed = true;
    eventSource?.close();
    eventSource = null;
  };
}
