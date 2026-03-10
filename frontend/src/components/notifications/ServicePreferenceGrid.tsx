import { Mail, MessageSquare, BellRing } from "lucide-react";
import { CATEGORY_CARDS } from "@/components/app/services/serviceCategories";
import { useToast } from "@/hooks/use-toast";

export interface ServicePreferences {
  [serviceId: string]: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

interface ServicePreferenceGridProps {
  preferences: ServicePreferences;
  onToggle: (serviceId: string, type: "email" | "sms" | "push") => void;
}

export function ServicePreferenceGrid({ preferences, onToggle }: ServicePreferenceGridProps) {
  return (
    <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Select Services & Notification Preferences
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        Choose how you want to be notified for each service category.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CATEGORY_CARDS.map((service) => {
          const Icon = service.icon;
          const prefs = preferences[service.id] || { email: false, sms: false, push: false };
          const isAnySelected = prefs.email || prefs.sms || prefs.push;

          return (
            <div
              key={service.id}
              className={`p-3 rounded-xl border-2 transition-all ${
                isAnySelected ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-start gap-2 mb-3">
                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${service.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{service.label}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <ChannelCheckbox
                  checked={prefs.email}
                  onChange={() => onToggle(service.id, "email")}
                  icon={Mail}
                  label="Email"
                />
                <ChannelCheckbox
                  checked={prefs.sms}
                  onChange={() => onToggle(service.id, "sms")}
                  icon={MessageSquare}
                  label="SMS"
                />
                <ChannelCheckbox
                  checked={prefs.push}
                  onChange={() => onToggle(service.id, "push")}
                  icon={BellRing}
                  label="Push"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChannelCheckbox({
  checked,
  onChange,
  icon: Icon,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary/20"
      />
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        <span className="text-sm text-foreground">{label}</span>
      </div>
    </label>
  );
}

export function useNotificationPreferences() {
  const { toast } = useToast();

  async function handlePushToggle(
    serviceId: string,
    currentPrefs: ServicePreferences,
    setPushPermissionGranted: (granted: boolean) => void,
  ): Promise<boolean> {
    if (currentPrefs[serviceId]?.push) return true; // toggling off is always fine

    if (!("Notification" in window)) {
      toast({ title: "Not supported", description: "Your browser doesn't support push notifications.", variant: "destructive" });
      return false;
    }
    if (Notification.permission === "denied") {
      toast({ title: "Blocked", description: "Please enable notifications in your browser settings.", variant: "destructive" });
      return false;
    }
    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({ title: "Permission denied", description: "Push notifications require browser permission.", variant: "destructive" });
        return false;
      }
      setPushPermissionGranted(true);
    }
    return true;
  }

  return { handlePushToggle };
}
