import { useRef, useState } from "react";
import { CheckCircle } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { MOCK_CV_DATA } from "@/lib/mockCvData";
import { ANALYSIS_STEPS, AnalyzingSteps } from "./AnalysisProgress";
import { DropZoneArea } from "./DropZoneArea";

type UploadState = "idle" | "dragging" | "uploading" | "analyzing" | "complete";

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function UploadZone({ compact = false }: { compact?: boolean }) {
  const { state, dispatch } = useApp();
  const [uploadState, setUploadState] = useState<UploadState>(
    state.cvData ? "complete" : "idle"
  );
  const [completedStepCount, setCompletedStepCount] = useState(0);
  const [fileSize, setFileSize] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startAnalysis = (file: File) => {
    setFileSize(formatFileSize(file.size));
    dispatch({ type: "SET_CV_FILE", fileName: file.name });
    setUploadState("uploading");

    setTimeout(() => {
      setUploadState("analyzing");
      dispatch({ type: "SET_CV_ANALYZING", analyzing: true });

      ANALYSIS_STEPS.forEach((step, index) => {
        setTimeout(() => setCompletedStepCount(index + 1), step.completeAfterMs);
      });

      setTimeout(() => {
        dispatch({ type: "SET_CV_DATA", data: MOCK_CV_DATA });
        setUploadState("complete");
      }, 2000);
    }, 600);
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
    dispatch({ type: "CLEAR_CV" });
    setUploadState("idle");
    setCompletedStepCount(0);
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
        <div className="flex flex-col items-center">
          <p className="text-xs font-medium text-foreground mb-1">Analyzing your CV...</p>
          <AnalyzingSteps completedCount={completedStepCount} />
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
    </div>
  );
}
