import type { AppState } from "../../types";
import type { AppAction } from "../types";

export function applyCvAction(state: AppState, action: AppAction): AppState | null {
  switch (action.type) {
    case "SET_CV_RESULT":
      return { ...state, cvResult: action.result, cvAnalyzing: false };
    case "SET_CV_FILE":
      return { ...state, cvFileName: action.fileName };
    case "SET_CV_ANALYZING":
      return { ...state, cvAnalyzing: action.analyzing };
    case "SET_CV_JOB":
      return { ...state, cvJobId: action.jobId };
    case "SET_CV_UPLOAD_ID":
      return { ...state, cvUploadId: action.uploadId };
    case "SET_CV_PROGRESS":
      return { ...state, cvProgress: action.progress, cvStage: action.stage };
    case "CLEAR_CV":
      return {
        ...state,
        cvResult: null,
        cvFileName: null,
        cvAnalyzing: false,
        cvJobId: null,
        cvUploadId: null,
        cvProgress: 0,
        cvStage: "",
      };
    default:
      return null;
  }
}
