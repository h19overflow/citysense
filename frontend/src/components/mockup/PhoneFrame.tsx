import React from "react";

interface PhoneFrameProps {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
  scale?: number;
}

const PhoneFrame = ({ children, className = "", rotate = 0, scale = 1 }: PhoneFrameProps) => (
  <div
    className={`relative ${className}`}
    style={{
      transform: `rotate(${rotate}deg) scale(${scale})`,
      width: 390,
      height: 844,
    }}
  >
    <div className="phone-frame w-full h-full bg-[#1b1b1b] overflow-hidden relative">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[34px] bg-[#1b1b1b] rounded-b-2xl z-50" />
      {/* Screen content */}
      <div className="w-full h-full overflow-y-auto">
        {children}
      </div>
    </div>
  </div>
);

export default PhoneFrame;
