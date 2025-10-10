import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, MapPin, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemories } from '@/hooks/useMemories';
import { useProfile } from '@/hooks/useProfile';

// Generate life events based on profile
const generateLifeEvents = (profile: any) => {
  if (!profile?.birth_date) return [];
  
  const birthYear = new Date(profile.birth_date).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  
  const events = [
    { 
      year: birthYear, 
      event: 'Born', 
      type: 'milestone',
      location: profile.birth_place || 'Unknown',
      date: profile.birth_date
    }
  ];

  // Add age-appropriate milestones
  if (age >= 18) {
    events.push({ 
      year: birthYear + 18, 
      event: 'Came of Age', 
      type: 'milestone',
      location: profile.current_location || 'Unknown',
      date: null
    });
  }
  if (age >= 22) {
    events.push({ 
      year: birthYear + 22, 
      event: 'Early Adulthood', 
      type: 'milestone',
      location: profile.current_location || 'Unknown', 
      date: null
    });
  }
  
  return events;
};

// Create timeline data combining events and memories
const createTimelineData = (actualMemories: any[], profile: any) => {
  const currentYear = new Date().getFullYear();
  const birthYear = profile?.birth_date ? new Date(profile.birth_date).getFullYear() : currentYear - 25;
  const timelineData = [];
  
  const lifeEvents = generateLifeEvents(profile);
  
  for (let year = birthYear; year <= currentYear; year++) {
    const yearEvents = lifeEvents.filter(event => event.year === year);
    const yearMemories = actualMemories.filter(memory => {
      const memoryYear = new Date(memory.created_at || memory.date).getFullYear();
      return memoryYear === year;
    });
    
    if (yearEvents.length > 0 || yearMemories.length > 0) {
      timelineData.push({
        year,
        events: yearEvents,
        memories: yearMemories,
        hasContent: true
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
                  <h2 className="text-5xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {yearData.year}
                  </h2>
                  
                  {/* Life Events */}
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
                            {new Date(memory.created_at || memory.date).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <h3 className="text-2xl font-semibold">
                            {memory.title}
                          </h3>
                          <p className="text-muted-foreground leading-relaxed">
                            {memory.content || memory.preview}
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
