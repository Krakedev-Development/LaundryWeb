import React from 'react';

interface LogoProps {
  variant?: 'full' | 'icon' | 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ variant = 'full', size = 'md', className = '' }) => {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 44 : 32;

  // Authentic brand washing machine drum with leaf icon based on the user's uploaded image
  const IconSvg = (
    <svg
      width={iconSize}
      height={iconSize * 1.15}
      viewBox="0 0 100 115"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Outer frame */}
      <path
        d="M25 35 V90 H75 V28 H55"
        stroke="#143F73"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Power button dot */}
      <circle cx="65" cy="36" r="3.5" fill="#6B7280" />
      {/* Washing machine drum outer circles */}
      <circle cx="50" cy="62" r="23" stroke="#143F73" strokeWidth="6" />
      <circle cx="50" cy="62" r="16" stroke="#61BFC7" strokeWidth="2.5" strokeDasharray="80 15" />
      {/* Bubbles in center */}
      <circle cx="48" cy="58" r="3" fill="#61BFC7" />
      <circle cx="53" cy="63" r="2" fill="#61BFC7" />
      <circle cx="50" cy="68" r="2.5" stroke="#61BFC7" strokeWidth="1.5" />
      <circle cx="45" cy="64" r="1.5" fill="#61BFC7" />
      {/* Leaf on top left */}
      <path
        d="M28 35 C28 20, 48 20, 50 25 C50 38, 30 38, 28 35 Z"
        fill="#A5CD39"
        stroke="#0F315A"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M36 31 Q43 27 48 25" stroke="#0F315A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{IconSvg}</div>;
  }

  const isDark = variant === 'dark';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {IconSvg}
      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-black tracking-wider text-[#A5CD39]">CFL</span>
          <span
            className={`font-black tracking-tight text-base font-sans ${
              isDark ? 'text-white' : 'text-[#0F315A]'
            }`}
          >
            LAUNDRY
          </span>
        </div>
        <div className="flex items-center gap-0.5 mt-0.5">
          <span
            className={`font-extrabold tracking-tight text-xs font-sans ${
              isDark ? 'text-slate-200' : 'text-[#143F73]'
            }`}
          >
            CLEAN
          </span>
          {/* Fresh Leaf inline */}
          <span className="text-[#A5CD39] font-black text-xs">🍃</span>
          <span className="font-extrabold tracking-tight text-xs font-sans text-[#A5CD39]">
            FRESH
          </span>
        </div>
      </div>
    </div>
  );
};
