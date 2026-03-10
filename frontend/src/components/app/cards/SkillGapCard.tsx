import { toast } from "sonner";

const careers = [
  {
    title: "Quality Control Technician",
    raise: "+$8,400/yr median in Montgomery",
    skills: [
      { name: "SPC Methods", owned: false },
      { name: "ISO 9001", owned: false },
      { name: "Minitab", owned: false },
      { name: "Blueprint Reading", owned: true },
      { name: "Safety Protocols", owned: true },
    ],
    training: "AIDT: Quality Control Cert — FREE, 8 weeks",
  },
  {
    title: "Line Lead / Shift Supervisor",
    raise: "+$6,200/yr median in Montgomery",
    skills: [
      { name: "Team Leadership", owned: false },
      { name: "Lean Mfg", owned: false },
      { name: "Scheduling", owned: true },
      { name: "Safety", owned: true },
    ],
    training: "AIDT: Manufacturing Leadership — FREE, 6 weeks",
  },
  {
    title: "Maintenance Technician",
    raise: "+$12,000/yr median in Montgomery",
    skills: [
      { name: "PLC Programming", owned: false },
      { name: "Hydraulics", owned: false },
      { name: "Electrical", owned: false },
      { name: "Mechanical", owned: true },
    ],
    training: "Trenholm State: Industrial Maint. — WIOA funded, 16 wks",
  },
];

const SkillGapCard = () => (
  <div className="space-y-3">
    <p className="text-sm text-foreground">
      You're at Production Operator (Hyundai). Here are your 3 best moves up the ladder:
    </p>

    {careers.map((c) => (
      <div key={c.title} className="bg-card rounded-xl border-l-4 border-secondary p-3 shadow-sm space-y-2">
        <div>
          <h4 className="font-bold text-xs text-foreground">{c.title}</h4>
          <p className="text-[10px] text-pine-green font-bold">{c.raise}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {c.skills.map((s) => (
            <span
              key={s.name}
              className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                s.owned ? "bg-pine-green/15 text-pine-green" : "border border-primary text-primary"
              }`}
            >
              {s.name}
            </span>
          ))}
        </div>
        <div className="bg-accent/15 rounded-lg px-2 py-1.5">
          <p className="text-[10px] text-foreground font-medium">🎓 {c.training}</p>
        </div>
      </div>
    ))}

    <p className="text-xs text-foreground">
      💡 Good news: WIOA can fund your training costs. If you have kids, your childcare subsidy CONTINUES during training — I checked.
    </p>

    <button
      onClick={() => toast.success("PDF download will be available when AI backend is connected")}
      className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-xs font-bold hover:bg-primary/90 transition-colors"
    >
      📄 Download Your Career Roadmap (PDF)
    </button>
  </div>
);

export default SkillGapCard;
