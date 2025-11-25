/**
 * SOLIN LOGO COMPONENT
 * 
 * A sci-fi inspired infinity symbol with a halo ring.
 * Represents eternal memory preservation with a futuristic aesthetic.
 */

import { cn } from '@/lib/utils';

interface SolinLogoProps {
  className?: string;
  size?: number;
}

const SolinLogo = ({ className, size = 32 }: SolinLogoProps) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size}
      className={cn("transition-transform", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Halo Ring - Sci-fi glow effect */}
      <ellipse 
        cx="50" 
        cy="50" 
        rx="46" 
        ry="46" 
        stroke="url(#haloGradient)" 
        strokeWidth="1.5"
        opacity="0.6"
      />
      
      {/* Secondary Halo - Creates depth */}
      <ellipse 
        cx="50" 
        cy="50" 
        rx="42" 
        ry="42" 
        stroke="url(#haloGradient2)" 
        strokeWidth="0.75"
        opacity="0.3"
        strokeDasharray="4 6"
      />
      
      {/* Inner tech ring - Futuristic accent */}
      <ellipse 
        cx="50" 
        cy="50" 
        rx="38" 
        ry="38" 
        stroke="currentColor" 
        strokeWidth="0.5"
        opacity="0.15"
      />
      
      {/* Infinity Symbol - Main element */}
      <path 
        d="M50 50
           C50 38 62 28 74 28
           C86 28 94 38 94 50
           C94 62 86 72 74 72
           C62 72 50 62 50 50
           C50 62 38 72 26 72
           C14 72 6 62 6 50
           C6 38 14 28 26 28
           C38 28 50 38 50 50Z"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Infinity highlight - Adds dimension */}
      <path 
        d="M50 50
           C50 40 60 32 70 32
           C80 32 88 40 88 50"
        stroke="url(#infinityHighlight)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
        fill="none"
      />
      
      {/* Small accent dots - Tech details */}
      <circle cx="50" cy="15" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="50" cy="85" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="15" cy="50" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="85" cy="50" r="1.5" fill="currentColor" opacity="0.4" />
      
      {/* Gradient Definitions */}
      <defs>
        <linearGradient id="haloGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.8" />
        </linearGradient>
        
        <linearGradient id="haloGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
        </linearGradient>
        
        <linearGradient id="infinityHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.8" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default SolinLogo;
