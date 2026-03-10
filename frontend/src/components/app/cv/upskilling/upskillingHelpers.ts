export function formatDuration(weeks: number): string {
  if (weeks <= 1) return "~1 week";
  if (weeks < 4) return `~${weeks} weeks`;
  if (weeks < 8) return `~${Math.round(weeks / 4)} month`;
  return `~${Math.round(weeks / 4)} months`;
}

export const CATEGORY_COLORS: Record<string, string> = {
  technical: "bg-blue-500",
  healthcare: "bg-red-500",
  soft_skills: "bg-emerald-500",
  education: "bg-purple-500",
};
