import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import { MapPin } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { getMarkerColor } from "@/lib/mapMarkers";
import "@/lib/leafletSetup";

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];

function DisableInteractions() {
  const map = useMap();
  useEffect(() => {
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    if (map.tap) map.tap.disable();
  }, [map]);
  return null;
}

export function MiniMapPreview({ onShowMap }: { onShowMap: () => void }) {
  const { state } = useApp();
  const points = state.servicePoints.filter(
    (p) => !Number.isNaN(p.lat) && !Number.isNaN(p.lng),
  );

  return (
    <button
      onClick={onShowMap}
      className="relative w-full h-full rounded-2xl overflow-hidden group cursor-pointer"
      aria-label="Open full map"
    >
      <MapContainer
        center={MONTGOMERY_CENTER}
        zoom={12}
        className="h-full w-full pointer-events-none"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <DisableInteractions />
        {points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={4}
            pathOptions={{
              fillColor: getMarkerColor(p.category),
              fillOpacity: 0.8,
              stroke: true,
              color: "#fff",
              weight: 1,
            }}
          />
        ))}
      </MapContainer>

      <div className="absolute inset-0 bg-[hsl(var(--secondary))]/0 group-hover:bg-[hsl(var(--secondary))]/40 transition-colors duration-300 flex items-center justify-center">
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-card/95 shadow-lg text-sm font-semibold text-secondary opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <MapPin className="w-4 h-4" />
          Explore full map
        </div>
      </div>

      {points.length > 0 && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/90 backdrop-blur-sm shadow-sm text-xs font-medium text-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--pine-green))]" />
          {points.length} locations
        </div>
      )}
    </button>
  );
}
