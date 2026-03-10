import {
  Heart,
  Building2,
  Baby,
  GraduationCap,
  ShieldAlert,
  BookOpen,
  Trees,
  Shield,
} from "lucide-react";
import type { ServiceCategory } from "@/lib/types";

export interface CategoryMeta {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  markerColor: string;
  description: string;
}

export interface MapCategoryConfig {
  id: ServiceCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  markerColor: string;
}

export const MAP_CATEGORIES: MapCategoryConfig[] = [
  { id: "health",    label: "Healthcare", icon: Heart,        color: "text-red-600 bg-red-50 border-red-200",       markerColor: "#E74C3C" },
  { id: "childcare", label: "Childcare",  icon: Baby,         color: "text-amber-600 bg-amber-50 border-amber-200", markerColor: "#F39C12" },
  { id: "education", label: "Education",  icon: GraduationCap,color: "text-blue-600 bg-blue-50 border-blue-200",    markerColor: "#3498DB" },
  { id: "community", label: "Community",  icon: Building2,    color: "text-emerald-600 bg-emerald-50 border-emerald-200", markerColor: "#2ECC71" },
  { id: "libraries", label: "Libraries",  icon: BookOpen,     color: "text-purple-600 bg-purple-50 border-purple-200", markerColor: "#9B59B6" },
  { id: "safety",    label: "Safety",     icon: ShieldAlert,  color: "text-orange-600 bg-orange-50 border-orange-200", markerColor: "#E67E22" },
  { id: "parks",     label: "Parks",      icon: Trees,        color: "text-green-600 bg-green-50 border-green-200",  markerColor: "#16A34A" },
  { id: "police",    label: "Police",     icon: Shield,       color: "text-slate-600 bg-slate-50 border-slate-200", markerColor: "#475569" },
];

export const CATEGORY_META: Record<ServiceCategory, CategoryMeta> = {
  health: {
    label: "Healthcare",
    icon: Heart,
    color: "text-red-600",
    markerColor: "#E74C3C",
    description: "Find hospitals, clinics, free screenings, and help enrolling in Medicaid or other health coverage.",
  },
  childcare: {
    label: "Childcare",
    icon: Baby,
    color: "text-amber-600",
    markerColor: "#F39C12",
    description: "Browse licensed daycare centers, learn about subsidies, and find after-school care options.",
  },
  education: {
    label: "Education & Training",
    icon: GraduationCap,
    color: "text-blue-600",
    markerColor: "#3498DB",
    description: "Explore schools, GED programs, workforce certifications, and job training opportunities.",
  },
  community: {
    label: "Community Centers",
    icon: Building2,
    color: "text-emerald-600",
    markerColor: "#2ECC71",
    description: "Discover workshops, food assistance programs, and neighborhood resources near you.",
  },
  libraries: {
    label: "Libraries",
    icon: BookOpen,
    color: "text-purple-600",
    markerColor: "#9B59B6",
    description: "Access free computers, Wi-Fi, printing services, and in-person job search assistance.",
  },
  safety: {
    label: "Fire & Safety",
    icon: ShieldAlert,
    color: "text-orange-600",
    markerColor: "#E67E22",
    description: "Locate fire stations and learn about emergency services and public safety programs.",
  },
  parks: {
    label: "Parks & Recreation",
    icon: Trees,
    color: "text-green-600",
    markerColor: "#16A34A",
    description: "Find parks, playgrounds, sports courts, and outdoor recreation areas across Montgomery.",
  },
  police: {
    label: "Police & Safety",
    icon: Shield,
    color: "text-slate-600",
    markerColor: "#475569",
    description: "Locate police stations, precincts, and public safety resources.",
  },
};
