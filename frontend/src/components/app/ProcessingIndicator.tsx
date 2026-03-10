import yellowhammer from "@/assets/yellowhammer.png";
import { useApp } from "@/lib/appContext";

const ProcessingIndicator = () => {
  const { state } = useApp();

  if (!state.isTyping) return null;

  return (
    <div className="flex gap-2 px-4 py-1.5">
      <img src={yellowhammer} alt="AI" className="w-7 h-7 rounded-full object-cover shrink-0 mt-1" />
      <div className="bg-card rounded-2xl rounded-tl-md px-4 py-3 border border-secondary/10 shadow-sm flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
};

export default ProcessingIndicator;
