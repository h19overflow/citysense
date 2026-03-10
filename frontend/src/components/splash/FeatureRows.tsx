import {
  MapPin,
  MessageSquare,
  LayoutDashboard,
  Shield,
  TrendingUp,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { ServicesPreview, NewsPreview, AdminPreview } from "./FeaturePreviews";

interface Highlight {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}

function FeatureRow({
  reverse,
  badge,
  title,
  description,
  highlights,
  preview,
}: {
  reverse: boolean;
  badge: string;
  title: string;
  description: string;
  highlights: Highlight[];
  preview: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"} gap-8 md:gap-16 items-center`}>
      <div className="flex-1 space-y-4">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-primary/20 bg-primary/8 text-primary">
          {badge}
        </span>
        <h3 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        <div className="space-y-2.5 pt-2">
          {highlights.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-foreground font-medium">{text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 w-full">{preview}</div>
    </div>
  );
}

export function FeaturesSection({
  onSelectService,
}: {
  onSelectService: (category: "health" | "community" | "libraries") => void;
}) {
  return (
    <section className="bg-muted/30 py-16 md:py-20 px-6">
      <div className="max-w-5xl mx-auto space-y-14">
        <FeatureRow
          reverse={false}
          badge="For Citizens"
          title="Everything Montgomery has to offer"
          description="Browse an interactive map of city services — from health clinics to parks. Filter by category, see hours and contact info, and get directions. The AI assistant can answer questions about eligibility, walk you through applications, and connect you to the right resources."
          highlights={[
            { icon: MapPin, text: "Interactive service map with live details" },
            { icon: Shield, text: "Benefits eligibility and cliff analysis" },
            { icon: MessageSquare, text: "AI assistant for civic questions" },
          ]}
          preview={<ServicesPreview onSelectService={onSelectService} />}
        />

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <FeatureRow
          reverse={true}
          badge="Local News"
          title="News that matters, verified by community"
          description="Read local Montgomery news enriched with community sentiment, reaction tracking, and AI-powered misinformation detection. See what your neighbors think about stories, flag suspicious content, and explore news geographically on the map view."
          highlights={[
            { icon: TrendingUp, text: "Community sentiment on every article" },
            { icon: AlertTriangle, text: "Misinformation risk scoring" },
            { icon: MapPin, text: "Geographic news map with overlays" },
          ]}
          preview={<NewsPreview />}
        />

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <FeatureRow
          reverse={false}
          badge="For City Leaders"
          title="Real-time civic intelligence dashboard"
          description="The admin dashboard gives city leaders a pulse on Montgomery. See community sentiment trends, predictive hotspot analysis, citizen comment feeds, and AI-generated insights — all in one place to help make data-driven decisions."
          highlights={[
            { icon: BarChart3, text: "Sentiment analysis and trends" },
            { icon: LayoutDashboard, text: "Predictive neighborhood hotspots" },
            { icon: MessageSquare, text: "AI analyst for deeper civic insights" },
          ]}
          preview={<AdminPreview />}
        />
      </div>
    </section>
  );
}
