export interface JobSkills {
  education?: string[];
  technical?: string[];
  healthcare?: string[];
  soft_skills?: string[];
  experience?: string[];
  physical?: string[];
  clearance?: string[];
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  source: "indeed" | "linkedin" | string;
  address: string;
  lat: number;
  lng: number;
  geocodeSource: string;
  jobType: string;
  salary: string;
  seniority: string;
  industry: string;
  applicants?: number;
  posted: string;
  url: string;
  applyLink: string;
  skills: JobSkills;
  skillSummary: string;
  benefits: string[];
  scrapedAt: string;
}

export interface JobMatch extends JobListing {
  matchPercent: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface TrendingSkill {
  name: string;
  rawKey: string;
  category: string;
  count: number;
  percent: number;
}

export interface UpskillPath {
  skillName: string;
  category: string;
  demandPercent: number;
  jobsUnlocked: number;
  estimatedWeeks: number;
  trainingOptions: TrainingOption[];
}

export interface TrainingOption {
  name: string;
  provider: string;
  format: "online" | "in-person" | "hybrid";
  cost: "free" | "low" | "moderate";
  url?: string;
}

export interface UpskillingSummary {
  currentMatchRate: number;
  projectedMatchRate: number;
  topPaths: UpskillPath[];
  quickWins: UpskillPath[];
}

export interface TransitRoute {
  id: string;
  name: string;
  number: string;
  schedule: {
    weekday?: { start: string; end: string; frequencyMinutes: number };
    saturday?: { start: string; end: string; frequencyMinutes: number };
  };
  description?: string;
}

export interface CommuteEstimate {
  jobId: string;
  jobTitle: string;
  company: string;
  distanceMiles: number;
  drivingMinutes: number;
  transitMinutes: number | null;
  transitRoutes: string[];
  walkingMinutes: number | null;
}
