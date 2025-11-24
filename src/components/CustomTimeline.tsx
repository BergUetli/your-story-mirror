import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, X, Calendar, MapPin, Tag } from 'lucide-react';
import { TimelineMemoryCard } from './TimelineMemoryCard';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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

  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  const handleMemoryClick = (memory: Memory) => {
    setSelectedMemory(memory);
    onMemoryClick(memory);
  };

  return (
    <div className="flex h-full">
      {/* Left: Timeline */}
      <div className="flex-1 flex flex-col border-r border-border">
        {/* Navigation Controls */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-background via-card to-background backdrop-blur-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={jumpToPast}
            disabled={viewStartYear <= minYear}
            className="hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Past
          </Button>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/30 shadow-sm px-3 py-1">
              🎂 Birth
            </Badge>
            <Badge variant="outline" className="bg-gradient-to-r from-accent/20 to-accent/10 text-accent-foreground border-accent/30 shadow-sm px-3 py-1">
              ⭐ Today
            </Badge>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={jumpToFuture}
            disabled={viewEndYear >= maxYear}
            className="hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 shadow-sm"
          >
            Future
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Timeline Display */}
        <div
          ref={timelineRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
          onScroll={handleScroll}
        >
          <div className="relative py-8 px-4 sm:px-8 max-w-2xl mx-auto">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/40 via-primary/20 to-primary/40 rounded-full shadow-lg shadow-primary/10" />

            {/* Year Markers and Memories */}
            {displayYears.map((year) => {
              const yearMemories = memoriesByYear.get(year) || [];
              const isBirthYear = year === birthYear;
              const isCurrentYear = year === currentYear;
              const hasMemories = yearMemories.length > 0;

              return (
                <div
                  key={year}
                  id={`year-${year}`}
                  className="relative mb-8 ml-16"
                >
                  {/* Year Marker Dot */}
                  <div className="absolute -left-[36px] top-2">
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border-2 transition-all duration-300 hover:scale-125",
                        isBirthYear
                          ? "bg-gradient-to-br from-primary to-primary/80 border-primary shadow-xl shadow-primary/50 animate-pulse"
                          : isCurrentYear
                          ? "bg-gradient-to-br from-accent to-accent/80 border-accent shadow-xl shadow-accent/50 ring-2 ring-accent/20"
                          : hasMemories
                          ? "bg-gradient-to-br from-primary/30 to-primary/10 border-primary/40 shadow-md shadow-primary/20"
                          : "bg-background border-border/60 shadow-sm"
                      )}
                    />
                  </div>

                  {/* Year Label */}
                  <div className="mb-4">
                    <div
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-1.5 rounded-lg font-semibold text-sm transition-all duration-300 hover:scale-105",
                        isBirthYear
                          ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30 shadow-md"
                          : isCurrentYear
                          ? "bg-gradient-to-r from-accent/20 to-accent/10 text-accent-foreground border border-accent/30 shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="text-base">{year}</span>
                      {isBirthYear && <span className="text-xs opacity-80">Born</span>}
                      {isCurrentYear && <span className="text-xs opacity-80">Present</span>}
                    </div>
                  </div>

                  {/* Memory Cards */}
                  {yearMemories.length > 0 && (
                    <div className="space-y-3">
                      {yearMemories.map((memory) => {
                        const artifacts = memoryArtifacts.get(memory.id) || [];
                        const artifact = artifacts.length > 0 ? artifacts[0] : null;
                        
                        return (
                          <div
                            key={memory.id}
                            className="transition-all duration-300 hover:translate-x-1"
                          >
                            <TimelineMemoryCard
                              memory={memory}
                              artifact={artifact}
                              onClick={() => handleMemoryClick(memory)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Memory Detail Panel */}
      <div className="w-[400px] bg-gradient-to-b from-card to-background border-l border-border/50 overflow-y-auto shadow-xl">
        {selectedMemory ? (
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-2xl font-bold pr-8 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {selectedMemory.title}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMemory(null)}
                className="flex-shrink-0 hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-5">
              {/* Date */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="font-medium">
                  {new Date(selectedMemory.memory_date || selectedMemory.created_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              {/* Location */}
              {selectedMemory.memory_location && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span className="font-medium">{selectedMemory.memory_location}</span>
                </div>
              )}

              {/* Tags */}
              {selectedMemory.tags && selectedMemory.tags.length > 0 && (
                <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3 border border-border/50">
                  <Tag className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
                  <div className="flex flex-wrap gap-2">
                    {selectedMemory.tags.map((tag: string, index: number) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors duration-200"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Images */}
              {memoryArtifacts.get(selectedMemory.id)?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary rounded-full"></span>
                    Media
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {memoryArtifacts.get(selectedMemory.id).map((artifact: any, index: number) => (
                      <div key={index} className="group relative overflow-hidden rounded-lg border border-border/50 shadow-md hover:shadow-xl transition-all duration-300">
                        <img
                          src={artifact.signedUrl}
                          alt=""
                          className="w-full h-28 object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="pt-5 border-t border-border/50">
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {selectedMemory.text}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-6 text-center">
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-primary/60" />
              </div>
              <p className="text-muted-foreground font-medium">Select a memory to view details</p>
              <p className="text-xs text-muted-foreground/60">Click on any memory card on the timeline</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
