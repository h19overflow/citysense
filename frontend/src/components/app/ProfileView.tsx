import { useState } from "react";
import { useAuth, SignOutButton } from "@clerk/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  LogOut, Moon, Globe, Bell, HelpCircle, Info,
  User, DollarSign, Heart, Loader2, Edit2,
} from "lucide-react";
import { SettingsSection, SettingsRow } from "./SettingsSection";

interface CitizenProfile {
  name: string;
  job_title: string | null;
  salary: number | null;
  benefits: string | null;
  marital_status: "single" | "married" | "divorced" | "widowed" | null;
}

interface ProfileApiResponse {
  exists: boolean;
  profile?: CitizenProfile;
}

interface ProfileFormValues {
  name: string;
  job_title: string;
  salary: string;
  benefits: string;
  marital_status: string;
}

const MARITAL_OPTIONS = ["single", "married", "divorced", "widowed"] as const;
const THEME_CYCLE: Record<string, string> = { system: "light", light: "dark", dark: "system" };

async function fetchCitizenProfile(token: string | null): Promise<ProfileApiResponse> {
  const response = await fetch("/api/citizen/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch profile");
  return response.json();
}

async function saveCitizenProfile(
  token: string | null,
  values: ProfileFormValues
): Promise<ProfileApiResponse> {
  const body = {
    name: values.name,
    job_title: values.job_title || null,
    salary: values.salary ? Number(values.salary) : null,
    benefits: values.benefits || null,
    marital_status: values.marital_status || null,
  };
  const response = await fetch("/api/citizen/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to save profile");
  return response.json();
}

function ProfileForm({
  initial,
  onSave,
  isSaving,
}: {
  initial?: CitizenProfile;
  onSave: (values: ProfileFormValues) => void;
  isSaving: boolean;
}) {
  const [values, setValues] = useState<ProfileFormValues>({
    name: initial?.name ?? "",
    job_title: initial?.job_title ?? "",
    salary: initial?.salary != null ? String(initial.salary) : "",
    benefits: initial?.benefits ?? "",
    marital_status: initial?.marital_status ?? "",
  });

  const setField = (field: keyof ProfileFormValues, value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(values);
  };

  const inputClass =
    "w-full px-3 py-2 text-sm rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name *</label>
        <input
          required
          className={inputClass}
          placeholder="Your full name"
          value={values.name}
          onChange={(e) => setField("name", e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Job Title</label>
        <input
          className={inputClass}
          placeholder="e.g. Teacher, Engineer"
          value={values.job_title}
          onChange={(e) => setField("job_title", e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Annual Salary ($)</label>
        <input
          type="number"
          className={inputClass}
          placeholder="e.g. 45000"
          value={values.salary}
          onChange={(e) => setField("salary", e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Benefits (comma-separated)
        </label>
        <input
          className={inputClass}
          placeholder="e.g. SNAP, Medicaid"
          value={values.benefits}
          onChange={(e) => setField("benefits", e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Marital Status</label>
        <select
          className={inputClass}
          value={values.marital_status}
          onChange={(e) => setField("marital_status", e.target.value)}
        >
          <option value="">Select status</option>
          {MARITAL_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
        Save Profile
      </button>
    </form>
  );
}

function AppearanceRow() {
  const { theme, setTheme } = useTheme();
  const currentTheme = theme ?? "system";
  const cycleTheme = () => setTheme(THEME_CYCLE[currentTheme] ?? "system");
  const label = currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1);

  return (
    <button
      onClick={cycleTheme}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Moon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-foreground">Appearance</span>
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </button>
  );
}

export default function ProfileView() {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading, error } = useQuery<ProfileApiResponse>({
    queryKey: ["citizen", "profile"],
    queryFn: async () => fetchCitizenProfile(await getToken()),
    enabled: !!isSignedIn,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    staleTime: 5 * 60 * 1000,
  });

  const { mutate: saveProfile, isPending: isSaving } = useMutation({
    mutationFn: async (values: ProfileFormValues) =>
      saveCitizenProfile(await getToken(), values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["citizen", "profile"] });
      setIsEditing(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-destructive px-6 text-center">
        Failed to load profile. Please try again.
      </div>
    );
  }

  const showForm = !data.exists || isEditing;
  const profile = data.profile;

  return (
    <div className="flex-1 overflow-y-auto bg-muted/30">
      <div className="bg-gradient-to-br from-[#060f1e] via-secondary to-[#0d1b35] pt-8 pb-10 px-6 flex flex-col items-center gap-3 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full bg-primary/20 blur-[50px] pointer-events-none" />
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-white/20 relative z-10">
          <User className="w-10 h-10" />
        </div>
        <div className="text-center relative z-10">
          <h1 className="text-xl font-bold text-white">
            {profile?.name ?? "Welcome"}
          </h1>
          <p className="text-sm text-white/60">
            {data.exists ? "Montgomery, AL" : "Complete your profile to get started"}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-4 space-y-5 pb-10">
        {showForm ? (
          <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                {data.exists ? "Edit Profile" : "Create Your Profile"}
              </h2>
              {data.exists && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
            <ProfileForm
              initial={profile}
              onSave={saveProfile}
              isSaving={isSaving}
            />
          </div>
        ) : (
          <>
            <SettingsSection title="Personal Information">
              <SettingsRow icon={User} label="Name" value={profile?.name ?? "—"} />
              <SettingsRow icon={Heart} label="Marital Status" value={profile?.marital_status ?? "—"} />
              <SettingsRow
                icon={DollarSign}
                label="Annual Salary"
                value={profile?.salary != null ? `$${profile.salary.toLocaleString()}` : "—"}
              />
              <SettingsRow
                icon={DollarSign}
                label="Job Title"
                value={profile?.job_title ?? "—"}
              />
            </SettingsSection>

            <button
              onClick={() => setIsEditing(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          </>
        )}

        <SettingsSection title="App Settings">
          <AppearanceRow />
          <SettingsRow icon={Bell} label="Notifications" value="On" chevron />
          <SettingsRow icon={Globe} label="Language" value="English" chevron />
        </SettingsSection>

        <SettingsSection title="Support">
          <SettingsRow icon={HelpCircle} label="Help Center" chevron />
          <SettingsRow icon={Info} label="About CitySense" value="v1.0.0" chevron />
        </SettingsSection>

        <SignOutButton>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 bg-card text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
