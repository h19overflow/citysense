import type { ServicePoint, GuideMessage, ServiceCategory } from "./types";

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  health: "healthcare",
  community: "community centers",
  childcare: "childcare",
  education: "education",
  safety: "fire & safety",
  libraries: "libraries",
};

function formatDetail(key: string, value: string): string {
  const labels: Record<string, string> = {
    TYPE_FACIL: "Type",
    EMPLOY: "Employees",
    BEDS_UNITS: "Beds",
    Day_Ages: "Ages accepted",
    Night_Hour: "Night hours",
    Director: "Director",
    Level_: "Level",
    TYPE: "Type",
    Enroll: "Enrollment",
    FACILITY_N: "Facility",
    Day_Hours: "Hours",
  };
  return `**${labels[key] ?? key}:** ${value}`;
}

function buildPinSummary(pin: ServicePoint): string {
  const lines = [`**${pin.name}**`];
  if (pin.address) lines.push(`${pin.address}`);
  if (pin.phone) lines.push(`Phone: ${pin.phone}`);
  if (pin.hours) lines.push(`Hours: ${pin.hours}`);

  const usefulDetails = Object.entries(pin.details ?? {}).filter(
    ([key]) => !["LASTUPDATE", "LASTEDITOR", "BUFF_DIST", "FIPS", "Status1", "F13", "F14", "F19", "date_", "time", "Contact", "Notes", "Status_1", "TAZ_2035LR", "TAZ_2030LR", "SCH_ENRL", "ENRLMT", "enr", "Zip", "City", "ZIP"].includes(key)
  );
  for (const [key, val] of usefulDetails) {
    lines.push(formatDetail(key, val));
  }
  return lines.join("\n");
}

function findMatchingPoints(
  query: string,
  points: ServicePoint[]
): ServicePoint[] {
  const lower = query.toLowerCase();

  const categoryMatch = Object.entries(CATEGORY_LABELS).find(
    ([, label]) => lower.includes(label) || lower.includes(label.replace("&", "and"))
  );
  if (categoryMatch) {
    return points
      .filter((p) => p.category === categoryMatch[0])
      .slice(0, 3);
  }

  const keywords = ["hospital", "clinic", "doctor", "health", "medical"];
  if (keywords.some((k) => lower.includes(k))) {
    return points.filter((p) => p.category === "health").slice(0, 3);
  }
  if (lower.includes("daycare") || lower.includes("childcare") || lower.includes("child care") || lower.includes("babysit")) {
    return points.filter((p) => p.category === "childcare").slice(0, 3);
  }
  if (lower.includes("school") || lower.includes("education") || lower.includes("college") || lower.includes("training")) {
    return points.filter((p) => p.category === "education").slice(0, 3);
  }
  if (lower.includes("library") || lower.includes("computer") || lower.includes("wifi") || lower.includes("internet")) {
    return points.filter((p) => p.category === "libraries").slice(0, 3);
  }
  if (lower.includes("community") || lower.includes("center") || lower.includes("program")) {
    return points.filter((p) => p.category === "community").slice(0, 3);
  }
  if (lower.includes("fire") || lower.includes("safety") || lower.includes("emergency")) {
    return points.filter((p) => p.category === "safety").slice(0, 3);
  }

  return [];
}

export function generateGuideResponse(
  query: string,
  allPoints: ServicePoint[]
): GuideMessage {
  const matches = findMatchingPoints(query, allPoints);

  if (matches.length > 0) {
    const summaries = matches.map(buildPinSummary).join("\n\n---\n\n");
    const category = CATEGORY_LABELS[matches[0].category];
    return {
      id: `guide-${Date.now()}`,
      role: "assistant",
      content: `I found ${matches.length} ${category} service${matches.length > 1 ? "s" : ""} near you. I've highlighted them on the map:\n\n${summaries}\n\nWould you like more details about any of these, or help preparing to visit?`,
      pinIds: matches.map((p) => p.id),
    };
  }

  const lower = query.toLowerCase();
  if (lower.includes("help") || lower.includes("what can")) {
    return {
      id: `guide-${Date.now()}`,
      role: "assistant",
      content:
        "I can help you find and understand services in Montgomery! Try asking about:\n\n" +
        "- **Healthcare** — hospitals, clinics, free screenings\n" +
        "- **Childcare** — licensed daycare centers near you\n" +
        "- **Education** — schools, job training, GED programs\n" +
        "- **Libraries** — free computer access, Wi-Fi, job help\n" +
        "- **Community Centers** — programs, workshops, resources\n" +
        "- **Fire & Safety** — nearest fire stations\n\n" +
        "You can also click any pin on the map and I'll explain what that place offers.",
    };
  }

  return {
    id: `guide-${Date.now()}`,
    role: "assistant",
    content:
      "I'm not sure what you're looking for. Try asking about a specific type of service — like \"Where can I find childcare?\" or \"Show me healthcare near me.\" You can also tap any pin on the map to learn more about it.",
  };
}

export function generatePinGuideResponse(pin: ServicePoint): GuideMessage {
  const summary = buildPinSummary(pin);
  const category = CATEGORY_LABELS[pin.category];
  return {
    id: `guide-${Date.now()}`,
    role: "assistant",
    content: `Here's what I know about this ${category} service:\n\n${summary}\n\nWould you like help preparing to visit, or want me to find similar services nearby?`,
    pinIds: [pin.id],
  };
}
