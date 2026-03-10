import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { estimateCommutes, getDefaultUserLocation } from "@/lib/commuteEngine";
import { fetchTransitRoutes } from "@/lib/transitService";
import { CommutePanelMap } from "./CommutePanelMap";
import { CommuteCard } from "./CommuteCard";

type SortMode = "distance" | "driving" | "transit";

const SORT_OPTIONS = [
  { key: "distance", label: "Distance" },
  { key: "driving", label: "Driving" },
  { key: "transit", label: "Transit" },
] as const;

const CommutePanel = () => {
  const { state, dispatch } = useApp();
  const [sortMode, setSortMode] = useState<SortMode>("distance");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const hasCv = !!state.cvData;

  useEffect(() => {
    if (state.transitRoutes.length > 0) return;
    fetchTransitRoutes().then((routes) => {
      dispatch({ type: "SET_TRANSIT_ROUTES", routes });
    });
  }, []);

  useEffect(() => {
    if (state.jobMatches.length === 0 && state.jobListings.length === 0) return;
    const userLocation = getDefaultUserLocation();
    const jobs = hasCv
      ? state.jobMatches
      : state.jobListings.map((j) => ({ ...j, matchPercent: 0, matchedSkills: [] as string[], missingSkills: [] as string[] }));
    const estimates = estimateCommutes(jobs, userLocation.lat, userLocation.lng, state.transitRoutes);
    dispatch({ type: "SET_COMMUTE_ESTIMATES", estimates });
  }, [state.jobMatches, state.jobListings, state.transitRoutes]);

  const sortedEstimates = useMemo(() => {
    const copy = [...state.commuteEstimates];
    if (sortMode === "driving") copy.sort((a, b) => a.drivingMinutes - b.drivingMinutes);
    else if (sortMode === "transit") copy.sort((a, b) => (a.transitMinutes ?? 999) - (b.transitMinutes ?? 999));
    return copy;
  }, [state.commuteEstimates, sortMode]);

  const jobCoords = useMemo(() => {
    const coordMap = new Map<string, { lat: number; lng: number }>();
    for (const job of state.jobListings) {
      if (job.lat && job.lng) coordMap.set(job.id, { lat: job.lat, lng: job.lng });
    }
    return coordMap;
  }, [state.jobListings]);

  const userLocation = useMemo(() => getDefaultUserLocation(), []);
  const selectedCoords = selectedJobId ? jobCoords.get(selectedJobId) : undefined;

  const handleSelectJob = useCallback((jobId: string) => {
    setSelectedJobId(jobId);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <CommutePanelMap
        jobListings={state.jobListings}
        transitRoutes={state.transitRoutes}
        selectedJobId={selectedJobId}
        selectedCoords={selectedCoords}
        userLocation={userLocation}
        onSelectJob={handleSelectJob}
      />

      <div className="flex-1 overflow-y-auto border-t border-border/50">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-border/30 sticky top-0 z-10">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex rounded-lg border border-border/50 overflow-hidden">
            {SORT_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortMode(key)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  sortMode === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-white text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-muted-foreground">{sortedEstimates.length} jobs</span>
        </div>

        <div className="space-y-1 p-2">
          {sortedEstimates.map((estimate) => (
            <CommuteCard
              key={estimate.jobId}
              estimate={estimate}
              isSelected={selectedJobId === estimate.jobId}
              onSelect={handleSelectJob}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommutePanel;
