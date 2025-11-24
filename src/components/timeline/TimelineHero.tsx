import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

interface TimelineHeroProps {
  userName: string;
  birthDate: string | null;
  memoryCount: number;
  onScrollToContent: () => void;
}

export const TimelineHero: React.FC<TimelineHeroProps> = ({
  userName,
  birthDate,
  memoryCount,
  onScrollToContent,
}) => {
  const birthYear = birthDate ? new Date(birthDate).getFullYear() : null;
  const currentYear = new Date().getFullYear();

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-card to-background">
      <div className="max-w-5xl mx-auto px-6 sm:px-12 text-center">
        {/* Main Title */}
        <div className="mb-8">
          <h1 className="font-manrope font-light text-6xl sm:text-7xl lg:text-8xl text-foreground mb-6 tracking-tight">
            {birthYear && `${currentYear - birthYear}+ years`}
          </h1>
          <p className="font-manrope font-light text-2xl sm:text-3xl text-muted-foreground">
            {userName}'s Life Story
          </p>
        </div>

        {/* Subtitle */}
        <div className="mb-12">
          <p className="font-manrope font-light text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A journey through time, capturing moments, memories, and milestones that shape a life
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-12 mb-16">
          <div className="text-center">
            <div className="font-manrope font-semibold text-4xl text-primary mb-2">
              {memoryCount}
            </div>
            <div className="font-manrope text-sm text-muted-foreground uppercase tracking-wide">
              Memories
            </div>
          </div>
          
          {birthYear && (
            <div className="text-center">
              <div className="font-manrope font-semibold text-4xl text-primary mb-2">
                {currentYear - birthYear}
              </div>
              <div className="font-manrope text-sm text-muted-foreground uppercase tracking-wide">
                Years
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <Button
          onClick={onScrollToContent}
          variant="outline"
          size="lg"
          className="group font-manrope font-medium px-8 py-6 text-base hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
        >
          Explore the journey
          <ChevronDown className="ml-2 w-4 h-4 animate-bounce" />
        </Button>
      </div>

      {/* Decorative element */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
};
