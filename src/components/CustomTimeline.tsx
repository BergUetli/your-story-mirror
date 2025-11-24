import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TimelineMemoryCard } from './TimelineMemoryCard';
import { cn } from '@/lib/utils';

interface Memory {
  id: string;
  title: string;
  text: string;
  memory_date: string;
  created_at: string;
  [key: string]: any;
}

interface CustomTimelineProps {
  memories: Memory[];
  birthDate: string | null;
  memoryArtifacts: Map<string, any>;
  onMemoryClick: (memory: Memory) => void;
}

export const CustomTimeline: React.FC<CustomTimelineProps> = ({
  memories,
  birthDate,
  memoryArtifacts,
  onMemoryClick,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  
  // Calculate birth year
  const birthYear = useMemo(() => {
    if (!birthDate) return currentYear - 30; // Default fallback
    const birth = new Date(birthDate);
    return birth.getFullYear();
  }, [birthDate, currentYear]);

  // Timeline range: 100 years past to 100 years future
  const minYear = currentYear - 100;
  const maxYear = currentYear + 100;
  
  // View window state (years currently visible on screen)
  const [viewStartYear, setViewStartYear] = useState(birthYear);
  const [viewEndYear, setViewEndYear] = useState(currentYear);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  // Group memories by year
  const memoriesByYear = useMemo(() => {
    const grouped = new Map<number, Memory[]>();
    memories.forEach(memory => {
      const date = new Date(memory.memory_date || memory.created_at);
      const year = date.getFullYear();
      
      // Filter by memory mode
      const now = new Date();
      const memoryDate = new Date(memory.memory_date);
      
      // Past memories: memory_date is before today
      // Future memories: memory_date is after today (future_date field)
      // Daily journal: becomes memory after the day passes
      
      if (!grouped.has(year)) {
        grouped.set(year, []);
      }
      grouped.get(year)!.push(memory);
    });
    return grouped;
  }, [memories]);

  // Get years to display based on view window
  const displayYears = useMemo(() => {
    const years: number[] = [];
    for (let year = viewStartYear; year <= viewEndYear; year++) {
      years.push(year);
    }
    return years;
  }, [viewStartYear, viewEndYear]);

  // Navigation functions
  const jumpToPast = () => {
    const newStart = Math.max(minYear, viewStartYear - 20);
    const newEnd = Math.max(minYear + 1, viewEndYear - 20);
    setViewStartYear(newStart);
    setViewEndYear(newEnd);
  };

  const jumpToFuture = () => {
    const newStart = Math.min(maxYear - 1, viewStartYear + 20);
    const newEnd = Math.min(maxYear, viewEndYear + 20);
    setViewStartYear(newStart);
    setViewEndYear(newEnd);
  };

  const jumpToPresent = () => {
    setViewStartYear(birthYear);
    setViewEndYear(currentYear);
  };

  const jumpToYear = (year: number) => {
    const span = viewEndYear - viewStartYear;
    const newStart = Math.max(minYear, year - Math.floor(span / 2));
    const newEnd = Math.min(maxYear, newStart + span);
    setViewStartYear(newStart);
    setViewEndYear(newEnd);
    
    // Scroll to year
    setTimeout(() => {
      const yearElement = document.getElementById(`year-${year}`);
      if (yearElement) {
        yearElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Scroll handler for expanding view window
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = element;
    
    // Load more years when scrolling near edges
    if (scrollTop < 100 && viewStartYear > minYear) {
      setViewStartYear(prev => Math.max(minYear, prev - 10));
    }
    
    if (scrollHeight - scrollTop - clientHeight < 100 && viewEndYear < maxYear) {
      setViewEndYear(prev => Math.min(maxYear, prev + 10));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Navigation Controls */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <Button
          variant="outline"
          size="sm"
          onClick={jumpToPast}
          disabled={viewStartYear <= minYear}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          100 Years Past
        </Button>
        
        <Button
          variant="default"
          size="sm"
          onClick={jumpToPresent}
        >
          My Lifetime
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={jumpToFuture}
          disabled={viewEndYear >= maxYear}
        >
          100 Years Future
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Timeline Display */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        onScroll={handleScroll}
      >
        <div className="relative py-8 px-8 max-w-5xl mx-auto">
          {/* Timeline Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2" />

          {/* Year Markers and Memories */}
          {displayYears.map((year) => {
            const yearMemories = memoriesByYear.get(year) || [];
            const isBirthYear = year === birthYear;
            const isCurrentYear = year === currentYear;
            const isHovered = hoveredYear === year;

            return (
              <div
                key={year}
                id={`year-${year}`}
                className="relative mb-12"
                onMouseEnter={() => setHoveredYear(year)}
                onMouseLeave={() => setHoveredYear(null)}
              >
                {/* Year Label */}
                <div className="absolute left-1/2 -translate-x-1/2 z-10">
                  <div
                    className={cn(
                      "px-4 py-2 rounded-full font-semibold text-sm transition-all",
                      isBirthYear || isCurrentYear
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-card border border-border hover:border-primary",
                      isHovered && "scale-110 shadow-lg"
                    )}
                  >
                    {year}
                    {isBirthYear && " 🎂"}
                    {isCurrentYear && " ⭐"}
                  </div>
                </div>

                {/* Memory Cards */}
                {yearMemories.length > 0 && (
                  <div className="pt-12">
                    <div className="grid grid-cols-2 gap-4">
                      {yearMemories.map((memory, index) => {
                        const artifacts = memoryArtifacts.get(memory.id) || [];
                        const artifact = artifacts.length > 0 ? artifacts[0] : null;
                        
                        return (
                          <div
                            key={memory.id}
                            className={cn(
                              "transition-all duration-300",
                              index % 2 === 0 ? "pr-8" : "pl-8 col-start-2",
                              isHovered ? "opacity-100 scale-100" : index > 2 ? "opacity-50 scale-95" : "opacity-100 scale-100"
                            )}
                          >
                            <TimelineMemoryCard
                              memory={memory}
                              artifact={artifact}
                              onClick={() => onMemoryClick(memory)}
                            />
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Show count when not hovered and there are many memories */}
                    {!isHovered && yearMemories.length > 3 && (
                      <div className="text-center mt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground"
                          onClick={() => setHoveredYear(year)}
                        >
                          +{yearMemories.length - 3} more memories
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Hover Panel for Year Summary */}
                {isHovered && yearMemories.length > 0 && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-4 w-full max-w-md z-20">
                    <Card className="p-4 shadow-xl border-primary">
                      <h3 className="font-semibold mb-2">
                        {yearMemories.length} {yearMemories.length === 1 ? 'Memory' : 'Memories'} in {year}
                      </h3>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {yearMemories.map((memory) => (
                          <button
                            key={memory.id}
                            onClick={() => onMemoryClick(memory)}
                            className="w-full text-left p-2 rounded hover:bg-muted transition-colors"
                          >
                            <div className="font-medium text-sm">{memory.title}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {new Date(memory.memory_date || memory.created_at).toLocaleDateString()}
                            </div>
                          </button>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
