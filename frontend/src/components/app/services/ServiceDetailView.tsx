import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { ServiceCategory, ServicePoint } from "@/lib/types";
import { useApp } from "@/lib/appContext";
import { fetchServicePoints } from "@/lib/arcgisService";
import "@/lib/leafletSetup";
import { createCategoryMarker, getMarkerColor, getMarkerSymbol } from "@/lib/mapMarkers";
import { CATEGORY_META } from "./serviceCategoryMeta";
import { ServiceLocationCard } from "./serviceDetailHelpers";
import { DetailViewHeader } from "./ServiceDetailHeader";
import { ServiceListPanel } from "./ServiceListPanel";
import { ServiceGuideChat } from "./ServiceGuideChat";
import { filterAndSortPoints } from "./serviceDetailUtils";

export type SortOption = "alphabetical" | "nearest";

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];

function FlyToPoint({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat !== null && lng !== null) map.flyTo([lat, lng], 15, { duration: 0.6 });
  }, [lat, lng, map]);
  return null;
}

interface ServiceDetailViewProps {
  category: ServiceCategory;
  onBack: () => void;
  onNavigateToChat: (message: string) => void;
}

export default function ServiceDetailView({ category, onBack }: ServiceDetailViewProps) {
  const { state, dispatch } = useApp();
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("alphabetical");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  useEffect(() => {
    async function loadPoints() {
      const alreadyLoaded = state.servicePoints.some((p) => p.category === category);
      if (alreadyLoaded) return;
      const points = await fetchServicePoints(category);
      if (points.length > 0) dispatch({ type: "ADD_SERVICE_POINTS", points });
    }
    loadPoints();
  }, [category]);

  useEffect(() => {
    if (sortOption === "nearest" && !userLocation) {
      navigator.geolocation?.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => setSortOption("alphabetical"),
      );
    }
  }, [sortOption]);

  // Auto-open guide when a pending message arrives
  useEffect(() => {
    if (state.guidePendingMessage && !guideOpen) {
      setGuideOpen(true);
    }
  }, [state.guidePendingMessage]);

  const allPoints = state.servicePoints.filter(
    (p) => p.category === category && !Number.isNaN(p.lat) && !Number.isNaN(p.lng),
  );

  const filteredPoints = filterAndSortPoints(allPoints, locationSearch, sortOption, userLocation);
  const selectedPoint = allPoints.find((p) => p.id === selectedPointId) ?? null;

  function handleSelectPoint(point: ServicePoint) {
    setSelectedPointId(point.id === selectedPointId ? null : point.id);
  }

  function handleGuideMessage(message: string) {
    dispatch({ type: "SEND_GUIDE_MESSAGE", message });
    if (!guideOpen) setGuideOpen(true);
  }

  return (
    <div className="flex flex-col h-full">
      <DetailViewHeader
        meta={meta}
        Icon={Icon}
        totalCount={allPoints.length}
        onBack={onBack}
        guideOpen={guideOpen}
        onToggleGuide={() => setGuideOpen((prev) => !prev)}
      />

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0 relative">
          <MapContainer center={MONTGOMERY_CENTER} zoom={12} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {allPoints.map((point) => (
              <Marker
                key={point.id}
                position={[point.lat, point.lng]}
                icon={createCategoryMarker(category, { selected: point.id === selectedPointId })}
                eventHandlers={{ click: () => handleSelectPoint(point) }}
              >
                <Popup>
                  <div className="text-xs min-w-[180px]">
                    <p className="font-semibold">{point.name}</p>
                    {point.address && <p className="text-gray-500 mt-0.5">{point.address}</p>}
                    {point.phone && <p className="mt-1">{point.phone}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}
            <FlyToPoint lat={selectedPoint?.lat ?? null} lng={selectedPoint?.lng ?? null} />
          </MapContainer>

          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm z-[1000]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{getMarkerSymbol(category)}</span>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getMarkerColor(category) }} />
              <span className="text-[10px] text-muted-foreground">{meta.label}</span>
            </div>
          </div>
        </div>

        <div ref={listRef} className="w-[320px] shrink-0 border-l border-border/30 overflow-y-auto bg-white">
          <ServiceListPanel
            points={filteredPoints}
            selectedPointId={selectedPointId}
            categoryColor={meta.markerColor}
            locationSearch={locationSearch}
            sortOption={sortOption}
            onChangeLocationSearch={setLocationSearch}
            onChangeSortOption={setSortOption}
            onSelectPoint={handleSelectPoint}
            onNavigateToChat={handleGuideMessage}
          />
        </div>

        {guideOpen && (
          <div className="w-[340px] shrink-0 border-l border-border/30 bg-white">
            <ServiceGuideChat />
          </div>
        )}
      </div>
    </div>
  );
}

export { ServiceLocationCard };
