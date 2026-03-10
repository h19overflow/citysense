import { useEffect } from "react";
import { Bus } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "@/lib/leafletSetup";
import type { JobListing, TransitRoute } from "@/lib/types";

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];
const DEFAULT_ZOOM = 12;

const JOB_ICON = L.divIcon({
  className: "custom-marker",
  html: `<div style="background-color:#1E3A5F;width:10px;height:10px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const SELECTED_JOB_ICON = L.divIcon({
  className: "custom-marker",
  html: `<div style="background-color:#D97706;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const USER_ICON = L.divIcon({
  className: "custom-marker",
  html: `<div style="background-color:#10B981;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FlyToJob({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat !== null && lng !== null) {
      map.flyTo([lat, lng], 14, { duration: 0.6 });
    }
  }, [lat, lng, map]);
  return null;
}

interface CommutePanelMapProps {
  jobListings: JobListing[];
  transitRoutes: TransitRoute[];
  selectedJobId: string | null;
  selectedCoords: { lat: number; lng: number } | undefined;
  userLocation: { lat: number; lng: number };
  onSelectJob: (jobId: string) => void;
}

export function CommutePanelMap({
  jobListings,
  transitRoutes,
  selectedJobId,
  selectedCoords,
  userLocation,
  onSelectJob,
}: CommutePanelMapProps) {
  return (
    <div className="h-[45%] shrink-0 relative">
      <MapContainer center={MONTGOMERY_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[userLocation.lat, userLocation.lng]} icon={USER_ICON}>
          <Popup>
            <div className="text-xs">
              <p className="font-semibold">Your Location</p>
              <p className="text-gray-500">Downtown Montgomery</p>
            </div>
          </Popup>
        </Marker>

        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={20}
          pathOptions={{ color: "#10B981", weight: 1, fillColor: "#10B981", fillOpacity: 0.1 }}
        />

        {jobListings
          .filter((job) => job.lat && job.lng)
          .map((job) => (
            <Marker
              key={job.id}
              position={[job.lat, job.lng]}
              icon={selectedJobId === job.id ? SELECTED_JOB_ICON : JOB_ICON}
              eventHandlers={{ click: () => onSelectJob(job.id) }}
            >
              <Popup>
                <div className="text-xs min-w-[160px]">
                  <p className="font-semibold">{job.title}</p>
                  <p className="text-gray-500">{job.company}</p>
                  {job.salary && <p className="font-medium mt-1">{job.salary}</p>}
                </div>
              </Popup>
            </Marker>
          ))}

        <FlyToJob lat={selectedCoords?.lat ?? null} lng={selectedCoords?.lng ?? null} />
      </MapContainer>

      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm z-[1000] flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#10B981] border-2 border-white shadow-sm" />
          <span className="text-[10px] text-muted-foreground">You</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1E3A5F] border-2 border-white shadow-sm" />
          <span className="text-[10px] text-muted-foreground">Jobs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Bus className="w-3 h-3 text-blue-600" />
          <span className="text-[10px] text-muted-foreground">{transitRoutes.length} bus routes</span>
        </div>
      </div>
    </div>
  );
}
