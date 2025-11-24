import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Tag as TagIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Memory {
  id: string;
  title: string;
  text: string;
  memory_date: string;
  memory_location?: string;
  tags?: string[];
  created_at: string;
  [key: string]: any;
}

interface TimelineChapterProps {
  startYear: number;
  endYear: number;
  memories: Memory[];
  memoryArtifacts: Map<string, any>;
  onMemoryClick: (memory: Memory) => void;
  isActive?: boolean;
}

export const TimelineChapter: React.FC<TimelineChapterProps> = ({
  startYear,
  endYear,
  memories,
  memoryArtifacts,
  onMemoryClick,
  isActive = false,
}) => {
  // Get hero image from first memory with artifacts
  const heroMemory = memories.find(m => memoryArtifacts.get(m.id)?.length > 0);
  const heroArtifact = heroMemory ? memoryArtifacts.get(heroMemory.id)?.[0] : null;

  return (
    <section 
      id={`chapter-${startYear}-${endYear}`}
      className={cn(
        "min-h-screen py-16 px-6 sm:px-12 lg:px-24 transition-opacity duration-500",
        isActive ? "opacity-100" : "opacity-60"
      )}
    >
      {/* Chapter Header */}
      <div className="max-w-7xl mx-auto mb-16">
        <div className="flex items-baseline gap-6 mb-8">
          <h2 className="font-manrope font-light text-5xl sm:text-6xl lg:text-7xl text-foreground tracking-tight">
            {startYear}–{endYear}
          </h2>
          <Badge variant="outline" className="text-sm font-manrope font-light px-4 py-1">
            {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
          </Badge>
        </div>

        {/* Hero Image */}
        {heroArtifact && (
          <div className="relative w-full aspect-[21/9] rounded-lg overflow-hidden shadow-2xl mb-12">
            <img
              src={heroArtifact.signedUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>
        )}
      </div>

      {/* Memories Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {memories.map((memory, index) => {
            const artifacts = memoryArtifacts.get(memory.id) || [];
            const hasImage = artifacts.length > 0;

            return (
              <div
                key={memory.id}
                className={cn(
                  "group cursor-pointer transition-all duration-500 hover:translate-y-[-4px]",
                  index % 2 === 0 ? "lg:pr-8" : "lg:pl-8"
                )}
                onClick={() => onMemoryClick(memory)}
              >
                {/* Memory Card */}
                <Card className="border-2 border-border shadow-md hover:shadow-xl transition-all duration-500 overflow-hidden bg-card/50 backdrop-blur-sm">
                  {/* Image */}
                  {hasImage && (
                    <div className="relative w-full aspect-[16/9] overflow-hidden">
                      <img
                        src={artifacts[0].signedUrl}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-8">
                    {/* Date */}
                    <div className="flex items-center gap-2 text-xs font-manrope font-medium text-muted-foreground mb-4 tracking-wide uppercase">
                      <Calendar className="w-3 h-3" />
                      {new Date(memory.memory_date || memory.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>

                    {/* Title */}
                    <h3 className="font-manrope font-semibold text-xl sm:text-2xl text-foreground mb-4 leading-tight group-hover:text-primary transition-colors duration-300">
                      {memory.title}
                    </h3>

                    {/* Description */}
                    <p className="font-manrope font-light text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                      {memory.text}
                    </p>

                    {/* Location & Tags */}
                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
                      {memory.memory_location && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span className="font-manrope">{memory.memory_location}</span>
                        </div>
                      )}
                      
                      {memory.tags && memory.tags.length > 0 && (
                        <div className="flex items-center gap-2 ml-auto">
                          {memory.tags.slice(0, 3).map((tag, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs font-manrope font-light px-2 py-0.5 bg-primary/10 text-primary border border-primary/40"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
