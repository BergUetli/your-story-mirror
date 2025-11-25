/**
 * SOLIN LOGO COMPONENT
 * 
 * Isometric cube logo representing multidimensional memory preservation.
 * Clean, minimalist geometric design in blue.
 */

import { cn } from '@/lib/utils';

interface SolinLogoProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

const SolinLogo = ({ className, size = 32, style }: SolinLogoProps) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size}
      className={cn("transition-transform", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      {/* Isometric Cube Logo */}
      {/* Outer hexagon shape */}
      <path 
        d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Top inner diamond - creates the cube top face */}
      <path 
        d="M50 5 L90 27.5 L50 50 L10 27.5 Z"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Center vertical line - front edge of cube */}
      <path 
        d="M50 50 L50 95"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Inner vertical structure - the "door" or inner cube element */}
      <path 
        d="M50 50 L50 72.5 L35 81.25 L35 58.75 Z"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Right side of inner structure */}
      <path 
        d="M50 50 L50 72.5 L65 81.25 L65 58.75 Z"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

export default SolinLogo;
