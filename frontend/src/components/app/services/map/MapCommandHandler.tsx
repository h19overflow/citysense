import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { ServicePoint } from "@/lib/types";
import { useApp } from "@/lib/appContext";

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];

interface MapCommandHandlerProps {
  visiblePoints: ServicePoint[];
}

export function MapCommandHandler({ visiblePoints }: MapCommandHandlerProps) {
  const map = useMap();
  const { state, dispatch } = useApp();
  const prevCmdRef = useRef<string | null>(null);

  useEffect(() => {
    const cmd = state.mapCommand;
    if (!cmd || cmd.id === prevCmdRef.current) return;
    prevCmdRef.current = cmd.id;

    switch (cmd.type) {
      case "zoom_to":
        if (cmd.lat != null && cmd.lng != null) {
          map.flyTo([cmd.lat, cmd.lng], cmd.zoom ?? 14, { duration: 0.8 });
        }
        break;
      case "filter_category":
        if (cmd.lat != null && cmd.lng != null) {
          map.flyTo([cmd.lat, cmd.lng], cmd.zoom ?? 14, { duration: 0.8 });
        } else if (visiblePoints.length > 0) {
          const bounds = L.latLngBounds(visiblePoints.map((p) => [p.lat, p.lng] as [number, number]));
          map.flyToBounds(bounds, { padding: [40, 40], duration: 0.8, maxZoom: 14 });
        }
        break;
      case "highlight_hotspots":
        break;
      case "clear":
        map.flyTo(MONTGOMERY_CENTER, 12, { duration: 0.6 });
        break;
    }

    setTimeout(() => dispatch({ type: "CLEAR_MAP_COMMAND" }), 300);
  }, [state.mapCommand, map, dispatch, visiblePoints]);

  return null;
}
