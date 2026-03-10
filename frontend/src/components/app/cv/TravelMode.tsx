import { Clock } from "lucide-react";

interface TravelModeProps {
  icon: React.ComponentType<{ className?: string }>;
  minutes: number;
  label: string;
  color: string;
}

export function TravelMode({ icon: Icon, minutes, label, color }: TravelModeProps) {
  return (
    <div className="text-center">
      <Icon className={`w-4 h-4 mx-auto ${color}`} />
      <p className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-0.5 justify-center">
        <Clock className="w-2.5 h-2.5 text-muted-foreground" />
        {minutes}m
      </p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
