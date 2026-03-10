/**
 * Upskilling engine: analyzes skill gaps across the job market
 * and recommends the highest-impact skills to learn.
 */
import type {
  CvData,
  JobMatch,
  TrendingSkill,
  UpskillingSummary,
  UpskillPath,
  TrainingOption,
} from "./types";

const MONTGOMERY_TRAINING: Record<string, TrainingOption[]> = {
  "cdl": [
    { name: "CDL Training Program", provider: "Trenholm State CC", format: "in-person", cost: "low" },
    { name: "CDL Fast Track", provider: "Alabama CDL Academy", format: "in-person", cost: "moderate" },
  ],
  "forklift": [
    { name: "Forklift Certification", provider: "OSHA 10 Online", format: "online", cost: "low" },
    { name: "Warehouse Skills", provider: "Trenholm State CC", format: "in-person", cost: "low" },
  ],
  "cna": [
    { name: "CNA Certification", provider: "Trenholm State CC", format: "in-person", cost: "low" },
    { name: "CNA Online Prep", provider: "Red Cross", format: "hybrid", cost: "low" },
  ],
  "nursing": [
    { name: "LPN Program", provider: "Trenholm State CC", format: "in-person", cost: "moderate" },
  ],
  "hvac": [
    { name: "HVAC Technician", provider: "Trenholm State CC", format: "in-person", cost: "moderate" },
  ],
  "welding": [
    { name: "Welding Certificate", provider: "Trenholm State CC", format: "in-person", cost: "moderate" },
  ],
  "excel": [
    { name: "Excel Fundamentals", provider: "LinkedIn Learning", format: "online", cost: "free" },
    { name: "Computer Skills Lab", provider: "Montgomery City Library", format: "in-person", cost: "free" },
  ],
  "customer service": [
    { name: "Customer Service Skills", provider: "Coursera", format: "online", cost: "free" },
  ],
  "data entry": [
    { name: "Data Entry & Typing", provider: "Montgomery City Library", format: "in-person", cost: "free" },
  ],
  "python": [
    { name: "Python for Beginners", provider: "freeCodeCamp", format: "online", cost: "free" },
  ],
  "sql": [
    { name: "SQL Basics", provider: "Khan Academy", format: "online", cost: "free" },
  ],
  "phlebotomy": [
    { name: "Phlebotomy Technician", provider: "Trenholm State CC", format: "in-person", cost: "low" },
  ],
  "patient care": [
    { name: "Patient Care Technician", provider: "Trenholm State CC", format: "in-person", cost: "low" },
  ],
  "first aid": [
    { name: "First Aid/CPR", provider: "Red Cross Montgomery", format: "in-person", cost: "low" },
  ],
  "leadership": [
    { name: "Leadership Essentials", provider: "Coursera", format: "online", cost: "free" },
  ],
  "communication": [
    { name: "Business Communication", provider: "LinkedIn Learning", format: "online", cost: "free" },
  ],
  "electrical": [
    { name: "Electrical Apprenticeship", provider: "IBEW Local 136", format: "in-person", cost: "free" },
  ],
  "microsoft office": [
    { name: "Microsoft Office Suite", provider: "Montgomery City Library", format: "in-person", cost: "free" },
    { name: "Office 365 Training", provider: "LinkedIn Learning", format: "online", cost: "free" },
  ],
};

const WEEKS_ESTIMATE: Record<string, number> = {
  "cdl": 8,
  "forklift": 1,
  "cna": 6,
  "nursing": 52,
  "hvac": 24,
  "welding": 16,
  "excel": 2,
  "customer service": 1,
  "data entry": 2,
  "python": 8,
  "sql": 4,
  "phlebotomy": 8,
  "patient care": 6,
  "first aid": 1,
  "leadership": 2,
  "communication": 2,
  "electrical": 24,
  "microsoft office": 3,
};

function normalizeSkill(skill: string): string {
  return skill.toLowerCase().trim();
}

export function computeUpskillingSummary(
  cvData: CvData,
  jobMatches: JobMatch[],
  trendingSkills: TrendingSkill[],
): UpskillingSummary {
  const userSkillsNorm = cvData.skills.map(normalizeSkill);

  // Count how many jobs each missing skill would unlock (move from <40% to >=40%)
  const skillImpact: Record<string, { jobsUnlocked: number; category: string }> = {};

  for (const job of jobMatches) {
    for (const skill of job.missingSkills) {
      const norm = normalizeSkill(skill);
      if (!skillImpact[norm]) {
        skillImpact[norm] = { jobsUnlocked: 0, category: "" };
      }
      // Each missing skill from a below-threshold job is a potential unlock
      if (job.matchPercent < 40) {
        skillImpact[norm].jobsUnlocked++;
      }
    }
  }

  // Enrich with trending data
  for (const trend of trendingSkills) {
    const norm = normalizeSkill(trend.name);
    if (userSkillsNorm.some((s) => s.includes(norm) || norm.includes(s))) continue;
    if (!skillImpact[norm]) {
      skillImpact[norm] = { jobsUnlocked: 0, category: trend.category };
    }
    skillImpact[norm].category = trend.category;
  }

  // Build paths sorted by impact
  const paths: UpskillPath[] = Object.entries(skillImpact)
    .filter(([norm]) => !userSkillsNorm.some((s) => s.includes(norm) || norm.includes(s)))
    .map(([norm, { jobsUnlocked, category }]) => {
      const trending = trendingSkills.find((t) => normalizeSkill(t.name) === norm);
      return {
        skillName: trending?.name ?? norm.charAt(0).toUpperCase() + norm.slice(1),
        category: category || trending?.category || "technical",
        demandPercent: trending?.percent ?? 0,
        jobsUnlocked,
        estimatedWeeks: WEEKS_ESTIMATE[norm] ?? 4,
        trainingOptions: MONTGOMERY_TRAINING[norm] ?? [],
      };
    })
    .sort((a, b) => {
      // Sort by composite score: jobs unlocked + demand
      const scoreA = a.jobsUnlocked * 2 + a.demandPercent;
      const scoreB = b.jobsUnlocked * 2 + b.demandPercent;
      return scoreB - scoreA;
    });

  const currentMatchRate = jobMatches.length > 0
    ? Math.round(jobMatches.filter((j) => j.matchPercent >= 40).length / jobMatches.length * 100)
    : 0;

  // Quick wins: skills learnable in <= 2 weeks
  const quickWins = paths.filter((p) => p.estimatedWeeks <= 2).slice(0, 5);

  // Project match rate if user learns top 3 skills
  const topSkillNames = paths.slice(0, 3).map((p) => normalizeSkill(p.skillName));
  let projectedMatches = 0;
  for (const job of jobMatches) {
    const currentMissing = job.missingSkills.filter(
      (s) => !topSkillNames.some((t) => normalizeSkill(s).includes(t) || t.includes(normalizeSkill(s)))
    );
    const newMatched = job.matchedSkills.length + (job.missingSkills.length - currentMissing.length);
    const total = job.matchedSkills.length + job.missingSkills.length;
    const newPercent = total > 0 ? Math.round((newMatched / total) * 100) : 0;
    if (newPercent >= 40) projectedMatches++;
  }
  const projectedMatchRate = jobMatches.length > 0
    ? Math.round(projectedMatches / jobMatches.length * 100)
    : 0;

  return {
    currentMatchRate,
    projectedMatchRate,
    topPaths: paths.slice(0, 8),
    quickWins,
  };
}
