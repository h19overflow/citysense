export type ServiceCategory =
  | "health"
  | "community"
  | "childcare"
  | "education"
  | "safety"
  | "libraries"
  | "parks"
  | "police";

export interface ServicePoint {
  id: string;
  category: ServiceCategory;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  hours?: string;
  website?: string;
  details?: Record<string, string>;
}

export interface CivicAction {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: ServiceCategory;
  relatedPinId?: string;
  distance?: string;
}

export interface ServiceCardData {
  title: string;
  description: string | null;
  category: string | null;
  phone: string | null;
  address: string | null;
  url: string | null;
  hours: string | null;
  wait_time: string | null;
  what_to_bring: string[];
  programs: string[];
}

export interface GuideMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pinIds?: string[];
  chips?: string[];
  serviceCards?: ServiceCardData[];
}
