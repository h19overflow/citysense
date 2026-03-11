import { useRef, useState } from "react";
import { CheckCircle } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { uploadCv, fetchJobStatus, streamJobProgress } from "@/lib/cvService";
import type { PipelineEvent } from "@/lib/types";
import { DropZoneArea } from "./DropZoneArea";

type UploadState = "idle" | "dragging" | "uploading" | "analyzing" | "complete" | "error";

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function UploadZone({ compact = false }: { compact?: boolean }) {
  const { state, dispatch } = useApp();
  const [uploadState, setUploadState] = useState<UploadState>(
    state.cvResult ? "complete" : "idle"
  );
  const [fileSize, setFileSize] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const handlePipelineEvent = (event: PipelineEvent) => {
    dispatch({ type: "SET_CV_PROGRESS", progress: event.progress_pct, stage: event.stage });

    if (event.status === "completed") {
      fetchJobStatus(event.job_id).then((job) => {
        if (job.result) {
          dispatch({ type: "SET_CV_RESULT", result: job.result });
          setUploadState("complete");
        }
      });
      cleanupRef.current?.();
    }

    if (event.status === "failed") {
      setErrorMessage(event.detail || "Analysis failed");
      setUploadState("error");
      dispatch({ type: "SET_CV_ANALYZING", analyzing: false });
      cleanupRef.current?.();
    }
  };

  const startAnalysis = async (file: File) => {
    setFileSize(formatFileSize(file.size));
    dispatch({ type: "SET_CV_FILE", fileName: file.name });
    setUploadState("uploading");
    setErrorMessage("");

    const citizenId = state.citizenMeta?.id ?? "";

    try {
      const { job_id } = await uploadCv(file, citizenId);
      dispatch({ type: "SET_CV_JOB", jobId: job_id });
      setUploadState("analyzing");
      dispatch({ type: "SET_CV_ANALYZING", analyzing: true });

      cleanupRef.current = streamJobProgress(job_id, handlePipelineEvent, (err) => {
        setErrorMessage(err);
        setUploadState("error");
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Upload failed");
      setUploadState("error");
      dispatch({ type: "SET_CV_ANALYZING", analyzing: false });
    }
  };

  const handleFileSelected = (file: File | undefined) => {
    if (!file) return;
    startAnalysis(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setUploadState("idle");
    handleFileSelected(event.dataTransfer.files[0]);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setUploadState("dragging");
  };

  const handleDragLeave = () => setUploadState("idle");
  const handleZoneClick = () => fileInputRef.current?.click();
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelected(event.target.files?.[0]);
  };

  const handleClearForReupload = () => {
    cleanupRef.current?.();
    dispatch({ type: "CLEAR_CV" });
    setUploadState("idle");
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fileName = state.cvFileName ?? "";

  const wrapperClass = compact
    ? "flex flex-col items-center justify-center p-3"
    : "flex flex-col h-full min-h-[300px] items-center justify-center p-4";

  return (
    <div className={wrapperClass}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        className="hidden"
        onChange={handleInputChange}
      />

      {(uploadState === "idle" || uploadState === "dragging") && (
        <DropZoneArea
          isDragging={uploadState === "dragging"}
          compact={compact}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleZoneClick}
        />
      )}

      {uploadState === "uploading" && (
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-foreground">{fileName}</p>
          <p className="text-xs text-muted-foreground">Uploading...</p>
        </div>
      )}

      {uploadState === "analyzing" && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-foreground">Analyzing your CV...</p>
          <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${state.cvProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">{state.cvStage || "Starting..."}</p>
        </div>
      )}

      {uploadState === "complete" && (
        <div className="flex flex-col items-center gap-2">
          <CheckCircle className={`${compact ? "w-7 h-7" : "w-10 h-10"} text-success`} />
          <p className="text-xs font-medium text-foreground">{fileName}</p>
          {fileSize && <p className="text-[10px] text-muted-foreground">{fileSize}</p>}
          <button
            onClick={handleClearForReupload}
            className="text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Upload a different CV
          </button>
        </div>
      )}

      {uploadState === "error" && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-destructive font-medium">{errorMessage}</p>
          <button
            onClick={handleClearForReupload}
            className="text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
