import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Layers,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
} from "lucide-react";
import type { AppView } from "@/lib/types";
import { useApp } from "@/lib/appContext";
interface FlowSidebarProps {
  onQuickAction: (text: string) => void;
}

const NAV_ITEMS: {
  label: string;
  view: AppView;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { label: "Services", view: "services", icon: Layers },
  { label: "Career Growth", view: "cv", icon: TrendingUp },
  { label: "News", view: "news", icon: Newspaper },
];

export function FlowSidebar({ onQuickAction }: FlowSidebarProps) {
  const { state } = useApp();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);

  function handleViewSelect(view: AppView) {
    navigate(`/app/${view}`, { replace: true });
  }

  if (collapsed) {
    return (
      <aside className="w-12 h-full flex flex-col items-center border-r bg-[hsl(var(--sidebar-background))] py-3 gap-2">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>

        <hr className="w-6 border-border/30" />

        {NAV_ITEMS.map(({ label, view, icon: Icon }) => {
          const isActive = view === state.activeView;
          return (
            <button
              key={view}
              onClick={() => handleViewSelect(view)}
              title={label}
              className={`p-2 rounded-md transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}

        <hr className="w-6 border-border/30 mt-auto" />
        <button
          onClick={() => navigate("/admin")}
          title="Admin Dashboard"
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mb-2"
        >
          <Shield className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-[260px] h-full flex flex-col border-r bg-[hsl(var(--sidebar-background))] overflow-y-auto">
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Navigate
          </span>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </div>

        {NAV_ITEMS.map(({ label, view, icon: Icon }) => {
          const isActive = view === state.activeView;
          return (
            <button
              key={view}
              onClick={() => handleViewSelect(view)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-auto px-4 py-3 border-t border-border/30">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Shield className="h-4 w-4" />
          Admin Dashboard
        </button>
      </div>
    </aside>
  );
}
