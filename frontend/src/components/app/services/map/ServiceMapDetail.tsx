import type { ServicePoint } from "@/lib/types";
import { MapPointDetailPanel } from "../MapPointDetailPanel";
import type { MapCategoryConfig } from "../serviceCategoryMeta";

interface ServiceMapDetailProps {
  point: ServicePoint;
  categories: MapCategoryConfig[];
  onClose: () => void;
  onNavigateToChat: (msg: string) => void;
  onViewCategory: () => void;
}

export function ServiceMapDetail({
  point,
  categories,
  onClose,
  onNavigateToChat,
  onViewCategory,
}: ServiceMapDetailProps) {
  return (
    <div className="w-[340px] shrink-0 border-l border-border/30 overflow-y-auto bg-background">
      <MapPointDetailPanel
        point={point}
        categories={categories}
        onClose={onClose}
        onNavigateToChat={onNavigateToChat}
        onViewCategory={onViewCategory}
      />
    </div>
  );
}
