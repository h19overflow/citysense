import TopBar from "../TopBar";
import ChipButton from "../ChipButton";

const chips = [
  "Should I take this job?",
  "I just lost my Medicaid",
  "I work at the plant, want more",
  "Single parent, need more income",
  "I'm new to Montgomery",
  "I just got out — rebuilding",
];

const OnboardingScreen = () => (
  <div className="w-full h-full bg-background flex flex-col">
    <TopBar />
    <div className="flex-1 flex flex-col px-5 pt-8 pb-4 gap-6">
      {/* Big input */}
      <div className="bg-muted rounded-2xl p-5 min-h-[120px]">
        <span className="text-muted-foreground text-base">
          Tell me your situation — I'll figure out the rest.
        </span>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <ChipButton key={chip} label={chip} />
        ))}
      </div>

      {/* Send button */}
      <button className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl text-base">
        Ask CitySense
      </button>

      <p className="text-center text-caption text-muted-foreground">
        No login required. Your conversation is private.
      </p>
    </div>
  </div>
);

export default OnboardingScreen;
