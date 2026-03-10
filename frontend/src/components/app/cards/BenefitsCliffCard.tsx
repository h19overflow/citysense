import { toast } from "sonner";

const tableData = [
  { label: "Take-home pay", now: "$890/mo", after: "$2,340/mo", change: "+$1,450", positive: true },
  { label: "SNAP benefit", now: "$430/mo", after: "$0", change: "-$430", positive: false },
  { label: "Medicaid", now: "Free", after: "No change", change: "$0", positive: true },
  { label: "Childcare (DHR)", now: "$600 covered", after: "$120 covered", change: "-$480", positive: false },
  { label: "LIHEAP utility", now: "Eligible", after: "May lose", change: "-$50", positive: false },
  { label: "TOTAL MONTHLY", now: "$1,920", after: "$2,010", change: "+$10/mo", positive: true, isTotal: true },
];

const BenefitsCliffCard = () => (
  <div className="space-y-3">
    {/* Data table */}
    <div className="rounded-xl overflow-hidden border border-border">
      <div className="grid grid-cols-4 bg-primary text-primary-foreground text-[10px] font-bold">
        <div className="p-2" />
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
    <div className="bg-accent/15 border border-accent/30 rounded-xl p-3">
      <p className="text-xs font-medium text-foreground">
        ⚠️ You gain $10/month right away. But in 12 months, as wages rise and benefits phase, you gain +$480/month. This job is worth taking — with a plan.
      </p>
    </div>

    {/* Download */}
    <button
      onClick={() => toast.success("PDF download will be available when AI backend is connected")}
      className="w-full bg-secondary text-secondary-foreground rounded-xl py-3 text-xs font-bold hover:bg-secondary/90 transition-colors"
    >
      📄 Download Benefits Cliff Analysis (PDF)
    </button>
  </div>
);

export default BenefitsCliffCard;
