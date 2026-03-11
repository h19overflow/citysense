export interface ExperienceEntry {
  role: string;
  company: string;
  duration: string;
  description: string;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  year: string;
}

export interface CVAnalysisResult {
  experience: ExperienceEntry[];
  skills: string[];
  soft_skills: string[];
  tools: string[];
  roles: string[];
  education: EducationEntry[];
  summary: string;
  page_count: number;
}

export interface PipelineEvent {
  job_id: string;
  status: "queued" | "ingesting" | "analyzing" | "aggregating" | "completed" | "failed";
  stage: string;
  page: number | null;
  total_pages: number | null;
  detail: string;
  progress_pct: number;
}

export interface CVJobStatus {
  job_id: string;
  status: string;
  stage: string;
  progress_pct: number;
  total_pages: number | null;
  error: string | null;
  result: CVAnalysisResult | null;
}
