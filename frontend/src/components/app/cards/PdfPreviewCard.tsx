import citysenseLogo from "@/assets/citysense-logo.png";
import { toast } from "sonner";

const PdfPreviewCard = () => (
  <div className="space-y-3">
    {/* PDF Card */}
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="h-1 bg-primary" />
      <div className="p-3 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xs font-bold text-primary">Your Benefits Summary</h3>
            <p className="text-[9px] text-muted-foreground">Montgomery, AL — March 5, 2026</p>
          </div>
          <img src={citysenseLogo} alt="" className="w-4 h-4 opacity-40" />
        </div>

        <p className="text-[9px] font-bold text-foreground uppercase tracking-wider">
          Programs You Likely Qualify For
        </p>
        <div className="rounded-lg overflow-hidden border border-border">
          <div className="grid grid-cols-4 text-[8px] font-bold bg-muted text-foreground">
            <div className="p-1.5">Program</div>
            <div className="p-1.5">Est. Value</div>
            <div className="p-1.5">Next Step</div>
            <div className="p-1.5">Phone</div>
          </div>
          {[
            ["SNAP", "$430/mo", "Apply at DHR", "(334) 293-5059"],
            ["Medicaid", "Free", "Renew online", "(800) 362-1504"],
            ["LIHEAP", "~$50/mo", "Apply Oct–Mar", "(334) 242-5100"],
          ].map(([prog, val, step, phone]) => (
            <div key={prog} className="grid grid-cols-4 text-[8px] border-t border-border">
              <div className="p-1.5 font-medium text-foreground">{prog}</div>
              <div className="p-1.5 font-tabular text-foreground">{val}</div>
              <div className="p-1.5 text-muted-foreground">{step}</div>
              <div className="p-1.5 font-tabular text-muted-foreground">{phone}</div>
            </div>
          ))}
        </div>

        <div className="bg-accent/15 rounded-lg p-2">
          <p className="text-[9px] text-foreground font-medium">
            Most Urgent This Week: File for SNAP — bring last 30 days of pay stubs — takes 2 weeks to process.
          </p>
        </div>

        <p className="text-[8px] text-muted-foreground italic">
          This is guidance based on publicly available eligibility rules. — <em>Audemus jura nostra defendere</em>
        </p>
      </div>
    </div>

    <div className="flex gap-2">
      <button
        onClick={() => toast.success("PDF download will be available when AI backend is connected")}
        className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-xs font-bold hover:bg-primary/90 transition-colors"
      >
        ⬇ Download PDF
      </button>
      <button
        onClick={() => toast.success("Share feature coming soon")}
        className="flex-1 border-2 border-primary text-primary rounded-xl py-2.5 text-xs font-bold hover:bg-primary/5 transition-colors"
      >
        ↗ Share
      </button>
    </div>
  </div>
);

export default PdfPreviewCard;
