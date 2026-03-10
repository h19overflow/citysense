const JobCard = () => (
  <div className="bg-card rounded-2xl shadow-md overflow-hidden border border-border">
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <span className="text-lg">📦</span>
        </div>
        <div>
          <h3 className="font-bold text-sm text-primary">Fulfillment Supervisor</h3>
          <p className="text-caption text-muted-foreground">Amazon — Montgomery, AL</p>
        </div>
      </div>

      {/* Wage + badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xl font-bold text-secondary">$15.00/hr</span>
        <span className="px-2 py-0.5 bg-pine-green/10 text-pine-green text-[10px] font-bold rounded-full">
          Health Ins. ✓
        </span>
        <span className="px-2 py-0.5 bg-amber-gold/10 text-amber-gold text-[10px] font-bold rounded-full">
          Flexible Hours
        </span>
      </div>

      {/* Net income impact */}
      <div className="border-t border-border pt-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-bold">
          Net Income Impact
        </p>
        <div className="flex items-center gap-1 text-[11px] flex-wrap">
          <span className="text-muted-foreground font-tabular">Now: $1,920/mo</span>
          <span className="text-muted-foreground">→</span>
          <span className="text-amber-gold font-bold font-tabular">Mo 1: $1,930</span>
          <span className="text-muted-foreground">→</span>
          <span className="text-pine-green font-bold font-tabular">Mo 12: $2,400</span>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-center gap-1.5">
        <span className="text-amber-gold text-sm">⚠</span>
        <span className="text-[10px] text-amber-gold font-medium">
          Benefits cliff at hire — plan attached.
        </span>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-xs font-bold hover:bg-primary/90 transition-colors">
          Apply Now →
        </button>
        <button className="flex-1 border-2 border-primary text-primary rounded-xl py-2.5 text-xs font-bold hover:bg-primary/5 transition-colors">
          See Cliff Analysis
        </button>
      </div>
    </div>
  </div>
);

export default JobCard;
