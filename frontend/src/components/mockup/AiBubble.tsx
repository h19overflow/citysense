import yellowhammer from "@/assets/yellowhammer.png";

interface AiBubbleProps {
  children: React.ReactNode;
}

const AiBubble = ({ children }: AiBubbleProps) => (
  <div className="flex gap-2 px-4 py-2">
    <img
      src={yellowhammer}
      alt="AI"
      className="w-7 h-7 rounded-full object-cover shrink-0 mt-1"
    />
    <div className="bg-card rounded-2xl rounded-tl-md p-4 border-l-4 border-secondary max-w-[calc(100%-48px)] shadow-sm">
      {children}
    </div>
  </div>
);

export default AiBubble;
