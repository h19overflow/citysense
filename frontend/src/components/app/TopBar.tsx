import citysenseLogo from "@/assets/citysense-logo.png";
import { useNavigate } from "react-router-dom";

interface TopBarProps {
  onBack?: () => void;
}

const TopBar = ({ onBack }: TopBarProps) => {
  const navigate = useNavigate();

  return (
    <div className="stitch-topbar shrink-0 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button onClick={onBack} className="text-secondary/80 hover:text-secondary transition-colors mr-0.5">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 text-left min-w-0"
          aria-label="Go to landing page"
        >
          <img src={citysenseLogo} alt="CitySense" className="w-8 h-8 object-contain" />
          <div className="flex flex-col min-w-0">
            <span className="text-primary font-bold text-[15px] leading-tight tracking-tight">
              CitySense
            </span>
            <span className="text-secondary text-[10px] leading-tight font-bold uppercase tracking-[0.12em]">
              Citizen Portal
            </span>
          </div>
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/app/services")}
          className="hidden md:inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
        >
          Services
        </button>
        <button
          onClick={() => navigate("/app/news")}
          className="hidden md:inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
        >
          Updates
        </button>
        <span className="text-[10px] text-muted-foreground/70 hidden lg:inline">
          Powered by Bright Data
        </span>
      </div>
      </div>
    </div>
  );
};

export default TopBar;
