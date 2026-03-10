export interface ParsedRecommendation {
  priority: "HIGH" | "MEDIUM" | "LOW";
  text: string;
}

const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;

/** Parse all recommendation items from a text block, handling all LLM format variations. */
function extractRecommendations(block: string): ParsedRecommendation[] {
  // Normalize: split on ` - [PRIORITY]` patterns even when inline
  const normalized = block.replace(/\s+-\s*\[(?:HIGH|MEDIUM|LOW)\]/g, (m) => "\n" + m.trim());
  const lines = normalized.split("\n");
  const items: ParsedRecommendation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Pattern 1: "- [HIGH] text" or "[HIGH] text"
    const bracketMatch = line.match(/^[-*•]?\s*\[(HIGH|MEDIUM|LOW)]\s*(.*)/);
    if (bracketMatch) {
      const text = bracketMatch[2].replace(/^[-–]\s*/, "").trim();
      if (text) items.push({ priority: bracketMatch[1] as ParsedRecommendation["priority"], text });
      continue;
    }

    // Pattern 2: standalone "HIGH" / "MEDIUM" / "LOW" followed by text on next line
    const upper = line.toUpperCase();
    if (PRIORITIES.includes(upper as typeof PRIORITIES[number]) && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (nextLine && !PRIORITIES.includes(nextLine.toUpperCase() as typeof PRIORITIES[number])) {
        items.push({ priority: upper as ParsedRecommendation["priority"], text: nextLine });
        i++;
      }
    }
  }

  return items.slice(0, 4);
}

export function parseRecommendations(content: string): {
  bodyText: string;
  recommendations: ParsedRecommendation[];
} {
  // Try fenced block first
  const fenced = content.match(/:::recommendations\s*([\s\S]*?):::/);
  if (fenced) {
    const bodyText = content.replace(/:::recommendations\s*[\s\S]*?:::/, "").trim();
    return { bodyText, recommendations: extractRecommendations(fenced[1]) };
  }

  // Find the "Actions" header or first [PRIORITY] tag as boundary
  const actionsIdx = content.search(/\n\s*Actions\s*\n/i);
  const firstTagIdx = content.search(/\[(?:HIGH|MEDIUM|LOW)\]/);
  const standalonePriorityIdx = content.search(/\n(?:HIGH|MEDIUM|LOW)\s*\n/);

  const cutIdx = Math.min(
    ...[actionsIdx, firstTagIdx, standalonePriorityIdx].filter((i) => i >= 0).concat([Infinity]),
  );

  if (cutIdx === Infinity) return { bodyText: content, recommendations: [] };

  const bodyText = content.slice(0, cutIdx).trim();
  const recBlock = content.slice(cutIdx);
  const recommendations = extractRecommendations(recBlock);

  if (recommendations.length === 0) return { bodyText: content, recommendations: [] };
  return { bodyText, recommendations };
}
