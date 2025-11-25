/**
 * SOLIN LOGO COMPONENT
 * 
 * Hypercube-style abstract logo representing multidimensional memory preservation.
 */

import { cn } from '@/lib/utils';

interface SolinLogoProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

const SolinLogo = ({ className, size = 32, style }: SolinLogoProps) => {
  return (
    <img 
      src="https://cdn3.iconfinder.com/data/icons/abstraction/32/abstract-10-512.png"
      alt="Solin Logo"
      width={size} 
      height={size}
      className={cn("transition-transform", className)}
      style={style}
    />
  );
};

export default SolinLogo;
