interface ChipButtonProps {
  label: string;
  variant?: "outline" | "filled";
}

const ChipButton = ({ label, variant = "outline" }: ChipButtonProps) => (
  <button
    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      variant === "outline"
        ? "border-primary text-primary bg-transparent"
        : "border-primary bg-primary text-primary-foreground"
    }`}
  >
    {label}
  </button>
);

export default ChipButton;
