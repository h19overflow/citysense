import type { CvData } from "./types";

export const MOCK_CV_DATA: CvData = {
  name: "Sarah Mitchell",
  email: "sarah.mitchell@email.com",
  phone: "(334) 555-0147",
  location: "Montgomery, AL 36104",
  experience: [
    {
      company: "Amazon Fulfillment Center",
      location: "Montgomery, AL",
      title: "Fulfillment Associate → Shift Lead",
      period: "Mar 2022 – Present",
      duration: "3 years",
      bullets: [
        "Processed 150+ packages daily with 99.2% accuracy rate",
        "Trained 12 new team members on safety protocols and warehouse systems",
        "Promoted to shift lead after 18 months based on performance metrics",
      ],
    },
    {
      company: "Walmart Supercenter",
      location: "Prattville, AL",
      title: "Cashier / Customer Service",
      period: "Jun 2019 – Feb 2022",
      duration: "2 yr 8 mo",
      bullets: [
        "Handled $5,000+ in daily transactions with zero discrepancies",
        "Resolved customer complaints, maintained 4.8/5 satisfaction rating",
        "Managed self-checkout area for 8 registers during peak hours",
      ],
    },
  ],
  education: [
    {
      school: "Jefferson Davis High School",
      location: "Montgomery, AL",
      degree: "High School Diploma",
      year: "2019",
    },
  ],
  skills: [
    "Customer Service",
    "Inventory Management",
    "Team Leadership",
    "Cash Handling",
    "Safety Protocols",
    "Forklift Certified",
    "Microsoft Office",
    "Bilingual: EN/ES",
  ],
  summary:
    "3+ years in fulfillment and logistics with proven leadership trajectory. Strong candidate for Quality Control Technician (via AIDT certification), Shift Supervisor (current trajectory), or Warehouse Operations Manager (12-month development path).",
};
