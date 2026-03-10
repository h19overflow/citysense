import { Zap, Clock } from "lucide-react";
import type { UpskillPath } from "@/lib/types";

interface QuickWinsSectionProps {
  paths: UpskillPath[];
}

export function QuickWinsSection({ paths }: QuickWinsSectionProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-amber-500" />
        Quick Wins (2 weeks or less)
      </h3>
      <div className="flex flex-wrap gap-2">
        {paths.map((path) => (
          <div
            key={path.skillName}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-amber-200"
          >
            <span className="text-xs font-medium text-amber-900">{path.skillName}</span>
            <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {path.estimatedWeeks}w
            </span>
            {path.trainingOptions.some((t) => t.cost === "free") && (
              <span className="text-[9px] font-bold text-pine-green bg-pine-green/10 px-1.5 py-0.5 rounded">
                FREE
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
