import { API_BASE } from "./apiConfig";
import { connectSseStream } from "./sseClient";
import type { CVJobStatus, PipelineEvent } from "./types";

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
  return connectSseStream({
    url: `${API_BASE}/api/cv/jobs/${jobId}/stream`,
    onMessage: (msg) => {
      const data = msg.data as Record<string, unknown>;
      if (!data || typeof data.status !== "string" || typeof data.job_id !== "string") return;
      onEvent(data as unknown as PipelineEvent);
    },
    onStatusChange: (connected) => {
      if (!connected && onError) {
        onError("Connection lost");
      }
    },
  });
}
