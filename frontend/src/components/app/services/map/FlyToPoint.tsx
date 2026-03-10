import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

interface FlyToPointProps {
  lat: number | null;
  lng: number | null;
}

export function FlyToPoint({ lat, lng }: FlyToPointProps) {
  const map = useMap();
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${lat},${lng}`;
    if (lat !== null && lng !== null && key !== prevRef.current) {
      map.flyTo([lat, lng], 15, { duration: 0.6 });
      prevRef.current = key;
    }
  }, [lat, lng, map]);

  return null;
}
