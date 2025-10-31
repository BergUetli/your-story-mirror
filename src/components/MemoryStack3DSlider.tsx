import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MemoryStack3DSliderProps {
  memories: Array<{
    id: string;
    title: string;
    date: string;
    onClick: () => void;
  }>;
}

export function MemoryStack3DSlider({ memories }: MemoryStack3DSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (memories.length === 0) return null;
  if (memories.length === 1) {
    return (
      <div
        onClick={memories[0].onClick}
        className="cursor-pointer p-4 bg-card rounded-lg border border-border hover:border-primary transition-all"
      >
        <h3 className="font-semibold text-sm mb-1">{memories[0].title}</h3>
        <p className="text-xs text-muted-foreground">{memories[0].date}</p>
      </div>
    );
  }

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + memories.length) % memories.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % memories.length);
  };

  const getCardStyle = (index: number) => {
    const diff = index - activeIndex;
    const position = ((diff % memories.length) + memories.length) % memories.length;
    const normalizedPosition = position > memories.length / 2 ? position - memories.length : position;
    
    // Active card (center)
    if (normalizedPosition === 0) {
      return {
        transform: 'translateX(-50%) translateZ(0px) rotateY(0deg) scale(1)',
        opacity: 1,
        zIndex: 50,
        left: '50%',
      };
    }
    
    // Calculate symmetric positioning
    const isRight = normalizedPosition > 0;
    const absPosition = Math.abs(normalizedPosition);
    
    // Symmetric spacing and rotation
    const xOffset = absPosition * 100; // pixels from center
    const zOffset = absPosition * 80; // depth
    const rotation = absPosition * 25; // degrees
    const scale = Math.max(0.6, 1 - absPosition * 0.15);
    const opacity = Math.max(0.3, 1 - absPosition * 0.25);
    const zIndex = 50 - absPosition * 10;
    
    return {
      transform: `translateX(${isRight ? `calc(-50% + ${xOffset}px)` : `calc(-50% - ${xOffset}px)`}) translateZ(-${zOffset}px) rotateY(${isRight ? -rotation : rotation}deg) scale(${scale})`,
      opacity,
      zIndex,
      left: '50%',
    };
  };

  return (
    <div className="relative w-full h-[180px] my-4">
      {/* 3D Container */}
      <div className="relative w-full h-full" style={{ perspective: '1000px' }}>
        {memories.map((memory, index) => {
          const style = getCardStyle(index);
          const isActive = index === activeIndex;
          
          return (
            <div
              key={memory.id}
              onClick={isActive ? memory.onClick : undefined}
              className={cn(
                'absolute w-[280px] p-4 bg-card rounded-lg border transition-all duration-500 ease-out',
                isActive
                  ? 'cursor-pointer hover:border-primary hover:shadow-lg border-border'
                  : 'cursor-default border-border/50'
              )}
              style={{
                ...style,
                transformStyle: 'preserve-3d',
                pointerEvents: isActive ? 'auto' : 'none',
              }}
            >
              <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                {memory.title}
              </h3>
              <p className="text-xs text-muted-foreground">{memory.date}</p>
            </div>
          );
        })}
      </div>

      {/* Hidden Navigation Controls (keyboard/swipe) */}
      <div className="sr-only">
        <button onClick={handlePrevious} aria-label="Previous memory">Previous</button>
        <button onClick={handleNext} aria-label="Next memory">Next</button>
      </div>
    </div>
  );
}
