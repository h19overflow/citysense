import { useEffect } from "react";
import {
  LogOut,
  MapPin,
  Bell,
  Moon,
  Globe,
  Shield,
  HelpCircle,
  Info,
  User,
  Heart,
  Home,
  DollarSign,
  Users,
  Loader2,
} from "lucide-react";
import { useApp } from "@/lib/appContext";
import { fetchCitizenProfiles, extractProfileData } from "@/lib/citizenProfiles";
import { SettingsSection, SettingsRow } from "./SettingsSection";

export default function ProfileView() {
  const { state, dispatch } = useApp();
  const meta = state.citizenMeta;
  const cv = state.cvData;

  useEffect(() => {
    if (meta && cv) return;
    fetchCitizenProfiles().then((citizens) => {
      if (citizens.length === 0) return;
      const citizen = citizens[0];
      dispatch({ type: "SET_CV_DATA", data: citizen.cv });
      dispatch({ type: "SET_CV_FILE", fileName: `${citizen.persona}_resume.pdf` });
      dispatch({ type: "UPDATE_PROFILE", data: extractProfileData(citizen) });
      dispatch({
        type: "SET_CITIZEN_META",
        meta: {
          id: citizen.id,
          persona: citizen.persona,
          tagline: citizen.tagline,
          avatarInitials: citizen.avatarInitials,
          avatarColor: citizen.avatarColor,
          goals: citizen.goals,
          barriers: citizen.barriers,
          civicData: citizen.profile,
        },
      });
    });
  }, [meta, cv]);

  if (!meta || !cv) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const p = meta.civicData;

  return (
    <div className="flex-1 overflow-y-auto bg-muted/30">
      {/* Gradient banner */}
      <div className="bg-gradient-to-br from-[#060f1e] via-secondary to-[#0d1b35] pt-8 pb-10 px-6 flex flex-col items-center gap-3 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full bg-primary/20 blur-[50px] pointer-events-none" />
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-white/20 relative z-10"
          style={{ backgroundColor: meta.avatarColor }}
        >
          {meta.avatarInitials}
        </div>
        <div className="text-center relative z-10">
          <h1 className="text-xl font-bold text-white">{cv.name}</h1>
          <p className="text-sm text-white/60">{p.neighborhood}, Montgomery, AL</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-4 space-y-5 pb-10">
        <SettingsSection title="Personal Information">
          <SettingsRow icon={User} label="Name" value={cv.name} />
          <SettingsRow icon={MapPin} label="Location" value={`${p.neighborhood}, AL ${p.zip}`} />
          <SettingsRow icon={Users} label="Household" value={`${p.householdSize} people`} />
          <SettingsRow icon={DollarSign} label="Income" value={`$${p.income.toLocaleString()}/yr`} />
          <SettingsRow icon={Home} label="Housing" value={p.housingType} last />
        </SettingsSection>

        <SettingsSection title="Benefits & Services">
          <SettingsRow icon={Heart} label="Health Insurance" value={p.healthInsurance} />
          <SettingsRow
            icon={Shield}
            label="Current Benefits"
            value={p.benefits.length > 0 ? `${p.benefits.length} active` : "None"}
            last
          />
        </SettingsSection>

        <SettingsSection title="App Settings">
          <SettingsRow icon={Bell} label="Notifications" value="On" chevron />
          <SettingsRow icon={Moon} label="Appearance" value="System" chevron />
          <SettingsRow icon={Globe} label="Language" value="English" chevron last />
        </SettingsSection>

        <SettingsSection title="Support">
          <SettingsRow icon={HelpCircle} label="Help Center" chevron />
          <SettingsRow icon={Info} label="About CitySense" value="v1.0.0" chevron last />
        </SettingsSection>

        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 bg-white text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
