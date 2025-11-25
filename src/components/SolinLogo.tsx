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
      {/* Isometric Cube Logo - Outer cube in blue */}
      {/* Outer hexagon shape */}
      <path 
        d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Top face of outer cube */}
      <path 
        d="M50 5 L90 27.5 L50 50 L10 27.5 Z"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Center vertical line - front edge of outer cube */}
      <path 
        d="M50 50 L50 95"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Inner cube in BLACK - proper isometric cube */}
      {/* Inner cube - top face (diamond) */}
      <path 
        d="M50 38 L65 47 L50 56 L35 47 Z"
        stroke="black"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Inner cube - left face */}
      <path 
        d="M35 47 L50 56 L50 74 L35 65 Z"
        stroke="black"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Inner cube - right face */}
      <path 
        d="M65 47 L50 56 L50 74 L65 65 Z"
        stroke="black"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

export default SolinLogo;
