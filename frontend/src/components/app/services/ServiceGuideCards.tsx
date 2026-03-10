import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Baby,
  GraduationCap,
  Home,
  Scale,
  Zap,
  UtensilsCrossed,
  HelpCircle,
} from "lucide-react";
import type { ServiceGuide } from "@/lib/govServices";
import { GuideExpandedContent } from "./GuideExpandedContent";

const BENEFIT_CATEGORY_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgLight: string;
}> = {
  healthcare: { icon: Heart, label: "Healthcare", color: "text-red-600", bgLight: "bg-red-50 border-red-100" },
  food: { icon: UtensilsCrossed, label: "Food Assistance", color: "text-orange-600", bgLight: "bg-orange-50 border-orange-100" },
  childcare: { icon: Baby, label: "Childcare", color: "text-amber-600", bgLight: "bg-amber-50 border-amber-100" },
  workforce: { icon: GraduationCap, label: "Workforce", color: "text-blue-600", bgLight: "bg-blue-50 border-blue-100" },
  housing: { icon: Home, label: "Housing", color: "text-emerald-600", bgLight: "bg-emerald-50 border-emerald-100" },
  utilities: { icon: Zap, label: "Utilities", color: "text-yellow-600", bgLight: "bg-yellow-50 border-yellow-100" },
  legal: { icon: Scale, label: "Legal Aid", color: "text-purple-600", bgLight: "bg-purple-50 border-purple-100" },
  benefits: { icon: HelpCircle, label: "General Benefits", color: "text-teal-600", bgLight: "bg-teal-50 border-teal-100" },
};

interface ServiceGuideCardsProps {
  guides: ServiceGuide[];
  onNavigateToChat: (message: string) => void;
}

export default function ServiceGuideCards({ guides, onNavigateToChat }: ServiceGuideCardsProps) {
  if (guides.length === 0) return null;

  const grouped = groupGuidesByCategory(guides);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground px-1">
        Eligibility details, step-by-step applications, and required documents.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {grouped.map(({ category, guides: categoryGuides }) => (
          <BenefitCategoryCard
            key={category}
            category={category}
            guides={categoryGuides}
            onNavigateToChat={onNavigateToChat}
          />
        ))}
      </div>
    </div>
  );
}

function groupGuidesByCategory(guides: ServiceGuide[]) {
  const map = new Map<string, ServiceGuide[]>();
  for (const guide of guides) {
    const existing = map.get(guide.category) ?? [];
    existing.push(guide);
    map.set(guide.category, existing);
  }
  return Array.from(map.entries()).map(([category, guides]) => ({ category, guides }));
}

function BenefitCategoryCard({
  category,
  guides,
  onNavigateToChat,
}: {
  category: string;
  guides: ServiceGuide[];
  onNavigateToChat: (msg: string) => void;
}) {
  const [expandedGuideId, setExpandedGuideId] = useState<string | null>(null);
  const config = BENEFIT_CATEGORY_CONFIG[category] ?? BENEFIT_CATEGORY_CONFIG.benefits;
  const Icon = config.icon;

  return (
    <div className={`rounded-2xl border p-5 ${config.bgLight} transition-all overflow-hidden`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl bg-card flex items-center justify-center shadow-sm ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">{config.label}</h3>
          <p className="text-[11px] text-muted-foreground">
            {guides.length} program{guides.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {guides.map((guide) => (
          <GuideItem
            key={guide.id}
            guide={guide}
            isExpanded={expandedGuideId === guide.id}
            onToggle={() => setExpandedGuideId(expandedGuideId === guide.id ? null : guide.id)}
            onNavigateToChat={onNavigateToChat}
          />
        ))}
      </div>
    </div>
  );
}

function GuideItem({
  guide,
  isExpanded,
  onToggle,
  onNavigateToChat,
}: {
  guide: ServiceGuide;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigateToChat: (msg: string) => void;
}) {
  return (
    <div className={`rounded-xl bg-card border transition-all ${isExpanded ? "border-primary/30 shadow-md" : "border-border/60 hover:shadow-sm"}`}>
      <button onClick={onToggle} className="w-full text-left p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-foreground leading-tight">{guide.title}</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">{guide.provider}</p>
          </div>
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
        </div>
        {!isExpanded && (
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
            {guide.description}
          </p>
        )}
      </button>

      {isExpanded && (
        <GuideExpandedContent guide={guide} onNavigateToChat={onNavigateToChat} />
      )}
    </div>
  );
}
