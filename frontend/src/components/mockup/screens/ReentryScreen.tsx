import TopBar from "../TopBar";
import AiBubble from "../AiBubble";
import ChatInput from "../ChatInput";

const timeline = [
  {
    label: "Day 1",
    color: "bg-primary",
    text: "Apply for Medicaid: you qualify immediately upon release. I'll walk you through the form right now.",
  },
  {
    label: "Week 1",
    color: "bg-secondary",
    text: "AIDT Construction Trades Orientation — free, no background check barrier. Register at aidt.edu.",
  },
  {
    label: "Month 1",
    color: "bg-accent",
    text: "Apply to 3 employers with fair-chance hiring: Amazon (logistics), Vulcan Materials, City of Montgomery Parks Dept.",
  },
  {
    label: "Month 1",
    color: "bg-accent",
    text: "File Certificate of Relief petition at Montgomery Circuit Court — removes disclosure requirement on job applications.",
  },
];

const ReentryScreen = () => (
  <div className="w-full h-full bg-background flex flex-col">
    <TopBar showProfile />
    <div className="flex-1 overflow-y-auto pb-2">
      <AiBubble>
        <p className="text-sm font-bold text-foreground mb-3">
          Here's your first 30 days back in Montgomery.
        </p>

        {/* Timeline */}
        <div className="relative pl-6 mb-4">
          {/* Vertical line */}
          <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-primary/30" />

          {timeline.map((item, i) => (
            <div key={i} className="relative pb-4 last:pb-0">
              <div className={`absolute left-[-15px] top-0.5 w-[18px] h-[18px] rounded-full ${item.color} flex items-center justify-center`}>
                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              </div>
              <p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-0.5">{item.label}</p>
              <p className="text-xs text-foreground leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>

        {/* Downloads */}
        <div className="space-y-2 mb-3">
          <button className="w-full bg-secondary text-secondary-foreground rounded-xl py-2.5 text-xs font-bold">
            📄 Download Reentry Application Checklist (PDF)
          </button>
          <button className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-xs font-bold">
            📄 Download Career Roadmap (PDF)
          </button>
        </div>

        <p className="text-caption text-muted-foreground italic">
          I don't need to know the nature of your conviction. I use conservative eligibility rules and tell you exactly what to expect.
        </p>
      </AiBubble>
    </div>
    <ChatInput />
  </div>
);

export default ReentryScreen;
