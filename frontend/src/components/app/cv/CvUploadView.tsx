import { useEffect, useState } from "react";
import { Briefcase, TrendingUp } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { fetchLatestCv } from "@/lib/cvService";
import JobMatchPanel from "./JobMatchPanel";
import UpskillingPanel from "./UpskillingPanel";
import CommutePanel from "./CommutePanel";
import CitizenProfileBar from "./CitizenProfileBar";
import CvOnboardingHero from "./CvOnboardingHero";
import CvResultsPanel from "./CvResultsPanel";
import BusinessGrowth from "./BusinessGrowth";
import { CareerChatBubble } from "./CareerChatBubble";

type CareerTab = "market" | "growth";

const TABS: { id: CareerTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "market", label: "Job Market", icon: Briefcase },
  { id: "growth", label: "Growth Plan", icon: TrendingUp },
];

function PageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold text-foreground">Career Growth</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Montgomery's job market + your personal career path
        </p>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-pine-green animate-pulse" />
        Updated daily
      </div>
    </div>
  );
}

const CvUploadView = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<CareerTab>("market");
  const hasCv = !!state.cvResult;

  useEffect(() => {
    if (state.cvResult || !state.citizenMeta?.id) return;
    fetchLatestCv(state.citizenMeta.id).then((data) => {
      if (!data) return;
      dispatch({ type: "SET_CV_RESULT", result: data.result });
      dispatch({ type: "SET_CV_FILE", fileName: data.file_name });
    });
  }, [state.citizenMeta?.id]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <CareerChatBubble />
      {hasCv && <CitizenProfileBar />}

      {hasCv && (
        <div className="flex border-b border-border/50 bg-white shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {!hasCv && (
          <div className="space-y-5 p-5 pb-8">
            <PageHeader />
            <CvOnboardingHero />
            <JobMatchPanel />
          </div>
        )}

        {hasCv && activeTab === "market" && (
          <div className="space-y-0">
            <div className="px-5 pt-4 pb-0">
              <PageHeader />
            </div>
            <CvResultsPanel result={state.cvResult!} />
            <JobMatchPanel />
          </div>
        )}

        {hasCv && activeTab === "growth" && (
          <div className="space-y-5 p-5">
            <UpskillingPanel />
            <CommutePanel />
            <BusinessGrowth />
          </div>
        )}
      </div>
    </div>
  );
};

export default CvUploadView;
