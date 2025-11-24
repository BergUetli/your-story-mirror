import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Chapter {
  startYear: number;
  endYear: number;
  memoryCount: number;
}

interface TimelineNavigationProps {
  chapters: Chapter[];
  activeChapter: number;
  onChapterClick: (index: number) => void;
}

export const TimelineNavigation: React.FC<TimelineNavigationProps> = ({
  chapters,
  activeChapter,
  onChapterClick,
}) => {
  return (
    <nav className="fixed left-0 top-24 bottom-0 w-64 bg-gradient-to-b from-card/80 to-background/80 backdrop-blur-md border-r-2 border-border p-8 overflow-y-auto z-40 hidden lg:block">
      <div className="space-y-2">
        <h3 className="font-manrope font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-6">
          Life Chapters
        </h3>

        {chapters.map((chapter, index) => (
          <button
            key={index}
            onClick={() => onChapterClick(index)}
            className={cn(
              "w-full text-left px-4 py-3 rounded-lg transition-all duration-300 group",
              activeChapter === index
                ? "bg-primary/10 border-l-4 border-primary"
                : "hover:bg-muted/50 border-l-4 border-transparent"
            )}
          >
            <div className="flex items-baseline justify-between mb-1">
              <span
                className={cn(
                  "font-manrope font-semibold text-lg transition-colors",
                  activeChapter === index
                    ? "text-primary"
                    : "text-foreground group-hover:text-primary"
                )}
              >
                {chapter.startYear}–{chapter.endYear}
              </span>
            </div>
            <span className="font-manrope text-xs text-muted-foreground">
              {chapter.memoryCount} {chapter.memoryCount === 1 ? 'memory' : 'memories'}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};
