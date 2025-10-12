import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, MapPin, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemories } from '@/hooks/useMemories';
import { useProfile } from '@/hooks/useProfile';

// Detect significant events based on keywords
const detectEventSignificance = (memory: any): 'major' | 'minor' => {
  const text = (memory.title + ' ' + (memory.text || '')).toLowerCase();
  const majorKeywords = [
    'graduated', 'graduation', 'married', 'marriage', 'wedding',
    'born', 'birth', 'child', 'baby', 'died', 'death', 'funeral',
    'college', 'university', 'degree', 'moved', 'new job', 'promoted',
    'promotion', 'started', 'founded', 'retired', 'divorce'
  ];
  
  return majorKeywords.some(keyword => text.includes(keyword)) ? 'major' : 'minor';
};

// Generate only birth event from profile
const generateLifeEvents = (profile: any) => {
  if (!profile?.birth_date) return [];
  
  const birthYear = new Date(profile.birth_date).getFullYear();
  
  return [
    { 
      year: birthYear, 
      event: 'Born', 
      type: 'milestone',
      significance: 'major' as const,
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
    }).map(memory => ({
      ...memory,
      significance: detectEventSignificance(memory)
    }));
    
    // Determine if this year has significant events
    const hasMajorEvents = yearEvents.some(e => e.significance === 'major') || 
                          yearMemories.some(m => m.significance === 'major');
    
    // Only include years that have content (birth event, memories, or current year)
    if (yearEvents.length > 0 || yearMemories.length > 0 || year === currentYear) {
      timelineData.push({
        year,
        events: yearEvents,
        memories: yearMemories,
        hasContent: yearEvents.length > 0 || yearMemories.length > 0,
        isCurrentYear: year === currentYear,
        significance: hasMajorEvents ? 'major' : 'minor'
      });
    }
  }
  
  return timelineData;
};

const Timeline = () => {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [materializingMemory, setMaterializingMemory] = useState<string | null>(null);
  const { memories, loadMemories, isLoading } = useMemories();
  const { profile, loading: profileLoading } = useProfile();
  const timelineData = createTimelineData(memories, profile);

  // Refresh memories when component mounts
  useEffect(() => {
    loadMemories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Auto-expand years with major events on initial load
  useEffect(() => {
    if (!isLoading && timelineData.length > 0) {
      const majorYears = timelineData
        .filter(y => y.significance === 'major')
        .map(y => y.year);
      if (majorYears.length > 0) {
        setExpandedYears(new Set(majorYears));
      }
    }
  }, [isLoading, timelineData]);

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
    <div className="min-h-screen bg-white">
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
        {profileLoading || isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground animate-pulse">Loading your timeline...</div>
          </div>
        ) : timelineData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-xl text-muted-foreground mb-4">Your timeline is waiting to be filled</p>
            <p className="text-sm text-muted-foreground">Start recording memories to see them appear here</p>
          </div>
        ) : (
          <div className="relative space-y-16 animate-fade-in">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 w-0.5 bg-border h-full" />

            {/* Timeline Content */}
            {timelineData.map((yearData) => {
              const isMajorYear = yearData.significance === 'major';
              const yearSize = isMajorYear ? 'text-5xl' : 'text-3xl';
              const markerSize = isMajorYear ? 'w-16 h-16' : 'w-10 h-10';
              const iconSize = isMajorYear ? 'w-8 h-8' : 'w-5 h-5';
              const spacing = isMajorYear ? 'mb-8' : 'mb-4';
              
              return (
                <div key={yearData.year} className={`relative ${isMajorYear ? 'my-24' : 'my-12'}`}>
                  {/* Year Marker - Size based on significance */}
                  <div className={`absolute left-0 ${markerSize} rounded-full ${
                    isMajorYear 
                      ? 'bg-primary shadow-lg shadow-primary/30 scale-110' 
                      : 'bg-primary/70'
                  } flex items-center justify-center transition-all duration-300`}>
                    <Clock className={`${iconSize} text-white`} />
                  </div>

                  <div className="ml-20 space-y-6">
                    {/* Year Header */}
                    <div 
                      className="cursor-pointer group"
                      onClick={() => toggleYear(yearData.year)}
                    >
                      <h2 className={`${yearSize} font-bold ${spacing} group-hover:text-primary transition-colors flex items-center gap-3 ${
                        isMajorYear ? 'animate-scale-in' : ''
                      }`}>
                        {yearData.year}
                        {yearData.isCurrentYear && (
                          <span className="text-base text-primary font-normal bg-primary/10 px-3 py-1 rounded-full">
                            Today
                          </span>
                        )}
                      </h2>
                      
                      {/* Life Events (Birth) - Always prominent */}
                      {yearData.events.map((event, eventIndex) => (
                        <div key={eventIndex} className="space-y-2 mb-6 animate-fade-in">
                          <div className="text-2xl font-bold text-foreground flex items-center gap-3">
                            {event.event}
                            {event.location && (
                              <div className="flex items-center gap-2 text-lg text-muted-foreground">
                                <MapPin className="w-5 h-5" />
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
                        <p className="text-sm text-muted-foreground italic animate-pulse">
                          Start recording memories to fill your timeline...
                        </p>
                      )}
                    </div>

                    {/* Expanded Year Content */}
                    {expandedYears.has(yearData.year) && yearData.memories.length > 0 && (
                      <div className="space-y-4 animate-scale-in">
                        {yearData.memories.map((memory) => {
                          const isMajorMemory = memory.significance === 'major';
                          return (
                            <Card
                              key={memory.id}
                              className={`modern-card transition-all duration-500 ${
                                materializingMemory === memory.id 
                                  ? 'border-primary shadow-lg shadow-primary/10 scale-105' 
                                  : isMajorMemory
                                    ? 'border-primary/50 shadow-md hover:shadow-lg hover:scale-102'
                                    : 'border-border/30 hover:border-border/50'
                              }`}
                            >
                              <CardContent className={`${isMajorMemory ? 'p-8' : 'p-6'} space-y-3`}>
                                <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
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
                                <h3 className={`${isMajorMemory ? 'text-3xl' : 'text-xl'} font-semibold`}>
                                  {memory.title}
                                </h3>
                                <p className={`text-muted-foreground leading-relaxed ${isMajorMemory ? 'text-base' : 'text-sm'}`}>
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
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Timeline;
