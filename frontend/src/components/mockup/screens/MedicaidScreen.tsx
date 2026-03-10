import TopBar from "../TopBar";
import AiBubble from "../AiBubble";
import ChatInput from "../ChatInput";

const options = [
  { icon: "✅", name: "QMB (Medicare Savings)", status: "green", desc: "You likely qualify. Covers premiums, copays. Apply at DHR — call (334) 293-4500." },
  { icon: "✅", name: "CHIP for your children", status: "green", desc: "Kids under 19 can stay covered immediately. Apply online: alabamakids.com." },
  { icon: "🔄", name: "Marketplace Special Enrollment", status: "blue", desc: "Loss of Medicaid opens a 60-day window. Open now." },
  { icon: "📍", name: "Cooper Green Clinic (FQHC)", status: "location", desc: "2501 6th Ave S — sliding scale, no insurance needed." },
];

const MedicaidScreen = () => (
  <div className="w-full h-full bg-background flex flex-col">
    <TopBar showProfile />
    <div className="flex-1 overflow-y-auto pb-2">
      <AiBubble>
        {/* Alert banner */}
        <div className="bg-accent text-accent-foreground rounded-xl p-3 mb-3 -mx-1">
          <p className="text-xs font-bold">🔴 High Priority — Coverage Gap Detected. Acting fast matters.</p>
        </div>

        <p className="text-sm text-foreground mb-3">
          You lost Medicaid. Here's what's available RIGHT NOW in Montgomery:
        </p>

        <div className="space-y-3 mb-4">
          {options.map((opt) => (
            <div key={opt.name} className="flex gap-2">
              <span className="text-sm shrink-0">{opt.icon}</span>
              <div>
                <p className="text-xs font-bold text-foreground">{opt.name}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{opt.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Downloads */}
        <div className="space-y-2 mb-3">
          <button className="w-full bg-secondary text-secondary-foreground rounded-xl py-2.5 text-xs font-bold">
            📄 Download Coverage Options Card (PDF)
          </button>
          <button className="w-full bg-secondary text-secondary-foreground rounded-xl py-2.5 text-xs font-bold">
            📄 Download Re-enrollment Checklist (PDF)
          </button>
        </div>

        <div className="border-t border-border pt-3">
          <p className="text-[10px] text-muted-foreground font-medium mb-2">
            — Meanwhile, here are 3 jobs in Montgomery that include health insurance from Day 1 —
          </p>
        </div>
      </AiBubble>
    </div>
    <ChatInput />
  </div>
);

export default MedicaidScreen;
