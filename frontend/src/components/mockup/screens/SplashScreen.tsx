import citysenseLogo from "@/assets/citysense-logo.png";
import skyline from "@/assets/montgomery-skyline.png";

const SplashScreen = () => (
  <div className="w-full h-full bg-primary magnolia-bg flex flex-col items-center justify-between relative overflow-hidden">
    {/* Language toggle */}
    <div className="w-full flex justify-end px-4 pt-12">
      <div className="flex rounded-full overflow-hidden border border-primary-foreground/30">
        <button className="px-3 py-1 text-xs font-medium bg-primary-foreground text-primary">EN</button>
        <button className="px-3 py-1 text-xs font-medium text-primary-foreground/70">ES</button>
      </div>
    </div>

    {/* Center content */}
    <div className="flex flex-col items-center gap-6 flex-1 justify-center px-8">
      <img src={citysenseLogo} alt="CitySense" className="w-24 h-24 object-contain" />
      <h1 className="text-primary-foreground text-3xl font-bold tracking-tight">CitySense</h1>
      <p className="text-primary-foreground/80 text-base text-center leading-relaxed">
        Your life. Your benefits. Your career.<br />
        Montgomery, AL.
      </p>
    </div>

    {/* Skyline */}
    <div className="w-full">
      <img src={skyline} alt="Montgomery Skyline" className="w-full h-40 object-cover object-top opacity-40" />
    </div>
  </div>
);

export default SplashScreen;
