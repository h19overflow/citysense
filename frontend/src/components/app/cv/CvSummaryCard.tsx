import { Sparkles } from "lucide-react";

interface CvSummaryCardProps {
  summary: string;
}

const CvSummaryCard = ({ summary }: CvSummaryCardProps) => (
  <div className="rounded-xl border border-border/50 bg-white px-5 py-4">
    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
      <Sparkles className="w-4 h-4 text-primary" />
      AI Career Summary
    </h3>
    <div className="bg-amber-gold/5 border-l-2 border-amber-gold pl-3 pr-2 py-2 rounded-r-md">
      <p className="text-sm text-foreground/80 italic leading-relaxed">{summary}</p>
    </div>
  </div>
);

export default CvSummaryCard;
