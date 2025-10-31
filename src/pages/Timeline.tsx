import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// Extend window interface for scroll timeout
declare global {
  interface Window {
    scrollTimeout: number;
  }
}
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Calendar, RefreshCw, Plus } from 'lucide-react';
import { EnhancedVoiceSearch } from '@/components/EnhancedVoiceSearch';
import { Link } from 'react-router-dom';
import { useMemories } from '@/hooks/useMemories';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MemoryDetailDialog } from '@/components/MemoryDetailDialog';
import { Memory3DSlider } from '@/components/Memory3DSlider';
import { soundEffects } from '@/services/soundEffects';


// Detect significant events based on keywords
const detectEventSignificance = (memory: any): 'major' | 'minor' => {
  const text = (memory.title + ' ' + (memory.text || '')).toLowerCase();
  const majorKeywords = [
    'graduated', 'graduation', 'married', 'marriage', 'wedding',
    'born', 'birth', 'child', 'baby', 'died', 'death', 'funeral',
    'college', 'university', 'degree', 'moved', 'new job', 'promoted',
    'promotion', 'started', 'founded', 'retired', 'divorce',
    'first', 'trip', 'travel', 'vacation', 'holiday', 'family'
  ];
  
  return majorKeywords.some(keyword => text.includes(keyword)) ? 'major' : 'minor';
};

