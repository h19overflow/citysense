import { User, Mail, Phone, MapPin } from "lucide-react";
import type { CvData } from "@/lib/types";

interface PersonalInfoCardProps {
  data: CvData;
}

const INFO_ROWS = [
  { icon: User, label: "Name", field: "name" as const },
  { icon: Mail, label: "Email", field: "email" as const },
  { icon: Phone, label: "Phone", field: "phone" as const },
  { icon: MapPin, label: "Location", field: "location" as const },
];

const PersonalInfoCard = ({ data }: PersonalInfoCardProps) => (
  <div className="rounded-xl border border-border/50 bg-white px-5 py-4">
    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
      <User className="w-4 h-4 text-primary" />
      Personal Information
    </h3>
    <div className="space-y-2">
      {INFO_ROWS.map(({ icon: Icon, label, field }) => (
        <div key={field} className="flex items-center gap-3">
          <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
          <span className="text-sm text-foreground">{data[field]}</span>
        </div>
      ))}
    </div>
  </div>
);

export default PersonalInfoCard;
