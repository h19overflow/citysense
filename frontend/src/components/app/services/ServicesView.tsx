import { useEffect, useState } from "react";
import ServiceDirectory from "./ServiceDirectory";
import ServiceDetailView from "./ServiceDetailView";
import ServiceMapView from "./ServiceMapView";
import { ServiceRoadmapView } from "./ServiceRoadmapView";
import { useApp } from "@/lib/appContext";
import type { ServiceCategory } from "@/lib/types";

type ServicesMode = "directory" | "map" | "detail" | "roadmap";

interface ServicesViewProps {
  onNavigateToChat: (message: string) => void;
  requestedCategory?: ServiceCategory | null;
}

export function ServicesView({ onNavigateToChat, requestedCategory = null }: ServicesViewProps) {
  const { state } = useApp();
  const [mode, setMode] = useState<ServicesMode>("directory");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);

  // Auto-switch to roadmap mode when activeRoadmap is set
  useEffect(() => {
    if (state.activeRoadmap) {
      setMode("roadmap");
    }
  }, [state.activeRoadmap]);

  // Auto-switch to map mode when a map command arrives (chat → map)
  useEffect(() => {
    if (state.mapCommand && mode !== "map") {
      setMode("map");
    }
  }, [state.mapCommand]);

  // Auto-switch to map when an article is selected (e.g. from admin chat)
  useEffect(() => {
    if (state.selectedArticleId && mode !== "map") {
      setMode("map");
    }
  }, [state.selectedArticleId]);

  useEffect(() => {
    if (!requestedCategory) return;
    setSelectedCategory(requestedCategory);
    setMode("detail");
  }, [requestedCategory]);

  function handleSelectCategory(category: ServiceCategory) {
    setSelectedCategory(category);
    setMode("detail");
  }

  function handleBackToDirectory() {
    setSelectedCategory(null);
    setMode("directory");
  }

  if (mode === "detail" && selectedCategory) {
    return (
      <ServiceDetailView
        category={selectedCategory}
        onBack={handleBackToDirectory}
        onNavigateToChat={onNavigateToChat}
      />
    );
  }

  if (mode === "roadmap" && state.activeRoadmap) {
    return <ServiceRoadmapView />;
  }

  if (mode === "map") {
    return (
      <ServiceMapView
        onBack={() => setMode("directory")}
        onSelectCategory={handleSelectCategory}
        onNavigateToChat={onNavigateToChat}
      />
    );
  }

  return (
    <ServiceDirectory
      onSelectCategory={handleSelectCategory}
      onShowMap={() => setMode("map")}
      onNavigateToChat={onNavigateToChat}
    />
  );
}
