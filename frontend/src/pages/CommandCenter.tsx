import { useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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

  return (
    <div className="h-screen flex flex-col stitch-shell">
      <TopBar />

      <div className="flex-1 min-h-0 overflow-hidden px-3 md:px-6 py-3 md:py-4">
        <div className="max-w-7xl mx-auto h-full min-h-0">
          <div className="stitch-panel h-full min-h-0 overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full">
              {activeView}
            </div>
          </div>
        </div>
      </div>

      <AppNav
        activeTab={currentView as MobileTab}
        onTabChange={handleTabChange}
        actionItemCount={actionItemCount}
      />

      <FloatingChatBubble onSendMessage={handleSendMessage} />
    </div>
  );
}
