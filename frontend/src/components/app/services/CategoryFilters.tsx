import {
  Heart,
  Building2,
  Baby,
  GraduationCap,
  ShieldAlert,
  BookOpen,
} from "lucide-react";
import type { ServiceCategory } from "@/lib/types";
import { useApp } from "@/lib/appContext";

interface CategoryConfig {
  id: ServiceCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const CATEGORIES: CategoryConfig[] = [
  { id: "health", label: "Health", icon: Heart, color: "#E74C3C" },
  { id: "community", label: "Community", icon: Building2, color: "#2ECC71" },
  { id: "childcare", label: "Childcare", icon: Baby, color: "#F39C12" },
  { id: "education", label: "Education", icon: GraduationCap, color: "#3498DB" },
  { id: "safety", label: "Safety", icon: ShieldAlert, color: "#E67E22" },
  { id: "libraries", label: "Libraries", icon: BookOpen, color: "#9B59B6" },
];

export function CategoryFilters() {
  const { state, dispatch } = useApp();

  function handleToggle(category: ServiceCategory) {
    dispatch({ type: "TOGGLE_CATEGORY", category });
  }

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2">
      {CATEGORIES.map(({ id, label, icon: Icon, color }) => {
        const active = state.activeCategories.includes(id);
        return (
          <button
            key={id}
            onClick={() => handleToggle(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              active
                ? "text-white shadow-sm"
                : "bg-background text-muted-foreground border-border/60 hover:border-border"
            }`}
            style={
              active
                ? { backgroundColor: color, borderColor: color }
                : undefined
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export { CATEGORIES };
