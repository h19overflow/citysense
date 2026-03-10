import { AlertTriangle } from "lucide-react";

export function ServicesPreview({
  onSelectService,
}: {
  onSelectService: (category: "health" | "community" | "libraries") => void;
}) {
  const services = [
    { name: "Family Health Center", cat: "Health", detail: "Walk-ins accepted", category: "health" as const },
    { name: "Newtown Community Center", cat: "Community", detail: "Mon-Sat 8am-6pm", category: "community" as const },
    { name: "Montgomery Public Library", cat: "Library", detail: "Free WiFi & programs", category: "libraries" as const },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-white shadow-md shadow-black/5 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-emerald-400 to-blue-500" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-muted-foreground">Services Map</span>
        </div>
        {services.map((s) => (
          <button
            key={s.name}
            onClick={() => onSelectService(s.category)}
            className="w-full flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3 text-left hover:bg-muted/70 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.detail}</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-full">
              {s.cat}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NewsPreview() {
  const articles = [
    { title: "City approves new transit routes", sentiment: "positive", risk: 0 },
    { title: "Community reacts to school funding changes", sentiment: "mixed", risk: 0 },
    { title: "Unverified claims about water quality", sentiment: "negative", risk: 65 },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-white shadow-md shadow-black/5 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs font-medium text-muted-foreground">News Feed</span>
        </div>
        {articles.map((a) => (
          <div key={a.title} className="rounded-xl bg-muted/40 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-foreground">{a.title}</p>
            <div className="flex items-center gap-3">
              <SentimentBadge sentiment={a.sentiment} />
              {a.risk > 0 && (
                <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Misinfo risk {a.risk}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const style =
    sentiment === "positive" ? "bg-emerald-50 text-emerald-600" :
    sentiment === "negative" ? "bg-red-50 text-red-600" :
    "bg-amber-50 text-amber-600";

  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${style}`}>
      {sentiment}
    </span>
  );
}

export function AdminPreview() {
  const stats = [
    { label: "Positive Sentiment", value: "64%", color: "text-emerald-600" },
    { label: "Active Hotspots", value: "3", color: "text-red-500" },
    { label: "Citizen Comments", value: "1,247", color: "text-blue-600" },
    { label: "Articles Analyzed", value: "259", color: "text-purple-600" },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-white shadow-md shadow-black/5 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-xs font-medium text-muted-foreground">Admin Dashboard</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl bg-muted/40 p-3 text-center">
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-muted/40 px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">AI Insight</p>
          <p className="text-sm text-foreground font-medium">
            "Transportation concerns in West Montgomery trending upward — 40% increase in related comments this week."
          </p>
        </div>
      </div>
    </div>
  );
}
