import TopBar from "../TopBar";
import AiBubble from "../AiBubble";
import UserBubble from "../UserBubble";
import ChipButton from "../ChipButton";
import ChatInput from "../ChatInput";

const tableData = [
  { label: "Take-home pay", now: "$890/mo", after: "$2,340/mo", change: "+$1,450", positive: true },
  { label: "SNAP benefit", now: "$430/mo", after: "$0", change: "-$430", positive: false },
  { label: "Medicaid", now: "Free", after: "No change", change: "$0", positive: true },
  { label: "Childcare (DHR)", now: "$600 covered", after: "$120 covered", change: "-$480", positive: false },
  { label: "LIHEAP utility", now: "Eligible", after: "May lose", change: "-$50", positive: false },
  { label: "TOTAL MONTHLY", now: "$1,920", after: "$2,010", change: "+$10/mo", positive: true, isTotal: true },
];

const BenefitsCliffScreen = () => (
  <div className="w-full h-full bg-background flex flex-col">
    <TopBar showProfile />
    <div className="flex-1 overflow-y-auto pb-2">
      <UserBubble>
        I got offered $15/hr at Amazon. I'm currently on SNAP and Medicaid. Should I take it?
      </UserBubble>

      <AiBubble>
        <p className="text-sm text-foreground mb-3">
          I ran the full picture for you. Here's what this job actually means for your household:
        </p>

        {/* Data table */}
        <div className="rounded-xl overflow-hidden border border-border mb-3">
          <div className="grid grid-cols-4 bg-primary text-primary-foreground text-[10px] font-bold">
            <div className="p-2"></div>
            <div className="p-2 text-right">Right Now</div>
            <div className="p-2 text-right">With Job</div>
            <div className="p-2 text-right">Change</div>
          </div>
          {tableData.map((row) => (
            <div
              key={row.label}
              className={`grid grid-cols-4 text-[10px] border-t border-border ${
                row.isTotal ? "bg-muted font-bold" : ""
              }`}
            >
              <div className="p-2 text-foreground font-medium">{row.label}</div>
              <div className="p-2 text-right font-tabular text-foreground">{row.now}</div>
              <div className="p-2 text-right font-tabular text-foreground">{row.after}</div>
              <div
                className={`p-2 text-right font-tabular font-bold ${
                  row.isTotal ? "text-amber-gold" : row.positive ? "text-pine-green" : "text-alert-red"
                }`}
              >
                {row.change}
              </div>
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div className="bg-accent text-accent-foreground rounded-xl p-3 mb-3">
          <p className="text-xs font-medium">
            ⚠️ You gain $10/month right away. But in 12 months, as wages rise and benefits phase, you gain +$480/month. This job is worth taking — with a plan.
          </p>
        </div>

        {/* Download button */}
        <button className="w-full bg-secondary text-secondary-foreground rounded-xl py-3 text-xs font-bold mb-2">
          📄 Download Benefits Cliff Analysis (PDF)
        </button>
      </AiBubble>

      <div className="flex flex-wrap gap-2 px-4 pt-1 pb-2 ml-9">
        <ChipButton label="What bridge programs help?" />
        <ChipButton label="How do I negotiate $18/hr?" />
        <ChipButton label="Walk me through applying" />
      </div>
    </div>
    <ChatInput />
  </div>
);

export default BenefitsCliffScreen;
