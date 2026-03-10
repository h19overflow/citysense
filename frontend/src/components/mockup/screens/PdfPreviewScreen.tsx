import TopBar from "../TopBar";
import AiBubble from "../AiBubble";
import ChatInput from "../ChatInput";
import citysenseLogo from "@/assets/citysense-logo.png";

const PdfPreviewScreen = () => (
  <div className="w-full h-full bg-background flex flex-col">
    <TopBar showProfile />
    <div className="flex-1 overflow-y-auto pb-2">
      <AiBubble>
        <p className="text-sm text-foreground mb-3">Here's your printable Benefits Summary:</p>

        {/* PDF Card */}
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="h-1 bg-primary" />
          <div className="p-3">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-primary">Your Benefits Summary</h3>
                <p className="text-[9px] text-muted-foreground">Montgomery, AL — March 5, 2026</p>
              </div>
              <img src={citysenseLogo} alt="" className="w-4 h-4 opacity-40" />
            </div>

            {/* Table */}
            <p className="text-[9px] font-bold text-foreground uppercase tracking-wider mb-1">Programs You Likely Qualify For</p>
            <div className="rounded-lg overflow-hidden border border-border mb-3">
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

            {/* Urgent */}
            <div className="bg-accent/20 rounded-lg p-2 mb-3">
              <p className="text-[9px] text-foreground font-medium">
                Most Urgent This Week: File for SNAP — bring last 30 days of pay stubs — takes 2 weeks to process.
              </p>
            </div>

            {/* Footer */}
            <p className="text-[8px] text-muted-foreground italic">
              This is guidance based on publicly available eligibility rules. A caseworker will make the final determination. — <em>Audemus jura nostra defendere</em>
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 mt-3">
          <button className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-xs font-bold">
            ⬇ Download PDF
          </button>
          <button className="flex-1 border-2 border-primary text-primary rounded-xl py-2.5 text-xs font-bold">
            ↗ Share
          </button>
        </div>
      </AiBubble>
    </div>
    <ChatInput />
  </div>
);

export default PdfPreviewScreen;
