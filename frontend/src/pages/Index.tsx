import { useState } from "react";
import PhoneFrame from "@/components/mockup/PhoneFrame";
import SplashScreen from "@/components/mockup/screens/SplashScreen";
import OnboardingScreen from "@/components/mockup/screens/OnboardingScreen";
import ChatScreen from "@/components/mockup/screens/ChatScreen";
import BenefitsCliffScreen from "@/components/mockup/screens/BenefitsCliffScreen";
import JobCardScreen from "@/components/mockup/screens/JobCardScreen";
import MedicaidScreen from "@/components/mockup/screens/MedicaidScreen";
import SkillGapScreen from "@/components/mockup/screens/SkillGapScreen";
import PdfPreviewScreen from "@/components/mockup/screens/PdfPreviewScreen";
import SpanishScreen from "@/components/mockup/screens/SpanishScreen";
import ReentryScreen from "@/components/mockup/screens/ReentryScreen";
import citysenseLogo from "@/assets/citysense-logo.png";

const screens = [
  { id: 1, name: "Splash", component: SplashScreen },
  { id: 2, name: "Onboarding", component: OnboardingScreen },
  { id: 3, name: "Chat", component: ChatScreen },
  { id: 4, name: "Benefits Cliff", component: BenefitsCliffScreen },
  { id: 5, name: "Job Card", component: JobCardScreen },
  { id: 6, name: "Medicaid Emergency", component: MedicaidScreen },
  { id: 7, name: "Skill Gap", component: SkillGapScreen },
  { id: 8, name: "PDF Preview", component: PdfPreviewScreen },
  { id: 9, name: "Spanish", component: SpanishScreen },
  { id: 10, name: "Reentry", component: ReentryScreen },
];

const Index = () => {
  const [activeScreen, setActiveScreen] = useState(0);
  const ActiveComponent = screens[activeScreen].component;

  return (
    <div className="min-h-screen bg-[#1b1b1b]">
      {/* Hero header */}
      <div className="bg-secondary py-12 px-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src={citysenseLogo} alt="CitySense" className="w-10 h-10 object-contain" />
          <h1 className="text-white text-3xl font-bold tracking-tight">CitySense</h1>
        </div>
        <p className="text-white/80 text-lg max-w-xl mx-auto">
          One conversation. Benefits + Career. Built for Montgomery, Alabama.
        </p>
      </div>

      {/* Screen selector */}
      <div className="bg-[#1b1b1b] border-b border-foreground/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {screens.map((screen, i) => (
              <button
                key={screen.id}
                onClick={() => setActiveScreen(i)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  activeScreen === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-foreground/10 text-white/70 hover:bg-foreground/20"
                }`}
              >
                {screen.id}. {screen.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Phone display */}
      <div className="flex justify-center py-12 px-4">
        <div className="animate-fade-up" key={activeScreen}>
          <PhoneFrame>
            <ActiveComponent />
          </PhoneFrame>
        </div>
      </div>

      {/* Screen title */}
      <div className="text-center pb-12">
        <p className="text-white/50 text-sm uppercase tracking-widest mb-1">Screen {screens[activeScreen].id}</p>
        <h2 className="text-white text-2xl font-bold">{screens[activeScreen].name}</h2>
      </div>
    </div>
  );
};

export default Index;
