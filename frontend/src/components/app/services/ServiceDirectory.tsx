import { useEffect, useState } from "react";
import { MapPin, Heart } from "lucide-react";
import type { ServiceCategory } from "@/lib/types";
import type { ServiceGuide } from "@/lib/govServices";
import { fetchServiceGuides, searchGuides } from "@/lib/govServices";
import { useApp } from "@/lib/appContext";
import { fetchServicePoints } from "@/lib/arcgisService";
import { CATEGORY_CARDS, type CategoryCardConfig } from "./serviceCategories";
import { DirectoryHero, DirectorySearchBar, CategoryCard, HelpPromptCard } from "./ServiceDirectoryParts";
import { BenefitsTabContent } from "./DirectoryTabContent";

type DirectoryTab = "services" | "benefits";

interface ServiceDirectoryProps {
  onSelectCategory: (category: ServiceCategory) => void;
  onShowMap: () => void;
  onNavigateToChat: (message: string) => void;
}

export default function ServiceDirectory({
  onSelectCategory,
  onShowMap,
  onNavigateToChat,
}: ServiceDirectoryProps) {
  const { state, dispatch } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<DirectoryTab>("services");
  const [guides, setGuides] = useState<ServiceGuide[]>([]);

  useEffect(() => {
    async function preloadAllCategories() {
      const allPoints = [];
      for (const cat of CATEGORY_CARDS) {
        const alreadyLoaded = state.servicePoints.some((p) => p.category === cat.id);
        if (alreadyLoaded) continue;
        const points = await fetchServicePoints(cat.id);
        allPoints.push(...points);
      }
      if (allPoints.length > 0) {
        dispatch({ type: "ADD_SERVICE_POINTS", points: allPoints });
      }
    }
    preloadAllCategories();
  }, []);

  useEffect(() => {
    fetchServiceGuides().then(setGuides);
  }, []);

  const filteredGuides = searchQuery ? searchGuides(guides, searchQuery) : guides;

  function countLocationsForCategory(id: ServiceCategory): number {
    return state.servicePoints.filter((p) => p.category === id).length;
  }

  function matchesCategorySearch(cat: CategoryCardConfig): boolean {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      cat.label.toLowerCase().includes(query) ||
      cat.description.toLowerCase().includes(query) ||
      state.servicePoints
        .filter((p) => p.category === cat.id)
        .some((p) => p.name.toLowerCase().includes(query) || p.address.toLowerCase().includes(query))
    );
  }

  const visibleCategories = CATEGORY_CARDS.filter(matchesCategorySearch);

  return (
    <div className="flex-1 overflow-y-auto">
      <DirectoryHero onShowMap={onShowMap} />

      <div className="px-6 pb-4 space-y-4">
        <div className="flex gap-1 rounded-xl bg-muted/40 p-1 w-fit">
          <TabButton
            active={activeTab === "services"}
            icon={<MapPin className="w-3.5 h-3.5" />}
            label="Services"
            onClick={() => setActiveTab("services")}
          />
          <TabButton
            active={activeTab === "benefits"}
            icon={<Heart className="w-3.5 h-3.5" />}
            label="Benefits"
            count={guides.length}
            onClick={() => setActiveTab("benefits")}
          />
        </div>

        <DirectorySearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {activeTab === "services" ? (
        <>
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleCategories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  config={cat}
                  locationCount={countLocationsForCategory(cat.id)}
                  onSelect={() => onSelectCategory(cat.id)}
                />
              ))}
              {visibleCategories.length === 0 && (
                <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  No services match &ldquo;{searchQuery}&rdquo;.
                </p>
              )}
            </div>
          </div>

          <div className="px-6 pb-8">
            <HelpPromptCard onNavigateToChat={onNavigateToChat} />
          </div>
        </>
      ) : (
        <BenefitsTabContent
          guides={filteredGuides}
          searchQuery={searchQuery}
          onNavigateToChat={onNavigateToChat}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
        active
          ? "bg-white text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-0.5 text-[10px] ${active ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
