import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import TopBar from "@/components/app/TopBar";
import { AppNav, type MobileTab } from "@/components/app/MobileNav";
import { ServicesView } from "@/components/app/services/ServicesView";
import ProfileView from "@/components/app/ProfileView";
import CvUploadView from "@/components/app/cv/CvUploadView";
import { NewsPage } from "@/components/app/news/NewsPage";
import FloatingChatBubble from "@/components/app/FloatingChatBubble";
import { useApp } from "@/lib/appContext";
import { getSmartResponse } from "@/lib/aiChatService";
import {
  buildWelcomeMessage,
  buildUserMessage,
  buildArtifactForResponse,
} from "@/lib/chatHelpers";
import type { AppView, Language, ServiceCategory } from "@/lib/types";

const VALID_VIEWS = new Set<string>(["services", "admin", "profile", "news", "career"]);

const TAB_ORDER: Record<string, number> = {
  services: 0,
  news: 1,
  career: 2,
  profile: 3,
};

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? "-100%" : "100%", opacity: 0 }),
};

export default function CommandCenter() {
  const { state, dispatch } = useApp();
  const { view: urlView } = useParams<{ view: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const lang: Language = "EN";

  // Derive the current view from the URL (single source of truth)
  const currentView: AppView =
    urlView && VALID_VIEWS.has(urlView) ? (urlView as AppView) : "services";

  // Redirect invalid URLs to the default view
  useEffect(() => {
    if (!urlView || !VALID_VIEWS.has(urlView)) {
      navigate("/app/services", { replace: true });
    }
  }, [urlView, navigate]);

  // Navigate to a view by updating the URL (which then drives state)
  const navigateToView = useCallback(
    (view: AppView) => {
      if (view !== currentView) {
        slideDirection.current = (TAB_ORDER[view] ?? 0) > (TAB_ORDER[currentView] ?? 0) ? 1 : -1;
        navigate(`/app/${view}`, { replace: true });
      }
    },
    [currentView, navigate],
  );

  const requestedCategory = useMemo<ServiceCategory | null>(() => {
    if (currentView !== "services") return null;
    const category = new URLSearchParams(location.search).get("category");
    if (category === "health" || category === "community" || category === "libraries") {
      return category;
    }
    return null;
  }, [currentView, location.search]);

  useEffect(() => {
    if (currentView !== "services") return;
    const params = new URLSearchParams(location.search);
    const shouldOpenChat = params.get("chat") === "open";
    const hasCategory = !!requestedCategory;

    if (shouldOpenChat) {
      dispatch({ type: "SET_CHAT_BUBBLE_OPEN", open: true });
    }

    if (shouldOpenChat || hasCategory) {
      navigate("/app/services", { replace: true });
    }
  }, [currentView, location.search, requestedCategory, dispatch, navigate]);

  useEffect(() => {
    if (state.messages.length === 0) {
      dispatch({ type: "ADD_MESSAGE", message: buildWelcomeMessage() });
    }
  }, []);

  function handleTabChange(tab: MobileTab) {
    if (tab === "admin") {
      navigate("/admin");
      return;
    }
    navigateToView(tab);
  }

  const handleSendMessage = useCallback(
    async (text: string) => {
      dispatch({ type: "ADD_MESSAGE", message: buildUserMessage(text) });
      dispatch({ type: "SET_TYPING", isTyping: true });

      const response = await getSmartResponse(text);

      dispatch({ type: "ADD_MESSAGE", message: response });

      if (response.mapAction) {
        dispatch({ type: "SET_MAP_COMMAND", command: response.mapAction });
        navigateToView("services");
      }

      const artifact = buildArtifactForResponse(response.id, response.type);
      if (artifact) {
        dispatch({ type: "ADD_ARTIFACT", artifact });
        dispatch({ type: "SET_ACTIVE_ARTIFACT", id: artifact.id });
      }

      dispatch({ type: "SET_TYPING", isTyping: false });
    },
    [dispatch, navigateToView],
  );

  const activeView = useMemo(() => {
    switch (currentView) {
      case "services":
        return (
          <ServicesView
            onNavigateToChat={handleSendMessage}
            requestedCategory={requestedCategory}
          />
        );
      case "profile":
        return <ProfileView />;
      case "career":
        return <CvUploadView />;
      case "news":
        return <NewsPage />;
      default:
        return null;
    }
  }, [currentView, handleSendMessage, requestedCategory]);

  const actionItemCount = useMemo(
    () => state.actionItems.filter((i) => !i.completed).length,
    [state.actionItems],
  );

  // Track slide direction: +1 = slide right→left (going forward), -1 = slide left→right
  const slideDirection = useRef<number>(1);

  const isCareer = currentView === "career";
  const [careerMargin, setCareerMargin] = useState(false);

  useEffect(() => {
    if (!isCareer) {
      setCareerMargin(false);
      return;
    }
    const id = requestAnimationFrame(() => setCareerMargin(true));
    return () => cancelAnimationFrame(id);
  }, [isCareer]);

  return (
    <div className={`h-screen flex flex-col stitch-shell transition-[margin] duration-300 ease-out ${careerMargin ? "mr-[400px]" : "mr-0"}`}>
      <TopBar />

      <div className="flex-1 min-h-0 overflow-hidden px-3 md:px-6 py-3 md:py-4">
        <div className="max-w-7xl mx-auto h-full min-h-0">
          <div className="stitch-panel h-full min-h-0 overflow-hidden">
            <AnimatePresence mode="popLayout" custom={slideDirection.current} initial={false}>
              <motion.div
                key={currentView}
                custom={slideDirection.current}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex-1 flex flex-col min-w-0 min-h-0 h-full"
              >
                {activeView}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AppNav
        activeTab={currentView as MobileTab}
        onTabChange={handleTabChange}
        actionItemCount={actionItemCount}
      />

      {currentView !== "career" && <FloatingChatBubble onSendMessage={handleSendMessage} />}
    </div>
  );
}
