import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { ServicePoint } from "@/lib/types";
import { useApp } from "@/lib/appContext";
import { fetchServicePoints } from "@/lib/arcgisService";
import { createCategoryMarker } from "@/lib/mapMarkers";

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];
const DEFAULT_ZOOM = 12;

function MapDataLoader() {
  const { state, dispatch } = useApp();

  useEffect(() => {
    async function loadCategories() {
      for (const category of state.activeCategories) {
        const existing = state.servicePoints.filter(
          (p) => p.category === category
        );
        if (existing.length > 0) continue;

        const points = await fetchServicePoints(category);
        if (points.length > 0) {
          dispatch({ type: "ADD_SERVICE_POINTS", points });
        }
      }
    }
    loadCategories();
  }, [state.activeCategories]);

  return null;
}

function FlyToPin({ pin }: { pin: ServicePoint | null }) {
  const map = useMap();
  const prevPinRef = useRef<string | null>(null);

  useEffect(() => {
    if (pin && pin.id !== prevPinRef.current) {
      map.flyTo([pin.lat, pin.lng], 15, { duration: 0.8 });
      prevPinRef.current = pin.id;
    }
  }, [pin, map]);

  return null;
}

export function ServiceMap() {
  const { state, dispatch } = useApp();

  const visiblePoints = state.servicePoints.filter(
    (p) =>
      state.activeCategories.includes(p.category) &&
      typeof p.lat === "number" &&
      typeof p.lng === "number" &&
      !Number.isNaN(p.lat) &&
      !Number.isNaN(p.lng)
  );

  function handleMarkerClick(point: ServicePoint) {
    dispatch({ type: "SET_SELECTED_PIN", pin: point });
  }

  return (
    <MapContainer
      center={MONTGOMERY_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full rounded-lg"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapDataLoader />
      <FlyToPin pin={state.selectedPin} />
      {visiblePoints.map((point) => (
        <Marker
          key={point.id}
          position={[point.lat, point.lng]}
          icon={createCategoryMarker(point.category)}
          eventHandlers={{ click: () => handleMarkerClick(point) }}
        >
          <Popup>
            <div className="text-xs">
              <p className="font-semibold">{point.name}</p>
              {point.address && <p className="text-gray-600">{point.address}</p>}
              {point.phone && <p>{point.phone}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
