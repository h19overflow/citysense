import TopBar from "../TopBar";
import AiBubble from "../AiBubble";
import ChatInput from "../ChatInput";

const JobCardScreen = () => (
  <div className="w-full h-full bg-background flex flex-col">
    <TopBar showProfile />
    <div className="flex-1 overflow-y-auto pb-2">
      <AiBubble>
        <p className="text-sm text-foreground mb-3">
          Here's a match for you based on your skills and situation:
        </p>

        {/* Job Card */}
        <div className="bg-card rounded-2xl shadow-md overflow-hidden border border-border">
          <div className="p-4">
            {/* Header */}
            <div className="flex gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <span className="text-lg">📦</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-primary">Fulfillment Supervisor</h3>
                <p className="text-caption text-muted-foreground">Amazon — Montgomery, AL</p>
              </div>
            </div>

            {/* Wage + badges */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl font-bold text-secondary">$15.00/hr</span>
              <span className="px-2 py-0.5 bg-pine-green/10 text-pine-green text-[10px] font-bold rounded-full">Health Ins. ✓</span>
              <span className="px-2 py-0.5 bg-amber-gold/10 text-amber-gold text-[10px] font-bold rounded-full">Flexible Hours</span>
            </div>

            <div className="border-t border-border pt-3 mb-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-bold">Net Income Impact</p>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-muted-foreground font-tabular">Now: $1,920/mo</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-amber-gold font-bold font-tabular">Mo 1: $1,930</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-pine-green font-bold font-tabular">Mo 12: $2,400</span>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-center gap-1.5 mb-4">
              <span className="text-amber-gold text-sm">⚠</span>
              <span className="text-[10px] text-amber-gold font-medium">Benefits cliff at hire — plan attached.</span>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-xs font-bold">
                Apply Now →
              </button>
              <button className="flex-1 border-2 border-primary text-primary rounded-xl py-2.5 text-xs font-bold">
                See Full Cliff Analysis
              </button>
            </div>
          </div>
        </div>
      </AiBubble>
    </div>
    <ChatInput />
  </div>
);

export default JobCardScreen;
