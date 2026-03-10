import { useNavigate } from "react-router-dom";
import { ArrowRight, LayoutDashboard, Bell } from "lucide-react";
import citysenseLogo from "@/assets/citysense-logo.png";
import skyline from "@/assets/montgomery-skyline.png";
import { FeaturesSection } from "@/components/splash/FeatureRows";
import { ValueSection } from "@/components/splash/ValueSection";

const HERO_CHIPS = ["8 Service Categories", "Live News Feed", "AI-Powered Insights"];

function LandingHeader({ onOpenCitizen, onOpenAdmin }: { onOpenCitizen: () => void; onOpenAdmin: () => void }) {
  return (
    <header className="stitch-topbar">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src={citysenseLogo} alt="CitySense" className="w-8 h-8 object-contain" />
          <span className="text-xl font-extrabold text-primary tracking-tight">CitySense</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onOpenCitizen} className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
            Explore as Citizen
          </button>
          <button onClick={onOpenAdmin} className="inline-flex px-3.5 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors">
            Admin Dashboard
          </button>
        </div>
      </div>
    </header>
  );
}

function HeroButtons({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      <button
        onClick={onGetStarted}
        className="inline-flex items-center gap-2 bg-white text-secondary font-semibold px-8 py-3.5 rounded-full text-base shadow-[0_8px_32px_rgba(255,255,255,0.18)] hover:shadow-[0_8px_40px_rgba(255,255,255,0.28)] hover:scale-[1.03] active:scale-[0.98] transition-all"
      >
        Explore as Citizen
        <ArrowRight className="w-5 h-5" />
      </button>
      <button
        onClick={() => (window.location.href = "/admin")}
        className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white font-semibold px-8 py-3.5 rounded-full text-base border border-white/25 hover:bg-white/20 hover:border-white/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        Admin Dashboard
        <LayoutDashboard className="w-5 h-5" />
      </button>
    </div>
  );
}

function HeroSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="relative bg-gradient-to-br from-primary via-secondary to-[#1b3f72] overflow-hidden">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-primary/20 blur-[90px] pointer-events-none" />
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-32 md:pt-22 md:pb-40 text-center relative z-10">
        <div className="inline-flex items-center justify-center p-2.5 rounded-full ring-1 ring-white/10 bg-white/5 mb-8">
          <img src={citysenseLogo} alt="CitySense" className="w-20 h-20 object-contain" />
        </div>
        <h1 className="text-white text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-4">
          CitySense
        </h1>
        <p className="text-accent text-sm font-bold uppercase tracking-[0.2em] mb-6">
          Montgomery, Alabama
        </p>
        <p className="text-white/65 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8">
          City services, local news, and AI-powered civic insights
          <br className="hidden sm:block" />
          — all in one place for residents and city leaders.
        </p>
        <div className="flex items-center justify-center gap-2.5 flex-wrap mb-10">
          {HERO_CHIPS.map((chip) => (
            <span key={chip} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/70 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {chip}
            </span>
          ))}
        </div>
        <HeroButtons onGetStarted={onGetStarted} />
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <img src={skyline} alt="" className="w-full h-44 md:h-56 object-cover object-top opacity-[0.22]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060f1e]/70 to-transparent" />
      </div>
    </section>
  );
}

function NotificationSection() {
  const navigate = useNavigate();
  return (
    <section className="bg-muted/30 py-16 md:py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-border/70 bg-card p-8 md:p-10 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
            <Bell className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">Stay in the loop</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6 leading-relaxed">
            Subscribe to get real-time updates on city services, community events,
            and important news — delivered straight to your device.
          </p>
          <button
            onClick={() => navigate("/notifications")}
            className="inline-flex items-center gap-2 bg-secondary text-white font-semibold px-6 py-3 rounded-full text-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Bell className="w-4 h-4" />
            Subscribe for Notifications
          </button>
        </div>
      </div>
    </section>
  );
}

function CTASection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="relative bg-gradient-to-br from-primary via-secondary to-[#1b3f72] py-20 px-6 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 rounded-full bg-primary/15 blur-[60px] pointer-events-none" />
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <p className="text-accent text-xs font-bold uppercase tracking-[0.2em] mb-4">Ready to explore?</p>
        <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">Montgomery is at your fingertips.</h2>
        <p className="text-white/60 text-base mb-10 max-w-lg mx-auto">
          No account needed. Start browsing services, news, and city data right away.
        </p>
        <button
          onClick={onGetStarted}
          className="inline-flex items-center gap-2 bg-white text-secondary font-semibold px-8 py-3.5 rounded-full text-base shadow-[0_8px_32px_rgba(255,255,255,0.18)] hover:shadow-[0_8px_40px_rgba(255,255,255,0.28)] hover:scale-[1.03] active:scale-[0.98] transition-all"
        >
          Open CitySense
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-background border-t-2 border-[hsl(var(--amber-gold))]/15 py-8 px-6">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <img src={citysenseLogo} alt="" className="w-5 h-5 object-contain opacity-40" />
          <span className="font-medium">CitySense Montgomery</span>
        </div>
        <p>Built for Montgomery, Alabama residents.</p>
      </div>
    </footer>
  );
}

export default function Splash() {
  const navigate = useNavigate();

  function openServices() { navigate("/app/services"); }
  function openNews() { navigate("/app/news"); }
  function openAnswers() { navigate("/app/services?chat=open"); }
  function openServiceCategory(category: "health" | "community" | "libraries") {
    navigate(`/app/services?category=${category}`);
  }

  return (
    <div className="stitch-shell">
      <LandingHeader onOpenCitizen={() => navigate("/app")} onOpenAdmin={() => navigate("/admin")} />
      <HeroSection onGetStarted={() => navigate("/app")} />
      <ValueSection onFindServices={openServices} onStayInformed={openNews} onGetAnswers={openAnswers} />
      <FeaturesSection onSelectService={openServiceCategory} />
      <NotificationSection />
      <CTASection onGetStarted={() => navigate("/app")} />
      <Footer />
    </div>
  );
}
