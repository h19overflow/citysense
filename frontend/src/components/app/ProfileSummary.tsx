import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useApp } from "@/lib/appContext";

function hasProfileData(profile: ReturnType<typeof useApp>["state"]["profile"]): boolean {
  return !!(profile.zip || profile.householdSize || profile.income || profile.benefits?.length);
}

export default function ProfileSummary() {
  const { state } = useApp();
  const [isExpanded, setIsExpanded] = useState(true);
  const { profile } = state;
  const hasData = hasProfileData(profile);

  return (
    <div className="px-4 py-3">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex justify-between items-center w-full"
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Your Profile
        </p>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3">
          {!hasData ? (
            <p className="text-xs text-muted-foreground">
              Tell me about your situation and I'll remember the details.
            </p>
          ) : (
            <div className="space-y-1.5 text-xs">
              {profile.zip && (
                <p className="text-foreground">
                  <span className="text-muted-foreground">Location: </span>
                  Montgomery, AL {profile.zip}
                </p>
              )}
              {profile.householdSize !== undefined && (
                <p className="text-foreground">
                  <span className="text-muted-foreground">Household: </span>
                  {profile.householdSize} people
                  {profile.children !== undefined ? ` (${profile.children} children)` : ""}
                </p>
              )}
              {profile.income !== undefined && (
                <p className="text-foreground">
                  <span className="text-muted-foreground">Income: </span>
                  ${profile.income}/mo
                </p>
              )}
              {profile.benefits && profile.benefits.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {profile.benefits.map((benefit) => (
                    <span
                      key={benefit}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-pine-green/10 text-pine-green border border-pine-green/20"
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
