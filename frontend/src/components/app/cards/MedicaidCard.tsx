import { toast } from "sonner";

const options = [
  { icon: "✅", name: "QMB (Medicare Savings)", desc: "You likely qualify. Covers premiums, copays. Apply at DHR — call (334) 293-4500." },
  { icon: "✅", name: "CHIP for your children", desc: "Kids under 19 can stay covered immediately. Apply online: alabamakids.com." },
  { icon: "🔄", name: "Marketplace Special Enrollment", desc: "Loss of Medicaid opens a 60-day window. Open now." },
  { icon: "📍", name: "Cooper Green Clinic (FQHC)", desc: "2501 6th Ave S — sliding scale, no insurance needed." },
];

const MedicaidCard = () => (
  <div className="space-y-3">
    {/* Alert banner */}
    <div className="bg-accent text-accent-foreground rounded-xl p-3">
      <p className="text-xs font-bold">🔴 High Priority — Coverage Gap Detected. Acting fast matters.</p>
    </div>

    <p className="text-sm text-foreground">
      You lost Medicaid. Here's what's available RIGHT NOW in Montgomery:
    </p>

    <div className="space-y-3">
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

    <div className="space-y-2">
      <button
        onClick={() => toast.success("PDF download will be available when AI backend is connected")}
        className="w-full bg-secondary text-secondary-foreground rounded-xl py-2.5 text-xs font-bold hover:bg-secondary/90 transition-colors"
      >
        📄 Download Coverage Options Card (PDF)
      </button>
      <button
        onClick={() => toast.success("PDF download will be available when AI backend is connected")}
        className="w-full bg-secondary text-secondary-foreground rounded-xl py-2.5 text-xs font-bold hover:bg-secondary/90 transition-colors"
      >
        📄 Download Re-enrollment Checklist (PDF)
      </button>
    </div>

    <div className="border-t border-border pt-3">
      <p className="text-[10px] text-muted-foreground font-medium">
        — Meanwhile, here are 3 jobs in Montgomery that include health insurance from Day 1 —
      </p>
    </div>
  </div>
);

export default MedicaidCard;
