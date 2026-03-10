import type { JobListing } from "../types";

export const transportJobs: JobListing[] = [
  {
    id: "j004",
    title: "CDL Truck Driver",
    company: "Montgomery Transport",
    source: "indeed",
    address: "Montgomery, AL 36104",
    lat: 32.37771,
    lng: -86.30908,
    geocodeSource: "nominatim",
    jobType: "Full-time",
    salary: "$22.00 - $28.00/hr",
    seniority: "Mid-Senior",
    industry: "Transportation",
    posted: "2026-03-04",
    url: "",
    applyLink: "",
    skills: {
      technical: ["cdl"],
      physical: ["driving", "lifting"],
      clearance: ["drug test", "background check"],
      experience: ["2 year"],
    },
    skillSummary: "cdl, driving, lifting, drug test, background check, 2 year",
    benefits: ["Health insurance", "PTO"],
    scrapedAt: "2026-03-05T18:00:00Z",
  },
];
