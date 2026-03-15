import { API_BASE } from "@/lib/apiConfig";
import type { LearningBlock } from "@/lib/types/growth";

export async function expandLearningBlock(
  analysisId: string,
  pathKey: string,
  citizenId: string,
  skillIndex: number,
  previousLearnings?: string,
): Promise<LearningBlock> {
  const response = await fetch(`${API_BASE}/growth/learning-block/expand`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      analysis_id: analysisId,
      path_key: pathKey,
      citizen_id: citizenId,
      skill_index: skillIndex,
      previous_learnings: previousLearnings,
    }),
  });

  if (!response.ok) throw new Error("Failed to expand learning block");
  return response.json();
}
