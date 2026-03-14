// Growth plan domain types — mirrors backend agents/growth/schemas.py

export interface SkillStep {
  skill: string;
  why: string;
  resource: string;
  resource_type: "course" | "book" | "project" | "community";
}

export interface RoadmapPath {
  title: string;
  rationale: string;
  timeline_estimate: string;
  target_role: string;
  unfair_advantage: string;
  skill_steps: SkillStep[];
}

export interface GapQuestion {
  id: string;
  question: string;
  context: string;
  path_relevance: string[];
}

export interface GrowthAnalysis {
  id: string;
  version_number: number;
  stage: "preliminary" | "final";
  confidence_scores: Record<string, number>;
  gap_questions: GapQuestion[];
  gap_answers: Record<string, string> | null;
  path_fill_gap: RoadmapPath;
  path_multidisciplinary: RoadmapPath;
  path_pivot: RoadmapPath;
  diff_summary: string | null;
  created_at: string;
}

export interface GrowthIntakeForm {
  career_goal: string;
  target_timeline: string;
  learning_style: string;
  current_frustrations: string;
  external_links: string[];
}

export type PathKey = "fill_gap" | "multidisciplinary" | "pivot";

export type GrowthStage =
  | "idle"
  | "submitting"
  | "crawling"
  | "preliminary"
  | "answering"
  | "finalizing"
  | "final"
  | "returning";

export interface GrowthProgressData {
  stage: string;
  message: string;
  progress: number;
}
