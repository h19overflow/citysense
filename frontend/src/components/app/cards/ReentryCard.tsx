import { toast } from "sonner";

const timeline = [
  { label: "Day 1", color: "bg-primary", text: "Apply for Medicaid: you qualify immediately upon release. I'll walk you through the form right now." },
  { label: "Week 1", color: "bg-secondary", text: "AIDT Construction Trades Orientation — free, no background check barrier. Register at aidt.edu." },
  { label: "Month 1", color: "bg-accent", text: "Apply to 3 employers with fair-chance hiring: Amazon (logistics), Vulcan Materials, City of Montgomery Parks Dept." },
  { label: "Month 1", color: "bg-accent", text: "File Certificate of Relief petition at Montgomery Circuit Court — removes disclosure requirement on job applications." },
];

const ReentryCard = () => (
  <div className="space-y-3">
    <p className="text-sm font-bold text-foreground">
      Here's your first 30 days back in Montgomery.
    </p>

    {/* Timeline */}
    <div className="relative pl-6">
      <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-primary/30" />
      {timeline.map((item, i) => (
        <div key={i} className="relative pb-4 last:pb-0">
          <div className={`absolute left-[-15px] top-0.5 w-[18px] h-[18px] rounded-full ${item.color} flex items-center justify-center`}>
            <div className="w-2 h-2 rounded-full bg-card" />
          </div>
          <p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-0.5">{item.label}</p>
          <p className="text-xs text-foreground leading-relaxed">{item.text}</p>
        </div>
      ))}
    </div>

    <div className="space-y-2">
      <button
        onClick={() => toast.success("PDF download will be available when AI backend is connected")}
        className="w-full bg-secondary text-secondary-foreground rounded-xl py-2.5 text-xs font-bold hover:bg-secondary/90 transition-colors"
      >
        📄 Download Reentry Checklist (PDF)
      </button>
      <button
        onClick={() => toast.success("PDF download will be available when AI backend is connected")}
        className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-xs font-bold hover:bg-primary/90 transition-colors"
      >
        📄 Download Career Roadmap (PDF)
      </button>
    </div>

    <p className="text-caption text-muted-foreground italic">
      I don't need to know the nature of your conviction. I use conservative eligibility rules and tell you exactly what to expect.
    </p>
  </div>
);

export default ReentryCard;
