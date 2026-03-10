import TopBar from "../TopBar";
import AiBubble from "../AiBubble";
import ChatInput from "../ChatInput";
import ChipButton from "../ChipButton";

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
      { name: "Lean Manufacturing", owned: false },
      { name: "Scheduling", owned: true },
      { name: "Safety Protocols", owned: true },
    ],
    training: "AIDT: Manufacturing Leadership — FREE, 6 weeks",
  },
  {
    title: "Maintenance Technician",
    raise: "+$12,000/yr median in Montgomery",
    skills: [
      { name: "PLC Programming", owned: false },
      { name: "Hydraulics", owned: false },
      { name: "Electrical Systems", owned: false },
      { name: "Mechanical Aptitude", owned: true },
    ],
    training: "Trenholm State: Industrial Maintenance Cert — WIOA funded, 16 weeks",
  },
];

const SkillGapScreen = () => (
  <div className="w-full h-full bg-background flex flex-col">
    <TopBar showProfile />
    <div className="flex-1 overflow-y-auto pb-2">
      <AiBubble>
        <p className="text-sm text-foreground mb-3">
          You're at Production Operator (Hyundai). Here are your 3 best moves up the ladder:
        </p>

        <div className="space-y-3 mb-3">
          {careers.map((c) => (
            <div key={c.title} className="bg-card rounded-xl border-l-4 border-secondary p-3 shadow-sm">
              <h4 className="font-bold text-xs text-foreground">{c.title}</h4>
              <p className="text-[10px] text-pine-green font-bold mb-2">{c.raise}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {c.skills.map((s) => (
                  <span
                    key={s.name}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                      s.owned
                        ? "bg-pine-green/15 text-pine-green"
                        : "border border-primary text-primary"
                    }`}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
              <div className="bg-accent/20 rounded-lg px-2 py-1.5">
                <p className="text-[10px] text-foreground font-medium">🎓 {c.training}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-foreground mb-3">
          💡 Good news: WIOA can fund your training costs. If you have kids, your childcare subsidy CONTINUES during training — I checked.
        </p>

        <button className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-xs font-bold">
          📄 Download Your Career Roadmap (PDF)
        </button>
      </AiBubble>

      <div className="flex flex-wrap gap-2 px-4 pt-1 pb-2 ml-9">
        <ChipButton label="Walk me through WIOA application" />
      </div>
    </div>
    <ChatInput />
  </div>
);

export default SkillGapScreen;
