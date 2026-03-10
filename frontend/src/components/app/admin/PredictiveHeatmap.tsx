import { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HotspotOverlay } from "./HotspotOverlay";
import { MisinfoOverlay } from "./MisinfoOverlay";
import { ShieldAlert, Flame } from "lucide-react";

interface PredictiveHeatmapProps {
  onAskAI?: (question: string) => void;
}

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];
const DEFAULT_ZOOM = 12;

export function PredictiveHeatmap({ onAskAI }: PredictiveHeatmapProps) {
  const [showHotspots, setShowHotspots] = useState(true);
  const [showMisinfo, setShowMisinfo] = useState(false);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Predictive Heatmap</CardTitle>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHotspots((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              showHotspots
                ? "bg-orange-100 text-orange-800 ring-1 ring-orange-300"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <Flame className="w-3 h-3" />
            Hotspots
          </button>
          <button
            onClick={() => setShowMisinfo((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              showMisinfo
                ? "bg-red-100 text-red-800 ring-1 ring-red-300"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            Misinfo
          </button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="h-[350px] md:h-full rounded-lg overflow-hidden">
          <MapContainer
            center={MONTGOMERY_CENTER}
            zoom={DEFAULT_ZOOM}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {showHotspots && <HotspotOverlay onAskAI={onAskAI} />}
            {showMisinfo && <MisinfoOverlay onAskAI={onAskAI} />}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
