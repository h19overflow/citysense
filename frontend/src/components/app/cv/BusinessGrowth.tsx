import { useState, useEffect } from "react";
import { Building2, HardHat, Briefcase, TrendingUp } from "lucide-react";
import {
  fetchBusinessGrowthData,
  computeCommercialPercent,
  computeTopPermitType,
  extractTopCategories,
  type BusinessGrowthData,
} from "@/lib/businessGrowthService";

// ── Sub-components ──────────────────────────────────────────

interface MetricCardProps {
  icon: React.ReactNode;
  iconBackground: string;
  label: string;
  value: string;
  detail: string;
}

function MetricCard({ icon, iconBackground, label, value, detail }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-white p-3 flex items-start gap-3">
      <div className={`mt-0.5 rounded-lg p-1.5 shrink-0 ${iconBackground}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground truncate">{detail}</p>
      </div>
    </div>
  );
}

interface HorizontalBarRowProps {
  name: string;
  count: number;
  maxCount: number;
  barColor: string;
}

function HorizontalBarRow({ name, count, maxCount, barColor }: HorizontalBarRowProps) {
  const widthPercent = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  return (
    <div className="flex items-center gap-2 w-full py-0.5">
      <span className="text-xs w-28 shrink-0 truncate text-muted-foreground font-medium">{name}</span>
      <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${widthPercent}%` }} />
      </div>
      <span className="text-xs font-medium text-foreground w-8 text-right shrink-0">{count}</span>
    </div>
  );
}

// ── Loading skeleton ────────────────────────────────────────

function BusinessGrowthSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-48 bg-muted/60 rounded" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 rounded-xl bg-muted/40" />
        ))}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────

export default function BusinessGrowth() {
  const [data, setData] = useState<BusinessGrowthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchBusinessGrowthData().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  if (loading) return <BusinessGrowthSkeleton />;
  if (!data) return null;

  const topCategories = extractTopCategories(data);
  const maxMonthCount = data.permitsByMonth[0]?.count ?? 1;
  const maxCategoryCount = topCategories[0]?.count ?? 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Building2 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Business Growth Signals</h3>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={<HardHat className="w-3.5 h-3.5 text-teal-700" />}
          iconBackground="bg-teal-50"
          label="New Permits (30d)"
          value={String(data.newPermits30d)}
          detail="This month's construction permits"
        />
        <MetricCard
          icon={<Building2 className="w-3.5 h-3.5 text-violet-700" />}
          iconBackground="bg-violet-50"
          label="Commercial Share"
          value={computeCommercialPercent(data)}
          detail="Of all recent permits"
        />
        <MetricCard
          icon={<Briefcase className="w-3.5 h-3.5 text-emerald-700" />}
          iconBackground="bg-emerald-50"
          label="New Businesses (90d)"
          value={String(data.newBusinesses90d)}
          detail="Business licenses filed"
        />
        <MetricCard
          icon={<TrendingUp className="w-3.5 h-3.5 text-amber-700" />}
          iconBackground="bg-amber-50"
          label="Top Permit Type"
          value={computeTopPermitType(data)}
          detail="Most common permit type"
        />
      </div>

      {/* Bar charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/50 bg-white p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">Permits by Month</p>
          <div className="space-y-0.5">
            {data.permitsByMonth.map(({ month, count }) => (
              <HorizontalBarRow
                key={month}
                name={month}
                count={count}
                maxCount={maxMonthCount}
                barColor="bg-teal-500"
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-white p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">Business Categories</p>
          <div className="space-y-0.5">
            {topCategories.map(({ type, count }) => (
              <HorizontalBarRow
                key={type}
                name={type}
                count={count}
                maxCount={maxCategoryCount}
                barColor="bg-violet-500"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
