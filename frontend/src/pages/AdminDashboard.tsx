import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Map } from "lucide-react";
import { useNavigate } from "react-router-dom";
import citysenseLogo from "@/assets/citysense-logo.png";
import { AIInsightsCard } from "@/components/app/admin/AIInsightsCard";
import { AdminChatBubble } from "@/components/app/admin/AdminChatBubble";
import { OnboardingBanner } from "@/components/app/admin/OnboardingBanner";
import { CommentFeed } from "@/components/app/admin/CommentFeed";
import { HotSpotsPanel } from "@/components/app/admin/HotSpotsPanel";
import { PredictiveHeatmap } from "@/components/app/admin/PredictiveHeatmap";
import { PredictiveHeatmapPanel } from "@/components/app/admin/PredictiveHeatmapPanel";
import { MayorsBrief } from "@/components/app/admin/MayorsBrief";
import { SentimentOverview } from "@/components/app/admin/SentimentOverview";
import { ANALYSIS_API_BASE } from "@/lib/apiConfig";
import { useApp } from "@/lib/appContext";
import { computeNeighborhoodActivity } from "@/lib/newsAggregations";
import { fetchNewsArticles, fetchNewsComments } from "@/lib/newsService";
import { loadStoredReactions } from "@/lib/newsReactionStore";
import { useAdminChatStore } from "@/stores/adminChatStore";

function buildGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning, Mayor";
  if (hour < 17) return "Good afternoon, Mayor";
  return "Good evening, Mayor";
}

function AdminHeader() {
  const navigate = useNavigate();

  return (
    <header className="stitch-topbar z-[1001]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 text-left"
            aria-label="Go to landing page"
          >
            <img src={citysenseLogo} alt="CitySense" className="w-8 h-8 object-contain" />
            <div className="flex flex-col">
              <span className="text-primary font-bold text-[15px] leading-tight tracking-tight">
                CitySense
              </span>
              <span className="text-secondary text-[10px] leading-tight font-bold uppercase tracking-[0.12em]">
                Operations Console
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </span>
          <button
            onClick={() => navigate("/app/news")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-white text-xs font-medium text-secondary hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Citizen View
          </button>
        </div>
      </div>
    </header>
  );
}

export default function AdminDashboard() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const chatIsOpen = useAdminChatStore((s) => s.isOpen);
  const [aiRefreshTrigger, setAiRefreshTrigger] = useState(0);
  const [chatQuestion, setChatQuestion] = useState<string | undefined>();
  const questionCounterRef = useRef(0);

  const askAI = useCallback((question: string) => {
    questionCounterRef.current += 1;
    setChatQuestion(`${question}##${questionCounterRef.current}`);
  }, []);

  const cleanQuestion = chatQuestion?.replace(/##\d+$/, "");

  useEffect(() => {
    if (state.newsArticles.length === 0) {
      fetchNewsArticles().then((articles) => {
        if (articles.length > 0) dispatch({ type: "SET_NEWS_ARTICLES", articles });
      });
    }
    if (state.newsComments.length === 0) {
      fetchNewsComments().then((comments) => {
        if (comments.length > 0) dispatch({ type: "SET_NEWS_COMMENTS", comments });
      });
    }
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const pollAnalysisStatus = () => {
      intervalId = setInterval(async () => {
        try {
          const response = await fetch(`${ANALYSIS_API_BASE}/api/analysis/status`);
          if (!response.ok) return;
          const { state: statusState } = await response.json();
          if (statusState !== "running") {
            clearInterval(intervalId);
            if (!cancelled && statusState === "complete") {
              setAiRefreshTrigger((n) => n + 1);
            }
          }
        } catch {
          clearInterval(intervalId);
        }
      }, 2000);
    };

    const runAnalysisOnLoad = async () => {
      try {
        const runResponse = await fetch(`${ANALYSIS_API_BASE}/api/analysis/run`, { method: "POST" });
        if (!runResponse.ok) {
          throw new Error(`Failed to start analysis: ${runResponse.status}`);
        }
        pollAnalysisStatus();
      } catch (error) {
        console.error("[AdminDashboard] Failed to auto-run analysis:", error);
      }
    };

    runAnalysisOnLoad();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const { reactions } = loadStoredReactions();
  const mergedReactions = { ...reactions, ...state.newsReactions };
  const neighborhoods = computeNeighborhoodActivity(state.newsArticles, mergedReactions, state.newsComments);

  return (
    <div className={`min-h-screen bg-background transition-[margin] duration-200 ${chatIsOpen ? "mr-[520px]" : ""}`}>
      <AdminHeader />

      <main className="max-w-7xl mx-auto w-full px-4 md:px-6 py-5 md:py-6 space-y-6">
        <OnboardingBanner />

        {/* Greeting + Actions */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-px w-8 bg-[hsl(var(--amber-gold))]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--amber-gold))]">
              Montgomery, Alabama
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-secondary tracking-tight">{buildGreeting()}</h2>
            <button
              onClick={() => {
                dispatch({ type: "SET_SELECTED_ARTICLE", articleId: null });
                navigate("/app/services");
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/40 bg-white text-sm font-medium text-secondary hover:shadow-sm hover:text-primary transition-all"
            >
              <Map className="w-4 h-4" aria-hidden="true" />
              View Map
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:h-[520px] lg:h-[580px] items-stretch">
          <div className="md:col-span-3 h-full min-h-0">
            <PredictiveHeatmap onAskAI={askAI} />
          </div>
          <div className="md:col-span-1 h-full min-h-0">
            <PredictiveHeatmapPanel onAskAI={askAI} />
          </div>
        </div>

        <SentimentOverview articles={state.newsArticles} onAskAI={askAI} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MayorsBrief
            articles={state.newsArticles}
            comments={state.newsComments}
            reactions={mergedReactions}
            onAskAI={askAI}
          />
          <HotSpotsPanel neighborhoods={neighborhoods} onAskAI={askAI} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:h-[560px] lg:h-[620px] items-stretch">
          <div className="md:col-span-3 h-full min-h-0">
            <CommentFeed articles={state.newsArticles} onAskAI={askAI} />
          </div>
          <div className="md:col-span-1 h-full min-h-0">
            <AIInsightsCard
              refreshTrigger={aiRefreshTrigger}
              onAskAI={askAI}
            />
          </div>
        </div>
      </main>

      <AdminChatBubble initialQuestion={cleanQuestion} />
    </div>
  );
}
