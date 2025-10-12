import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, MapPin, Calendar, ZoomIn, ZoomOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemories } from '@/hooks/useMemories';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

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
  const [zoomLevel, setZoomLevel] = useState(1);
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

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-border bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Timeline</h1>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              className="font-light"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground font-light min-w-[60px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2}
              className="font-light"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            {zoomLevel !== 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetZoom}
                className="font-light"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Timeline */}
      <div 
        className="max-w-5xl mx-auto px-8 py-16 transition-all duration-500 ease-out origin-top"
        style={{ 
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top center'
        }}
      >
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
          <div className="relative space-y-20 animate-fade-in">
            {/* Timeline Line with dots */}
            <div className="absolute left-8 top-0 w-px bg-gradient-to-b from-primary/30 via-primary/20 to-primary/10 h-full" />

            {/* Timeline Content */}
            {timelineData.map((yearData) => {
              const isMajorYear = yearData.significance === 'major';
              const yearSize = isMajorYear ? 'text-5xl' : 'text-4xl';
              const markerSize = isMajorYear ? 'w-5 h-5' : 'w-3 h-3';
              const spacing = isMajorYear ? 'mb-10' : 'mb-6';
              
              return (
                <div key={yearData.year} className={`relative ${isMajorYear ? 'my-28' : 'my-16'}`}>
                  {/* Year Marker - Minimalist dot */}
                  <div className={`absolute left-[26px] top-2 ${markerSize} rounded-full ${
                    isMajorYear 
                      ? 'bg-primary shadow-lg shadow-primary/40' 
                      : 'bg-primary/60 shadow-md shadow-primary/20'
                  } transition-all duration-300`} />

                  <div className="ml-24 space-y-8">
                    {/* Year Header */}
                    <div 
                      className="cursor-pointer group"
                      onClick={() => toggleYear(yearData.year)}
                    >
                      <h2 className={`${yearSize} font-light ${spacing} text-foreground group-hover:text-primary transition-colors flex items-center gap-4 ${
                        isMajorYear ? 'animate-scale-in font-normal' : ''
                      }`}>
                        {yearData.year}
                        {yearData.isCurrentYear && (
                          <span className="text-sm text-primary font-medium bg-primary/10 px-4 py-1.5 rounded-full">
                            Today
                          </span>
                        )}
                      </h2>
                      
                      {/* Life Events (Birth) - Always prominent */}
                      {yearData.events.map((event, eventIndex) => (
                        <div key={eventIndex} className="space-y-3 mb-8 animate-fade-in">
                          <div className="text-3xl font-light text-foreground flex items-center gap-4">
                            {event.event}
                            {event.location && (
                              <div className="flex items-center gap-2 text-xl text-muted-foreground">
                                <MapPin className="w-5 h-5" />
                                {event.location}
                              </div>
                            )}
                          </div>
                          {event.date && (
                            <div className="text-sm text-muted-foreground flex items-center gap-2 font-light">
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
                        <p className="text-sm text-muted-foreground italic animate-pulse font-light">
                          Start recording memories to fill your timeline...
                        </p>
                      )}
                    </div>

                    {/* Expanded Year Content */}
                    {expandedYears.has(yearData.year) && yearData.memories.length > 0 && (
                      <div className="space-y-6 animate-scale-in">
                        {yearData.memories.map((memory) => {
                          const isMajorMemory = memory.significance === 'major';
                          return (
                            <Card
                              key={memory.id}
                              className={`timeline-card transition-all duration-500 ${
                                materializingMemory === memory.id 
                                  ? 'border-primary/40 scale-105' 
                                  : isMajorMemory
                                    ? 'border-white/20 hover:border-white/30'
                                    : 'border-white/10 hover:border-white/20'
                              }`}
                              style={{
                                boxShadow: materializingMemory === memory.id 
                                  ? 'var(--shadow-elevated)' 
                                  : 'var(--shadow-soft)'
                              }}
                            >
                              <CardContent className={`${isMajorMemory ? 'p-10' : 'p-8'} space-y-4`}>
                                <div className="text-sm text-white/60 flex items-center gap-3 flex-wrap font-light">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(memory.memory_date || memory.created_at || memory.date).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                  {memory.memory_location && (
                                    <>
                                      <span className="mx-1">•</span>
                                      <MapPin className="w-4 h-4" />
                                      {memory.memory_location}
                                    </>
                                  )}
                                </div>
                                <h3 className={`${isMajorMemory ? 'text-3xl' : 'text-2xl'} font-light text-white`}>
                                  {memory.title}
                                </h3>
                                <p className={`text-white/80 leading-relaxed ${isMajorMemory ? 'text-lg' : 'text-base'} font-light`}>
                                  {memory.text}
                                </p>
                                
                                {/* Memory Images */}
                                {memory.image_urls && memory.image_urls.length > 0 && (
                                  <div className={`grid gap-3 mt-4 ${
                                    memory.image_urls.length === 1 ? 'grid-cols-1' : 
                                    memory.image_urls.length === 2 ? 'grid-cols-2' : 
                                    'grid-cols-2 sm:grid-cols-3'
                                  }`}>
                                    {memory.image_urls.map((url, imgIdx) => {
                                      const publicUrl = supabase.storage
                                        .from('memory-images')
                                        .getPublicUrl(url).data.publicUrl;
                                      
                                      return (
                                        <div 
                                          key={imgIdx} 
                                          className="relative group cursor-pointer overflow-hidden rounded-lg border border-white/20"
                                        >
                                          <img
                                            src={publicUrl}
                                            alt={`Memory image ${imgIdx + 1}`}
                                            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                                            loading="lazy"
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                
                                {memory.conversation_text && (
                                  <details className="mt-6">
                                    <summary className="text-sm text-primary cursor-pointer hover:underline font-light">
                                      View conversation with Solon
                                    </summary>
                                    <div className="mt-4 p-5 bg-black/20 rounded-lg text-sm text-white/70 whitespace-pre-line border border-white/10 font-light">
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
