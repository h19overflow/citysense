import { Phone, Clock, Globe, FileText, MapPin } from "lucide-react";
import type { ServiceCardData } from "@/lib/types";

export function ServiceCard({ card }: { card: ServiceCardData }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-2.5 space-y-1.5 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold leading-tight break-words min-w-0">{card.title}</p>
        {card.category && (
          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {card.category}
          </span>
        )}
      </div>
      {card.description && (
        <p className="text-[10px] text-muted-foreground leading-snug break-words">{card.description}</p>
      )}
      <div className="space-y-0.5">
        {card.phone && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Phone className="h-2.5 w-2.5 shrink-0" />
            <span>{card.phone}</span>
          </div>
        )}
        {card.address && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span>{card.address}</span>
          </div>
        )}
        {card.hours && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5 shrink-0" />
            <span>{card.hours}</span>
          </div>
        )}
        {card.wait_time && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-600">
            <Clock className="h-2.5 w-2.5 shrink-0" />
            <span>Wait: {card.wait_time}</span>
          </div>
        )}
        {card.url && (
          <div className="flex items-center gap-1.5 text-[10px]">
            <Globe className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
            <a href={card.url} target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline truncate">{card.url}</a>
          </div>
        )}
      </div>
      {card.programs.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {card.programs.slice(0, 4).map((p) => (
            <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {p}
            </span>
          ))}
        </div>
      )}
      {card.what_to_bring.length > 0 && (
        <div className="pt-0.5">
          <p className="text-[9px] font-medium text-muted-foreground mb-0.5 flex items-center gap-1">
            <FileText className="h-2.5 w-2.5" /> Bring:
          </p>
          <ul className="text-[9px] text-muted-foreground space-y-0 pl-3">
            {card.what_to_bring.slice(0, 3).map((doc) => (
              <li key={doc} className="list-disc">{doc}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
