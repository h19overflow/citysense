import { useMemo } from "react";
import { Layers, LayoutDashboard, Newspaper, UserCircle } from "lucide-react";
import { useAuthMe } from "@/lib/useAuth";

export type MobileTab = "services" | "admin" | "news" | "profile";

interface AppNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  actionItemCount: number;
}

interface TabConfig {
  id: MobileTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

const BadgeDot = ({ count }: { count: number }) => {
  if (count === 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
  );
};

export const AppNav = ({ activeTab, onTabChange, actionItemCount }: AppNavProps) => {
  const { data } = useAuthMe();
  const isAdmin = data?.is_admin ?? false;

  const tabs = useMemo<TabConfig[]>(() => {
    const base: TabConfig[] = [
      { id: "services", label: "Services", icon: Layers, badgeCount: actionItemCount },
      { id: "news", label: "News", icon: Newspaper },
    ];

    if (isAdmin) {
      base.push({ id: "admin", label: "Admin", icon: LayoutDashboard });
    }

    base.push({ id: "profile", label: "Profile", icon: UserCircle });
    return base;
  }, [actionItemCount, isAdmin]);

  return (
    <nav className="flex items-center justify-around border-t border-border/70 bg-background/95 backdrop-blur-sm px-2 py-2 relative z-50">
      {tabs.map(({ id, label, icon: Icon, badgeCount = 0 }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`relative flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs rounded-xl transition-all ${
            activeTab === id
              ? "text-primary bg-primary/10 font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
          }`}
        >
          <div className="relative">
            <Icon className="w-5 h-5" />
            <BadgeDot count={badgeCount} />
          </div>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
};

export default AppNav;
