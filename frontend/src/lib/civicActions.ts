import type { CivicAction } from "./types";

export const CIVIC_ACTIONS: CivicAction[] = [
  {
    id: "ca-1",
    icon: "heart",
    title: "Free Health Screening",
    description:
      "Baptist Medical Center East offers free community health screenings. Walk-ins accepted Tuesdays and Thursdays.",
    category: "health",
    relatedPinId: "health-0",
    distance: "2.1 mi",
  },
  {
    id: "ca-2",
    icon: "baby",
    title: "Affordable Childcare Near You",
    description:
      "6 licensed daycare centers within 3 miles of your zip code accept childcare subsidies. Hours as early as 6:30 AM.",
    category: "childcare",
    relatedPinId: "childcare-0",
    distance: "0.8 mi",
  },
  {
    id: "ca-3",
    icon: "building",
    title: "Community Center Programs",
    description:
      "Armory Learning Arts Center offers free workforce readiness workshops and GED prep every weekday.",
    category: "community",
    relatedPinId: "community-0",
    distance: "1.4 mi",
  },
  {
    id: "ca-4",
    icon: "graduation-cap",
    title: "Enroll in Job Training",
    description:
      "Trenholm State Community College offers WIOA-funded certifications in forklift, CNA, and IT support.",
    category: "education",
    relatedPinId: "education-0",
    distance: "3.2 mi",
  },
  {
    id: "ca-5",
    icon: "book",
    title: "Free Computer Access & Wi-Fi",
    description:
      "Juliette Hampton Morgan Memorial Library provides free computer access, printing, and job search assistance.",
    category: "libraries",
    relatedPinId: "libraries-0",
    distance: "1.1 mi",
  },
  {
    id: "ca-6",
    icon: "heart",
    title: "Apply for Medicaid",
    description:
      "Based on your household size, you likely qualify for Alabama Medicaid. Nearest DHR office is on S Union St.",
    category: "health",
    distance: "1.2 mi",
  },
];
