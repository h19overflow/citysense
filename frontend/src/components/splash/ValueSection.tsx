import { MapPin, MessageSquare, Newspaper, ArrowRight } from "lucide-react";

function ValueCard({
  icon: Icon,
  title,
  description,
  accent,
  iconColor,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  accent: string;
  iconColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border border-border/60 bg-white p-6 hover:shadow-2xl hover:-translate-y-1.5 hover:border-primary/30 transition-all duration-200 text-left w-full"
    >
      <div className={`w-14 h-14 rounded-xl ${accent} border flex items-center justify-center mb-5`}>
        <Icon className={`w-7 h-7 ${iconColor}`} />
      </div>
      <h3 className="font-bold text-foreground text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed mb-4">{description}</p>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
        Explore
        <ArrowRight className="w-3.5 h-3.5 translate-x-0 group-hover:translate-x-1 opacity-60 group-hover:opacity-100 transition-all" />
      </span>
    </button>
  );
}

export function ValueSection({
  onFindServices,
  onStayInformed,
  onGetAnswers,
}: {
  onFindServices: () => void;
  onStayInformed: () => void;
  onGetAnswers: () => void;
}) {
  return (
    <section className="bg-gradient-to-b from-background to-muted/30 py-16 md:py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-[0.18em] bg-primary/10 text-primary mb-4">
            What CitySense does
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Connecting residents to what matters
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Find services, stay informed, and get answers — while city leaders
            get real-time civic intelligence.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <ValueCard
            icon={MapPin}
            title="Find Services"
            description="Health clinics, childcare, libraries, parks, and community resources — all on an interactive map with real details."
            accent="bg-blue-50 border-blue-100"
            iconColor="text-blue-600"
            onClick={onFindServices}
          />
          <ValueCard
            icon={Newspaper}
            title="Stay Informed"
            description="Local news with community sentiment analysis, misinformation detection, and reactions from fellow residents."
            accent="bg-emerald-50 border-emerald-100"
            iconColor="text-emerald-600"
            onClick={onStayInformed}
          />
          <ValueCard
            icon={MessageSquare}
            title="Get Answers"
            description="Ask the AI assistant about benefits, jobs, healthcare, or any civic question — in plain English."
            accent="bg-purple-50 border-purple-100"
            iconColor="text-purple-600"
            onClick={onGetAnswers}
          />
        </div>
      </div>
    </section>
  );
}