// Generate only birth event from profile
const generateLifeEvents = (profile: any) => {
  if (!profile?.birth_date && !profile?.age) return [];
  
  // Calculate birth year from birth_date or age
  let birthYear;
  if (profile.birth_date) {
    birthYear = new Date(profile.birth_date).getFullYear();
  } else if (profile.age) {
    const currentYear = new Date().getFullYear();
    birthYear = currentYear - profile.age;
  } else {
    return [];
  }
  
  const birthPlace = profile.birth_place || profile.hometown || profile.location || 'Unknown';
  
  return [
    { 
      year: birthYear, 
      event: `Born (${birthYear})`, 
      type: 'milestone',
      significance: 'major' as const,
      location: birthPlace,
      date: profile.birth_date || `${birthYear}-01-01`
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
      const dateToUse = memory.memory_date || memory.created_at || memory.date;
      if (!dateToUse) return false;
      
      const parsedDate = new Date(dateToUse);
      if (isNaN(parsedDate.getTime())) return false;
      
      const memoryYear = parsedDate.getFullYear();
      return memoryYear === year;
    }).map(memory => ({
      ...memory,
      significance: detectEventSignificance(memory)
    }));
    
    const hasMajorEvents = yearEvents.some(e => e.significance === 'major') || 
                          yearMemories.some(m => m.significance === 'major');
    
    const hasAnyContent = yearEvents.length > 0 || yearMemories.length > 0;
    
    const shouldIncludeYear = year === birthYear || 
                             year === currentYear || 
                             hasAnyContent;
    
    if (shouldIncludeYear) {
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [materializingMemory, setMaterializingMemory] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<any | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  
  const { memories, loadMemories, isLoading } = useMemories();
  const { profile, loading: profileLoading } = useProfile();
  
  const [timelineMemories, setTimelineMemories] = useState<any[]>([]);
  const [timelineProfile, setTimelineProfile] = useState<any>(null);
  const [timelineLoading, setTimelineLoading] = useState(true);
  
  const [showVoiceSearch, setShowVoiceSearch] = useState(false);

  const fetchTimelineData = useCallback(async () => {
    const userId = user?.id || '00000000-0000-0000-0000-000000000000';

    try {
      setTimelineLoading(true);
      
      const { data: memories, error: memoriesError } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (memoriesError) {
        console.error('Failed to fetch memories:', memoriesError);
        throw memoriesError;
      }

      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Failed to fetch profile:', profileError);
        throw profileError;
      }
      
      if (profiles && profiles.age && !profiles.birth_date) {
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - profiles.age;
        profiles.birth_date = `${birthYear}-01-01`;
        profiles.birth_place = profiles.hometown || profiles.location || 'Unknown';
      }
      
      setTimelineMemories(memories || []);
      setTimelineProfile(profiles || profile || null);

    } catch (error) {
      console.error('Failed to fetch timeline data:', error);
    } finally {
      setTimelineLoading(false);
    }
  }, [user?.id, profile]);

  useEffect(() => {
    if (user?.id) {
      fetchTimelineData();
    }
  }, [user?.id, fetchTimelineData]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchTimelineData();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchTimelineData]);

  const timelineData = useMemo(() => {
    return createTimelineData(timelineMemories, timelineProfile || profile);
  }, [timelineMemories, timelineProfile, profile]);

  useEffect(() => {
    loadMemories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight - container.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    
    setScrollProgress(progress);
    
    setIsScrolling(true);
    clearTimeout(window.scrollTimeout);
    window.scrollTimeout = window.setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b-[1.5px] border-section-border bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Timeline</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVoiceSearch(true)}
              className="text-xs"
            >
              🎤 Voice Search
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTimelineData}
              disabled={timelineLoading}
            >
              <RefreshCw className={`w-4 h-4 ${timelineLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="h-[calc(100vh-60px)] overflow-auto" ref={containerRef} onScroll={handleScroll}>
        {profileLoading || isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground animate-pulse">Loading your timeline...</div>
          </div>
        ) : timelineData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-6">
            <div className="space-y-2">
              <p className="text-2xl font-medium text-foreground">No memories yet</p>
              <p className="text-base text-muted-foreground max-w-md">
                Start preserving your life stories by adding your first memory
              </p>
            </div>
            <Link to="/add-memory">
              <Button className="bg-primary hover:bg-primary/90 font-semibold px-6">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Memory
              </Button>
            </Link>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-8 py-16">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-1/4 top-0 bottom-0 w-1 bg-border" />

              {/* Timeline Content */}
              {timelineData
                .sort((a, b) => a.year - b.year)
                .map((yearData, index) => {
                  const isMajorYear = yearData.significance === 'major';
                  const markerSize = isMajorYear ? 'w-4 h-4' : 'w-3 h-3';
                  
                  return (
                    <div 
                      key={yearData.year} 
                      className="relative mb-16"
                      data-year={yearData.year}
                    >
                      {/* Year Marker */}
                      <div 
                        className={`absolute ${markerSize} rounded-full ${
                          isMajorYear 
                            ? 'bg-primary shadow-lg' 
                            : 'bg-primary/60 shadow-md'
                        } transition-all duration-300`}
                        style={{
                          left: 'calc(25% - 8px)',
                          top: '16px'
                        }}
                      />

                      {/* Left Side: Year Label */}
                      <div 
                        className="absolute right-[76%] pr-4 flex flex-col items-end justify-start"
                        style={{ top: '0px' }}
                      >
                        <h2 className="text-4xl font-light text-right text-foreground leading-none" style={{ fontFamily: 'Georgia, serif' }}>
                          {yearData.year}
                        </h2>

                        {yearData.isCurrentYear && (
                          <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full inline-block whitespace-nowrap mt-2">
                            Current Year
                          </span>
                        )}
                      </div>

                      {/* Right Side: Content */}
                      <div className="ml-[26%] pl-12 space-y-4">
                        {/* Life Events */}
                        {yearData.events.map((event, eventIndex) => (
                          <div key={eventIndex} className="space-y-1 animate-fade-in">
                            <div className="text-lg font-light text-foreground">
                              {event.event}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              {event.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {event.location}
                                </div>
                              )}
                              {event.date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(event.date).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Memory Cards with 3D Slider */}
                        {yearData.memories.length > 0 && (
                          <div className="animate-scale-in">
                            <Memory3DSlider
                              memories={yearData.memories.map((memory) => ({
                                id: memory.id,
                                title: memory.title,
                                text: memory.text,
                                image_urls: memory.image_urls,
                                date: new Date(memory.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                }),
                                onClick: () => setSelectedMemory(memory)
                              }))}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Scroll Progress Indicator */}
      {timelineData.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 h-1 bg-muted/20 z-40">
          <div 
            className={`h-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-300 ${
              isScrolling ? 'shadow-lg shadow-primary/20' : ''
            }`}
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      )}

      {/* Memory Detail Dialog */}
      {selectedMemory && (
        <MemoryDetailDialog
          memory={selectedMemory}
          open={!!selectedMemory}
          onOpenChange={(open) => !open && setSelectedMemory(null)}
          onUpdate={fetchTimelineData}
        />
      )}

      {/* Enhanced Voice Search Dialog */}
      <EnhancedVoiceSearch
        open={showVoiceSearch}
        onOpenChange={setShowVoiceSearch}
      />
    </div>
  );
};

export default Timeline;
