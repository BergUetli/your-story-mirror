import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Chrono } from 'react-chrono';

// Extend window interface for scroll timeout
declare global {
  interface Window {
    scrollTimeout: number;
  }
}
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Plus } from 'lucide-react';
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
  console.log('🔄 Timeline: Creating timeline data', { 
    memoriesCount: actualMemories?.length || 0, 
    memories: actualMemories?.map(m => ({ 
      id: m.id, 
      title: m.title, 
      memory_date: m.memory_date, 
      created_at: m.created_at,
      date: m.date 
    })),
    profile: profile ? { birth_date: profile.birth_date, birth_place: profile.birth_place } : 'NO PROFILE'
  });
  
  const currentYear = new Date().getFullYear();
  const birthYear = profile?.birth_date ? new Date(profile.birth_date).getFullYear() : currentYear - 25;
  const timelineData = [];
  
  const lifeEvents = generateLifeEvents(profile);
  console.log('📅 Timeline: Generated life events', lifeEvents);
  
  // Build timeline from birth year to current year
  for (let year = birthYear; year <= currentYear; year++) {
    const yearEvents = lifeEvents.filter(event => event.year === year);
    const yearMemories = actualMemories.filter(memory => {
      // Only include memories with valid dates - if no date, memory won't appear on timeline
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
    
    // Determine if this year has significant events
    const hasMajorEvents = yearEvents.some(e => e.significance === 'major') || 
                          yearMemories.some(m => m.significance === 'major');
    
    // Include years with any content (memories or events)
    const hasAnyContent = yearEvents.length > 0 || yearMemories.length > 0;
    
    // Always show: birth year, current year, OR any year with content (memories/events)
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
  
  console.log('✅ Timeline: Created', timelineData.length, 'year entries:', 
    timelineData.map(y => ({ 
      year: y.year, 
      memories: y.memories.length, 
      events: y.events.length,
      significance: y.significance,
      memoryTitles: y.memories.map(m => m.title),
      memorySignificance: y.memories.map(m => m.significance)
    }))
  );
  return timelineData;
};

const Timeline = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [materializingMemory, setMaterializingMemory] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<any | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Scroll state for modern scroll indicators
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  
  const { memories, loadMemories, isLoading } = useMemories();
  const { profile, loading: profileLoading } = useProfile();
  
  // Fetch timeline data through optimized queries
  const [timelineMemories, setTimelineMemories] = useState<any[]>([]);
  const [timelineProfile, setTimelineProfile] = useState<any>(null);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [memoryArtifacts, setMemoryArtifacts] = useState<Record<string, any>>({});
  const [memoryVoiceRecordings, setMemoryVoiceRecordings] = useState<Set<string>>(new Set());
  
  // Voice search state
  const [showVoiceSearch, setShowVoiceSearch] = useState(false);

  const fetchTimelineData = useCallback(async () => {
    const userId = user?.id || '00000000-0000-0000-0000-000000000000';
    
    console.log('🔄 Timeline: Fetching data for user', userId);

    try {
      setTimelineLoading(true);
      
      // Fetch memories directly from Supabase
      const { data: memories, error: memoriesError } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (memoriesError) {
        console.error('Failed to fetch memories:', memoriesError);
        throw memoriesError;
      }

      // Fetch profile directly from Supabase - use user_profiles table
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Failed to fetch profile:', profileError);
        throw profileError;
      }
      
      // Calculate birth_date from age if not present
      if (profiles && profiles.age && !profiles.birth_date) {
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - profiles.age;
        profiles.birth_date = `${birthYear}-01-01`;
        profiles.birth_place = profiles.hometown || profiles.location || 'Unknown';
      }

      console.log('✅ Timeline: Fetched', memories?.length || 0, 'memories and profile', profiles);
      
      setTimelineMemories(memories || []);
      setTimelineProfile(profiles || profile || null);

      // Fetch artifacts and voice recordings for all memories
      if (memories && memories.length > 0) {
        const artifactsMap: Record<string, any> = {};
        const voiceRecordingSet = new Set<string>();
        
        // Fetch artifacts
        for (const memory of memories) {
          const { data: artifactLinks } = await supabase
            .from('memory_artifacts')
            .select(`
              artifact_id,
              artifacts (
                id,
                artifact_type,
                storage_path,
                file_name
              )
            `)
            .eq('memory_id', memory.id)
            .limit(1);
          
          if (artifactLinks && artifactLinks.length > 0 && (artifactLinks[0] as any).artifacts) {
            const artifact = (artifactLinks[0] as any).artifacts;
            // Get signed URL for the artifact
            const { data: urlData } = await supabase.storage
              .from('memory-images')
              .createSignedUrl(artifact.storage_path, 3600);
            
            artifactsMap[memory.id] = {
              ...artifact,
              signedUrl: urlData?.signedUrl || null
            };
          }
        }
        
        // Fetch voice recordings that reference these memories
        const memoryIds = memories.map(m => m.id);
        
        // Fetch voice recordings that reference these memories  
        // Only use memory_ids array field since memory_id column doesn't exist
        const { data: voiceRecordingsByIds } = await supabase
          .from('voice_recordings')
          .select('memory_ids')
          .eq('user_id', userId)
          .not('memory_ids', 'is', null);
        
        console.log('🎤 Timeline: Voice recordings debug:', {
          memoryIds,
          voiceRecordingsByIds,
          userCount: memories.length
        });
        
        // Add recordings from memory_ids field (array contains any of our memory IDs)
        if (voiceRecordingsByIds) {
          for (const recording of voiceRecordingsByIds) {
            if (recording.memory_ids && Array.isArray(recording.memory_ids)) {
              for (const memoryId of recording.memory_ids) {
                if (memoryIds.includes(memoryId)) {
                  voiceRecordingSet.add(memoryId);
                }
              }
            }
          }
        }
        
        console.log('🎤 Timeline: Found voice recordings for memories:', Array.from(voiceRecordingSet));
        
        setMemoryArtifacts(artifactsMap);
        setMemoryVoiceRecordings(voiceRecordingSet);
      }
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

  // Poll for updates every 5 seconds when on timeline page
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Timeline: Auto-refresh triggered');
      fetchTimelineData();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchTimelineData]);

  // Memoize timeline data to prevent infinite re-renders
  const timelineData = useMemo(() => {
    return createTimelineData(timelineMemories, timelineProfile || profile);
  }, [timelineMemories, timelineProfile, profile]);

  // Refresh memories when component mounts
  useEffect(() => {
    loadMemories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle new memory materialization animation and highlighting
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const highlightMemoryId = urlParams.get('highlight');
    const isNewMemory = urlParams.get('new') === 'true';
    
    if (highlightMemoryId && !timelineLoading && timelineData.length > 0) {
      console.log('🎯 Timeline: Processing memory highlight:', { highlightMemoryId, isNewMemory });
      
      // Find the memory in the timeline data
      let foundMemory = null;
      let foundYear = null;
      
      for (const yearData of timelineData) {
        const memory = yearData.memories.find(m => m.id === highlightMemoryId);
        if (memory) {
          foundMemory = memory;
          foundYear = yearData.year;
          break;
        }
      }
      
      if (foundMemory && foundYear) {
        console.log('✅ Timeline: Found memory to highlight:', foundMemory.title, 'in year', foundYear);
        
        // If it's a new memory, trigger materialization animation
        if (isNewMemory) {
          setTimeout(async () => {
            try {
              // Play happy whoosh sound
              await soundEffects.playHappyWhoosh();
              
              // Trigger materialization animation
              setMaterializingMemory(highlightMemoryId);
              
              // Scroll to the memory after a brief delay
              setTimeout(() => {
                const memoryElement = document.getElementById(`memory-${highlightMemoryId}`);
                if (memoryElement) {
                  memoryElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                  });
                  console.log('📍 Timeline: Scrolled to new memory:', highlightMemoryId);
                }
              }, 300);
              
              // Clear materialization after animation
              setTimeout(() => {
                setMaterializingMemory(null);
              }, 2000);
              
            } catch (error) {
              console.warn('Sound effect failed:', error);
            }
          }, 500); // Delay to ensure DOM is ready
        } else {
          // Just scroll to existing memory
          setTimeout(() => {
            const memoryElement = document.getElementById(`memory-${highlightMemoryId}`);
            if (memoryElement) {
              memoryElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
              console.log('📍 Timeline: Scrolled to highlighted memory:', highlightMemoryId);
            }
          }, 300);
        }
        
        // Clear URL params after processing
        setTimeout(() => {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }, 3000);
      } else {
        console.warn('⚠️ Timeline: Memory not found for highlighting:', highlightMemoryId);
      }
    }
    
    const newMemoryId = urlParams.get('newMemory');
    const shouldAnimate = urlParams.get('animate') === 'true';
    const memorySummary = urlParams.get('summary');
    
    if (newMemoryId && shouldAnimate && memorySummary) {
      const handoffId = `timeline-${Date.now()}`;
      const timestamp = new Date().toISOString();
      
      console.log(`🔄 [${handoffId}] HANDOFF: 9️⃣ TIMELINE RECEIVED @ ${timestamp}`, {
        memoryId: newMemoryId,
        animate: shouldAnimate,
        summary: memorySummary
      });
      
      setTimeout(() => {
        console.log(`🔄 [${handoffId}] HANDOFF: 1️⃣1️⃣ STARTING ANIMATION`, { memoryId: newMemoryId });
        setMaterializingMemory(newMemoryId);
        
        const summaryElement = document.createElement('div');
        summaryElement.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-primary text-white px-6 py-3 rounded-full shadow-lg text-lg font-medium animate-fade-in';
        summaryElement.textContent = `✨ ${decodeURIComponent(memorySummary)}`;
        document.body.appendChild(summaryElement);
        
        console.log(`🔄 [${handoffId}] HANDOFF: 1️⃣2️⃣ BANNER DISPLAYED`, { 
          text: summaryElement.textContent 
        });
        
        setTimeout(() => {
          console.log(`🔄 [${handoffId}] HANDOFF: 1️⃣3️⃣ ANIMATION COMPLETE`, { 
            memoryId: newMemoryId,
            duration: '3000ms'
          });
          
          if (summaryElement.parentNode) {
            summaryElement.parentNode.removeChild(summaryElement);
          }
          setMaterializingMemory(null);
          
          console.log(`🔄 [${handoffId}] HANDOFF: ✅ TIMELINE HANDOFF COMPLETE`, {
            status: 'Memory successfully materialized on timeline'
          });
          window.history.replaceState({}, '', '/timeline');
        }, 2500);
      }, 300);
    }
  }, [timelineLoading, timelineData]);

  const handleDeleteMemory = async (memoryId: string, memoryTitle: string) => {
    if (!confirm(`Delete "${memoryTitle}"? This cannot be undone.`)) {
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Authentication required',
        description: 'You must be signed in to delete memories',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('id', memoryId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Memory deleted',
        description: `"${memoryTitle}" has been removed from your timeline.`,
      });

      // Refresh timeline data
      await fetchTimelineData();
    } catch (error) {
      console.error('Failed to delete memory:', error);
      toast({
        title: 'Failed to delete memory',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleEditMemory = (memoryId: string) => {
    // Open the memory detail dialog (which will eventually support editing)
    const memory = timelineMemories.find(m => m.id === memoryId);
    if (memory) {
      setSelectedMemory(memory);
    }
  };

  // Scroll handling for progress indicator
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight - container.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    
    setScrollProgress(progress);
    
    // Set scrolling state for visual feedback
    setIsScrolling(true);
    clearTimeout(window.scrollTimeout);
    window.scrollTimeout = window.setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  };

  // Transform timeline data into react-chrono format
  const chronoItems = useMemo(() => {
    return timelineData
      .sort((a, b) => a.year - b.year) // Chronological order
      .map((yearData) => {
        // Build card title from events
        const eventTitles = yearData.events.map(e => e.event).join(', ');
        
        return {
          title: yearData.year.toString(),
          cardTitle: eventTitles || (yearData.memories.length > 0 ? `${yearData.memories.length} ${yearData.memories.length === 1 ? 'Memory' : 'Memories'}` : yearData.isCurrentYear ? 'Current Year' : ''),
          cardSubtitle: yearData.isCurrentYear ? new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '',
          cardDetailedText: '', // We'll use custom content instead
          yearData, // Pass through for custom rendering
        };
      });
  }, [timelineData]);

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
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVoiceSearch(true)}
              className="text-xs"
              title="Search and play voice recordings"
            >
              🎤 Voice Search
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTimelineData}
              disabled={timelineLoading}
              className="font-light"
              title="Refresh timeline"
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
          <div className="py-8 px-4">
            <Chrono
              items={chronoItems}
              mode="VERTICAL"
              disableClickOnCircle={false}
              disableNavOnKey={false}
              scrollable={false}
              cardHeight={200}
              theme={{
                primary: 'hsl(var(--primary))',
                secondary: 'hsl(var(--background))',
                cardBgColor: 'hsl(var(--card))',
                titleColor: 'hsl(var(--foreground))',
                titleColorActive: 'hsl(var(--primary))',
              }}
            >
              {chronoItems.map((item, index) => (
                <div key={index} className="space-y-4 p-4">
                  {/* Life Events */}
                  {item.yearData.events.map((event: any, eventIndex: number) => (
                    <div key={eventIndex} className="space-y-1 mb-2 animate-fade-in">
                      <div className="text-lg font-light text-foreground">
                        {event.event}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {event.location && (
                          <div className="flex items-center gap-1">
                            📍 {event.location}
                          </div>
                        )}
                        {event.date && (
                          <div className="flex items-center gap-1 font-light">
                            📅 {new Date(event.date).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Memory Cards with 3D Slider */}
                  {item.yearData.memories.length > 0 && (
                    <div className="animate-scale-in">
                      <Memory3DSlider
                        memories={item.yearData.memories.map((memory: any) => ({
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
              ))}
            </Chrono>
          </div>
        )}
      </div>

      {/* Scroll Progress Indicator (mobile) */}
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
