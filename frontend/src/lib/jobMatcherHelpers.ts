/**
 * Helpers for job matching: normalization, display names, and skill extraction.
 */

/** Categories that represent actual learnable/marketable skills */
export const SKILL_CATEGORIES = new Set(["technical", "healthcare", "soft_skills", "education"]);

/** Healthcare-specific skills that should only match healthcare-titled jobs */
export const HEALTHCARE_ONLY_SKILLS = new Set([
  "rn", "lpn", "cna", "emt", "cpr", "phlebotomy", "nursing", "patient care", "clinical",
]);

export const HEALTHCARE_TITLE_PATTERNS =
  /nurse|nurs|rn\b|lpn|cna|medical|health|hospital|clinic|care\b|pharm|emt|paramedic|dental|therapy|therapist/i;

/** Pretty-print skill names for display */
const DISPLAY_NAMES: Record<string, string> = {
  "cdl": "CDL License",
  "hvac": "HVAC",
  "cna": "CNA Certification",
  "rn": "Registered Nurse (RN)",
  "lpn": "LPN",
  "cpr": "CPR Certified",
  "emt": "EMT",
  "cnc": "CNC Operation",
  "autocad": "AutoCAD",
  "sql": "SQL",
  "python": "Python",
  "ged": "GED",
  "microsoft office": "Microsoft Office",
  "excel": "Excel",
  "data entry": "Data Entry",
  "customer service": "Customer Service",
  "problem solving": "Problem Solving",
  "time management": "Time Management",
  "detail oriented": "Attention to Detail",
  "patient care": "Patient Care",
  "first aid": "First Aid",
  "phlebotomy": "Phlebotomy",
  "pharmacy": "Pharmacy",
  "clinical": "Clinical Experience",
  "nursing": "Nursing",
  "leadership": "Leadership",
  "teamwork": "Teamwork",
  "communication": "Communication",
  "organizational": "Organization",
  "forklift": "Forklift Operation",
  "welding": "Welding",
  "electrical": "Electrical",
  "plumbing": "Plumbing",
  "mechanical": "Mechanical",
  "computer": "Computer Skills",
  "software": "Software",
  "programming": "Programming",
};

const CV_SKILL_EXPANSIONS: Record<string, string[]> = {
  "customer service": ["customer service"],
  "inventory management": ["warehouse", "inventory"],
  "team leadership": ["leadership", "teamwork"],
  "cash handling": ["cash handling"],
  "safety protocols": ["safety"],
  "forklift certified": ["forklift"],
  "microsoft office": ["microsoft office", "excel", "computer"],
  "bilingual: en/es": ["communication"],
  "data entry": ["data entry"],
  "cdl": ["cdl"],
  "cna": ["cna"],
  "rn": ["rn", "nursing"],
  "hvac": ["hvac"],
  "welding": ["welding"],
  "electrical": ["electrical"],
  "plumbing": ["plumbing"],
  "python": ["python", "programming"],
  "sql": ["sql"],
};

export function normalizeSkill(skill: string): string {
  return skill.toLowerCase().trim();
}

export function displayName(skill: string): string {
  return DISPLAY_NAMES[skill] ?? skill.charAt(0).toUpperCase() + skill.slice(1);
}

export function flattenSkillCategories(skills: Record<string, unknown>): string[] {
  const all: string[] = [];
  for (const [category, keywords] of Object.entries(skills)) {
    if (!SKILL_CATEGORIES.has(category) || !Array.isArray(keywords)) continue;
    all.push(...keywords);
  }
  return [...new Set(all.map(normalizeSkill))];
}

export function normalizeCvSkills(cvSkills: string[]): string[] {
  const expanded: string[] = [];
  for (const skill of cvSkills) {
    const lower = normalizeSkill(skill);
    expanded.push(lower);
    const matchingExpansions = CV_SKILL_EXPANSIONS[lower];
    if (matchingExpansions) {
      expanded.push(...matchingExpansions);
    }
  }
  return [...new Set(expanded)];
}
