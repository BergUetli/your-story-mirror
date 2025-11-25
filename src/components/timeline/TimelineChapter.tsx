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
  isPast?: boolean;
  isFuture?: boolean;
}

export const TimelineChapter: React.FC<TimelineChapterProps> = ({
  startYear,
  endYear,
  memories,
  memoryArtifacts,
  onMemoryClick,
  isActive = false,
  isPast = false,
  isFuture = false,
}) => {
  // Get hero image from first memory with artifacts OR image_urls
  const heroMemory = memories.find(m => 
    memoryArtifacts.get(m.id)?.length > 0 || (m.image_urls && m.image_urls.length > 0)
  );
  const heroArtifact = heroMemory ? memoryArtifacts.get(heroMemory.id)?.[0] : null;
  // Fallback to memory.image_urls if no artifact
  const heroImageUrl = heroArtifact?.signedUrl || (heroMemory?.image_urls?.[0] ? heroMemory.image_urls[0] : null);

  // Special rendering for Past and Future chapters (with memories if any)
  if (isPast || isFuture) {
    const hasMemories = memories.length > 0;
    
    return (
      <section 
        id={`chapter-${startYear}-${endYear}`}
        className={cn(
          "min-h-screen py-16 px-6 sm:px-12 lg:px-24 transition-opacity duration-500",
          isActive ? "opacity-100" : "opacity-60"
        )}
      >
        <div className="max-w-7xl mx-auto">
          {/* Chapter Header */}
          <div className="flex items-baseline gap-6 mb-8">
            <h2 className="font-manrope font-light text-5xl sm:text-6xl lg:text-7xl text-foreground tracking-tight">
              {isPast ? '🕰️ Ancestors' : '🔮 Future'}
            </h2>
            <Badge variant="outline" className="text-sm font-manrope font-light px-4 py-1">
              {hasMemories ? `${memories.length} ${memories.length === 1 ? 'memory' : 'memories'}` : `${startYear}–${endYear}`}
            </Badge>
          </div>
          
          {/* Description */}
          <p className="font-manrope text-lg text-muted-foreground max-w-2xl mb-12">
            {isPast 
              ? hasMemories 
                ? 'Ancestral memories and family heritage from before your time.'
                : 'Ancestral history and family heritage will appear here. Share memories about your ancestors, grandparents, or family history.'
              : hasMemories
                ? 'Time-locked messages and future memories waiting to be unlocked.'
                : 'Messages and memories for the future will appear here. Create time capsules for your future self or loved ones.'}
          </p>
          
          {/* Hero Image for Past/Future chapters */}
          {heroImageUrl && (
            <div className="relative w-full aspect-[21/9] rounded-lg overflow-hidden shadow-2xl mb-12">
              <img
                src={heroImageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
          )}
          
          {/* Memories Grid for Past/Future */}
          {hasMemories && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
              {memories.map((memory, index) => {
                const artifacts = memoryArtifacts.get(memory.id) || [];
                const hasArtifactImage = artifacts.length > 0;
                const hasMemoryImage = memory.image_urls && memory.image_urls.length > 0;
                const hasImage = hasArtifactImage || hasMemoryImage;
                const imageUrl = hasArtifactImage ? artifacts[0].signedUrl : (hasMemoryImage ? memory.image_urls[0] : null);

                return (
                  <div
                    key={memory.id}
                    className={cn(
                      "group cursor-pointer transition-all duration-500 hover:translate-y-[-4px]",
                      index % 2 === 0 ? "lg:pr-8" : "lg:pl-8"
                    )}
                    onClick={() => onMemoryClick(memory)}
                  >
                    <Card className={cn(
                      "border-2 shadow-md hover:shadow-xl transition-all duration-500 overflow-hidden bg-card/50 backdrop-blur-sm",
                      isPast ? "border-amber-200/50 hover:border-amber-400/60" : "border-blue-200/50 hover:border-blue-400/60"
                    )}>
                      {hasImage && imageUrl && (
                        <div className="relative w-full aspect-[16/9] overflow-hidden">
                          <img
                            src={imageUrl}
                            alt=""
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          {/* Mode indicator overlay */}
                          <div className={cn(
                            "absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium",
                            isPast ? "bg-amber-500/80 text-white" : "bg-blue-500/80 text-white"
                          )}>
                            {isPast ? '🕰️ Ancestor Memory' : '🔮 Future Message'}
                          </div>
                        </div>
                      )}
                      <div className="p-8">
                        <div className="flex items-center gap-2 text-xs font-manrope font-medium text-muted-foreground mb-4 tracking-wide uppercase">
                          <Calendar className="w-3 h-3" />
                          {new Date(memory.memory_date || memory.created_at).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <h3 className={cn(
                            "font-manrope font-semibold text-xl sm:text-2xl leading-tight transition-colors duration-300 flex-1",
                            isPast ? "text-foreground group-hover:text-amber-600" : "text-foreground group-hover:text-blue-600"
                          )}>
                            {memory.title}
                          </h3>
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs font-manrope font-medium px-2 py-1 flex-shrink-0",
                              isPast ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-blue-100 text-blue-800 border border-blue-200"
                            )}
                          >
                            {isPast ? 'Past' : 'Future'}
                          </Badge>
                        </div>
                        <p className="font-manrope font-light text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                          {memory.text}
                        </p>
                        {memory.memory_location && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-4 border-t border-border">
                            <MapPin className="w-3 h-3" />
                            <span className="font-manrope">{memory.memory_location}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    );
  }

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

        {/* Hero Image - from artifact or memory.image_urls */}
        {heroImageUrl && (
          <div className="relative w-full aspect-[21/9] rounded-lg overflow-hidden shadow-2xl mb-12">
            <img
              src={heroImageUrl}
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
            // Check for images from both artifacts AND memory.image_urls
            const hasArtifactImage = artifacts.length > 0;
            const hasMemoryImage = memory.image_urls && memory.image_urls.length > 0;
            const hasImage = hasArtifactImage || hasMemoryImage;
            // Prefer artifact image, fallback to memory.image_urls
            const imageUrl = hasArtifactImage ? artifacts[0].signedUrl : (hasMemoryImage ? memory.image_urls[0] : null);

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
                  {/* Image - from artifact or memory.image_urls */}
                  {hasImage && imageUrl && (
                    <div className="relative w-full aspect-[16/9] overflow-hidden">
                      <img
                        src={imageUrl}
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

                    {/* Title with Privacy Badge */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <h3 className="font-manrope font-semibold text-xl sm:text-2xl text-foreground leading-tight group-hover:text-primary transition-colors duration-300 flex-1">
                        {memory.title}
                      </h3>
                      <Badge 
                        variant="secondary" 
                        className="text-xs font-manrope font-medium px-2 py-1 bg-muted/50 text-foreground border border-border flex-shrink-0"
                      >
                        Private
                      </Badge>
                    </div>

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
