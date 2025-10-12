import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, MapPin, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemories } from '@/hooks/useMemories';
import { useProfile } from '@/hooks/useProfile';

// Generate only birth event from profile
const generateLifeEvents = (profile: any) => {
  if (!profile?.birth_date) return [];
  
  const birthYear = new Date(profile.birth_date).getFullYear();
  
  return [
    { 
      year: birthYear, 
      event: 'Born', 
      type: 'milestone',
      location: profile.birth_place || 'Unknown',
      date: profile.birth_date
    }
  ];
};

// Create timeline data combining birth event and memories
const createTimelineData = (actualMemories: any[], profile: any) => {
  const currentYear = new Date().getFullYear();
  const birthYear = profile?.birth_date ? new Date(profile.birth_date).getFullYear() : currentYear - 25;
  const timelineData = [];
  
  const lifeEvents = generateLifeEvents(profile);
  
  // Build timeline from birth year to current year
  for (let year = birthYear; year <= currentYear; year++) {
    const yearEvents = lifeEvents.filter(event => event.year === year);
    const yearMemories = actualMemories.filter(memory => {
      // Use memory_date if available, otherwise fall back to created_at
      const dateToUse = memory.memory_date || memory.created_at || memory.date;
      const memoryYear = new Date(dateToUse).getFullYear();
      return memoryYear === year;
    });
    
    // Only include years that have content (birth event, memories, or current year)
    if (yearEvents.length > 0 || yearMemories.length > 0 || year === currentYear) {
      timelineData.push({
        year,
        events: yearEvents,
        memories: yearMemories,
        hasContent: yearEvents.length > 0 || yearMemories.length > 0,
        isCurrentYear: year === currentYear
      });
    }
  }
  
  return timelineData;
};

const Timeline = () => {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [materializingMemory, setMaterializingMemory] = useState<string | null>(null);
  const { memories, loadMemories } = useMemories();
  const { profile } = useProfile();
  const timelineData = createTimelineData(memories, profile);

  // Refresh memories when component mounts
  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // Handle new memory materialization animation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const newMemoryId = urlParams.get('newMemory');
    const shouldAnimate = urlParams.get('animate') === 'true';
    const memorySummary = urlParams.get('summary');
    
    if (newMemoryId && shouldAnimate && memorySummary) {
      const currentYear = new Date().getFullYear();
      setExpandedYears(prev => new Set([...prev, currentYear]));
      
      setTimeout(() => {
        setMaterializingMemory(newMemoryId);
        
        const summaryElement = document.createElement('div');
        summaryElement.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-primary text-white px-6 py-3 rounded-full shadow-lg text-lg font-medium animate-fade-in';
        summaryElement.textContent = `✨ ${decodeURIComponent(memorySummary)}`;
        document.body.appendChild(summaryElement);
        
        setTimeout(() => {
          if (summaryElement.parentNode) {
            summaryElement.parentNode.removeChild(summaryElement);
          }
          setMaterializingMemory(null);
          window.history.replaceState({}, '', '/timeline');
        }, 2500);
      }, 300);
    }
  }, [memories]);

  const toggleYear = (year: number) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Timeline</h1>
        </div>
      </nav>

      {/* Main Timeline */}
      <div className="max-w-5xl mx-auto px-8 py-16">
        <div className="relative space-y-24 animate-fade-in">
          
          {/* Timeline Line */}
          <div className="absolute left-6 top-0 w-0.5 bg-border h-full" />

          {/* Timeline Content */}
          {timelineData.map((yearData, index) => (
            <div key={yearData.year} className="relative">
              
              {/* Year Marker */}
              <div className="absolute left-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>

              <div className="ml-20 space-y-6">
                {/* Year Header */}
                <div 
                  className="cursor-pointer group"
                  onClick={() => toggleYear(yearData.year)}
                >
                  <h2 className="text-5xl font-bold mb-3 group-hover:text-primary transition-colors flex items-center gap-3">
                    {yearData.year}
                    {yearData.isCurrentYear && (
                      <span className="text-lg text-primary font-normal">(Today)</span>
                    )}
                  </h2>
                  
                  {/* Life Events (Birth) */}
                  {yearData.events.map((event, eventIndex) => (
                    <div key={eventIndex} className="space-y-2 mb-4">
                      <div className="text-xl font-semibold text-foreground flex items-center gap-3">
                        {event.event}
                        {event.type === 'milestone' && event.location && (
                          <div className="flex items-center gap-2 text-base text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        )}
                      </div>
                      {event.date && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(event.date).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Show message for current year if no memories yet */}
                  {yearData.isCurrentYear && yearData.memories.length === 0 && yearData.events.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      Start recording memories to fill your timeline...
                    </p>
                  )}
                </div>

                {/* Expanded Year Content */}
                {expandedYears.has(yearData.year) && (
                  <div className="space-y-4 animate-scale-in">
                    {yearData.memories.map((memory) => (
                      <Card
                        key={memory.id}
                        className={`modern-card border-border/50 transition-all duration-500 ${
                          materializingMemory === memory.id 
                            ? 'border-primary shadow-lg shadow-primary/10' 
                            : ''
                        }`}
                      >
                        <CardContent className="p-6 space-y-3">
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            {new Date(memory.memory_date || memory.created_at || memory.date).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                            {memory.memory_location && (
                              <>
                                <span className="mx-1">•</span>
                                <MapPin className="w-3 h-3" />
                                {memory.memory_location}
                              </>
                            )}
                          </div>
                          <h3 className="text-2xl font-semibold">
                            {memory.title}
                          </h3>
                          <p className="text-muted-foreground leading-relaxed">
                            {memory.text}
                          </p>
                          {memory.conversation_text && (
                            <details className="mt-4">
                              <summary className="text-sm text-primary cursor-pointer hover:underline">
                                View conversation with Solon
                              </summary>
                              <div className="mt-3 p-4 bg-card rounded-lg text-sm text-muted-foreground whitespace-pre-line border border-border/50">
                                {memory.conversation_text}
                              </div>
                            </details>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
};

export default Timeline;
