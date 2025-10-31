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
    <div className="relative w-full h-[200px] my-8">
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
                'absolute w-[280px] p-4 bg-card rounded-lg border border-border transition-all duration-500 ease-out',
                isActive
                  ? 'cursor-pointer hover:border-primary hover:shadow-lg'
                  : 'cursor-default'
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
              {isActive && (
                <div className="mt-2 text-xs text-primary">
                  Click to view details
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-12 flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevious}
          className="rounded-full"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex gap-1.5">
          {memories.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                index === activeIndex
                  ? 'bg-primary w-6'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
              aria-label={`Go to memory ${index + 1}`}
            />
          ))}
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          className="rounded-full"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Counter */}
      <div className="absolute top-0 right-0 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-md">
        {activeIndex + 1} / {memories.length}
      </div>
    </div>
  );
}
