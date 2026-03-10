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

export interface CategoryCardConfig {
  id: ServiceCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Accent color for the left stripe and icon ring */
  accent: string;
  /** Icon container background */
  iconBg: string;
  /** Icon foreground color */
  iconColor: string;
}

export const CATEGORY_CARDS: CategoryCardConfig[] = [
  {
    id: "health",
    label: "Healthcare",
    description: "Hospitals, clinics, free screenings, and Medicaid enrollment help",
    icon: Heart,
    accent: "bg-red-500",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
  },
  {
    id: "childcare",
    label: "Childcare",
    description: "Licensed daycare centers, subsidies, and after-school programs",
    icon: Baby,
    accent: "bg-amber-500",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    id: "education",
    label: "Education & Training",
    description: "Schools, GED programs, job training, and workforce certifications",
    icon: GraduationCap,
    accent: "bg-blue-500",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    id: "community",
    label: "Community Centers",
    description: "Workshops, programs, food assistance, and neighborhood resources",
    icon: Building2,
    accent: "bg-emerald-500",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    id: "libraries",
    label: "Libraries",
    description: "Free computer access, Wi-Fi, printing, and job search assistance",
    icon: BookOpen,
    accent: "bg-purple-500",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    id: "safety",
    label: "Fire & Safety",
    description: "Fire stations, emergency services, and public safety resources",
    icon: ShieldAlert,
    accent: "bg-orange-500",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  {
    id: "parks",
    label: "Parks & Recreation",
    description: "Parks, playgrounds, sports facilities, and outdoor activities",
    icon: Trees,
    accent: "bg-green-500",
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    id: "police",
    label: "Police & Safety",
    description: "Police stations, precincts, and public safety facilities",
    icon: Shield,
    accent: "bg-slate-500",
    iconBg: "bg-slate-50",
    iconColor: "text-slate-600",
  },
];

export interface SituationCard {
  label: string;
  emoji: string;
  category: ServiceCategory;
}

export const SITUATION_CARDS: SituationCard[] = [
  { label: "I need medical help", emoji: "🏥", category: "health" },
  { label: "I need childcare", emoji: "👶", category: "childcare" },
  { label: "I need job training", emoji: "🎓", category: "education" },
];
