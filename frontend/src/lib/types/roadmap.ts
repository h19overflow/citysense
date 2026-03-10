export interface RoadmapLocation {
  name: string;
  address: string;
  hours?: string;
  phone?: string | null;
}

export interface RoadmapStep {
  id: string;
  stepNumber: number;
  title: string;
  action: string;
  documents: string[];
  location?: RoadmapLocation | null;
  estimatedTime: string;
  proTip?: string | null;
  canDoOnline: boolean;
  onlineUrl?: string | null;
}

export interface PersonalizedRoadmap {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceCategory: string;
  eligibilityNote: string;
  totalEstimatedTime: string;
  steps: RoadmapStep[];
  generatedAt: string;
}
