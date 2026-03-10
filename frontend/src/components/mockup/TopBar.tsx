import citysenseLogo from "@/assets/citysense-logo.png";

interface TopBarProps {
  lang?: "EN" | "ES";
  variant?: "navy" | "light";
  showProfile?: boolean;
}

const TopBar = ({ lang = "EN", variant = "navy", showProfile = false }: TopBarProps) => {
  const isNavy = variant === "navy";

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 pt-12 ${
        isNavy ? "bg-primary" : "bg-background"
      }`}
    >
      <div className="flex items-center gap-2">
        <img
          src={citysenseLogo}
          alt="CitySense"
          className="w-7 h-7 object-contain"
        />
        <span
          className={`font-bold text-lg ${
            isNavy ? "text-primary-foreground" : "text-primary"
          }`}
        >
          CitySense
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-full overflow-hidden border border-primary-foreground/30">
          <button
            className={`px-3 py-1 text-xs font-medium ${
              lang === "EN"
                ? isNavy
                  ? "bg-primary-foreground text-primary"
                  : "bg-primary text-primary-foreground"
                : isNavy
                ? "text-primary-foreground/70"
                : "text-primary/70"
            }`}
          >
            EN
          </button>
          <button
            className={`px-3 py-1 text-xs font-medium ${
              lang === "ES"
                ? isNavy
                  ? "bg-primary-foreground text-primary"
                  : "bg-primary text-primary-foreground"
                : isNavy
                ? "text-primary-foreground/70"
                : "text-primary/70"
            }`}
          >
            ES
          </button>
        </div>
        {showProfile && (
          <div
            className={`w-8 h-8 rounded-full ${
              isNavy ? "bg-primary-foreground/20" : "bg-primary/10"
            } flex items-center justify-center`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" stroke={isNavy ? "#FFFFFF" : "#1a4480"} strokeWidth="1.5" />
              <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={isNavy ? "#FFFFFF" : "#1a4480"} strokeWidth="1.5" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBar;
