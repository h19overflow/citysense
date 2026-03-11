/**
 * Job matching engine: compares user CV skills against job requirements.
 * Separates actual skills from requirements (clearance, physical, experience).
 */
import type { JobListing, JobMatch, TrendingSkill } from "./types";
import type { CVAnalysisResult } from "./types/cv";
import {
  SKILL_CATEGORIES,
  HEALTHCARE_ONLY_SKILLS,
  HEALTHCARE_TITLE_PATTERNS,
  normalizeSkill,
  displayName,
  flattenSkillCategories,
  normalizeCvSkills,
} from "./jobMatcherHelpers";

/** Categories that are job requirements, not skills to develop */
const REQUIREMENT_CATEGORIES = new Set(["clearance", "physical", "experience"]);

/**
 * Checks if a job genuinely requires a specific skill.
 * Guards against false positives from the skill extraction pipeline
 * (e.g., "rn" extracted from "learn"/"return" in non-healthcare jobs).
 */
export function jobMatchesSkillFilter(job: JobListing, rawSkillKey: string): boolean {
  const skillInSummary = job.skillSummary.toLowerCase().includes(rawSkillKey);
  if (!skillInSummary) return false;

  if (HEALTHCARE_ONLY_SKILLS.has(rawSkillKey)) {
    return HEALTHCARE_TITLE_PATTERNS.test(job.title);
  }

  return true;
}

export function matchJobsToProfile(
  jobs: JobListing[],
  cvResult: CVAnalysisResult,
): JobMatch[] {
  const userSkills = normalizeCvSkills(cvResult.skills);

  const matches: JobMatch[] = jobs.map((job) => {
    const requiredSkills = flattenSkillCategories(job.skills);

    const matched = requiredSkills.filter((skill) =>
      userSkills.some((us) => us.includes(skill) || skill.includes(us))
    );
    const missing = requiredSkills.filter(
      (skill) => !userSkills.some((us) => us.includes(skill) || skill.includes(us))
    );

    const matchPercent = requiredSkills.length > 0
      ? Math.round((matched.length / requiredSkills.length) * 100)
      : 0;

    return {
      ...job,
      matchPercent,
      matchedSkills: matched.map(displayName),
      missingSkills: missing.map(displayName),
    };
  });

  return matches.sort((a, b) => b.matchPercent - a.matchPercent);
}

export function computeTrendingSkills(jobs: JobListing[]): TrendingSkill[] {
  const skillCounts: Record<string, { rawKey: string; category: string; count: number }> = {};

  for (const job of jobs) {
    for (const [category, keywords] of Object.entries(job.skills)) {
      if (!SKILL_CATEGORIES.has(category) || !Array.isArray(keywords)) continue;

      for (const keyword of keywords) {
        const key = normalizeSkill(keyword);
        if (HEALTHCARE_ONLY_SKILLS.has(key) && !HEALTHCARE_TITLE_PATTERNS.test(job.title)) continue;
        const display = displayName(key);
        if (!skillCounts[display]) {
          skillCounts[display] = { rawKey: key, category, count: 0 };
        }
        skillCounts[display].count++;
      }
    }
  }

  const total = jobs.length || 1;
  return Object.entries(skillCounts)
    .map(([name, { rawKey, category, count }]) => ({
      name,
      rawKey,
      category,
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}
