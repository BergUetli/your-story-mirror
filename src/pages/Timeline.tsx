import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, MapPin, Calendar, ZoomIn, ZoomOut, RefreshCw, Trash2, Edit, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemories } from '@/hooks/useMemories';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MemoryDetailDialog } from '@/components/MemoryDetailDialog';
import StoryMap from '@/components/StoryMap';

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
  console.log('🔄 Timeline: Creating timeline data', { 
    memoriesCount: actualMemories?.length || 0, 
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
  
  console.log('✅ Timeline: Created', timelineData.length, 'year entries');
  return timelineData;
};

const Timeline = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [materializingMemory, setMaterializingMemory] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<any | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomLevelRef = useRef(1);
  const panOffsetRef = useRef({ x: 0, y: 0 });
  
  const { memories, loadMemories, isLoading } = useMemories();
  const { profile, loading: profileLoading } = useProfile();
  
  // Fetch timeline data through orchestrator for optimized performance
  const [timelineMemories, setTimelineMemories] = useState<any[]>([]);
  const [timelineProfile, setTimelineProfile] = useState<any>(null);
  const [timelineLoading, setTimelineLoading] = useState(true);

  const fetchTimelineData = async () => {
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

      // Fetch profile directly from Supabase
      const { data: profiles, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Failed to fetch profile:', profileError);
        throw profileError;
      }

      console.log('✅ Timeline: Fetched', memories?.length || 0, 'memories and profile', profiles);
      
      setTimelineMemories(memories || []);
      setTimelineProfile(profiles || null);
    } catch (error) {
      console.error('Failed to fetch timeline data:', error);
    } finally {
      setTimelineLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelineData();
  }, [user?.id]);

  // Poll for updates every 5 seconds when on timeline page (more frequent for testing)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Timeline: Auto-refresh triggered');
      fetchTimelineData();
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const timelineData = createTimelineData(timelineMemories, timelineProfile);

  // Keep refs in sync with state
  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

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
      const handoffId = `timeline-${Date.now()}`;
      const timestamp = new Date().toISOString();
      
      console.log(`🔄 [${handoffId}] HANDOFF: 9️⃣ TIMELINE RECEIVED @ ${timestamp}`, {
        memoryId: newMemoryId,
        animate: shouldAnimate,
        summary: memorySummary
      });
      
      const currentYear = new Date().getFullYear();
      setExpandedYears(prev => new Set([...prev, currentYear]));
      
      console.log(`🔄 [${handoffId}] HANDOFF: 🔟 EXPANDING YEAR`, { year: currentYear });
      
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

  // Mouse wheel zoom (only with Ctrl key held)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Only zoom if Ctrl key is pressed, otherwise allow normal scroll
      if (!e.ctrlKey) return;
      
      e.preventDefault();
      
      const delta = e.deltaY * -0.001;
      const currentZoom = zoomLevelRef.current;
      const currentPan = panOffsetRef.current;
      const newZoom = Math.min(Math.max(currentZoom + delta, 0.5), 2);
      
      if (newZoom !== currentZoom) {
        // Calculate zoom center based on mouse position
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Adjust pan to zoom towards mouse position
        const zoomRatio = newZoom / currentZoom;
        const newPanX = mouseX - (mouseX - currentPan.x) * zoomRatio;
        const newPanY = mouseY - (mouseY - currentPan.y) * zoomRatio;
        
        setZoomLevel(newZoom);
        setPanOffset({ x: newPanX, y: newPanY });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []); // Empty deps array - we use refs to avoid infinite loop

  // Mouse drag to pan (only with Space key held)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && e.shiftKey) { // Left mouse + Shift key
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleDeleteMemory = async (memoryId: string, memoryTitle: string) => {
    if (!confirm(`Delete "${memoryTitle}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('id', memoryId);

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

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
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
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
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
            <span className="text-xs text-muted-foreground font-light mr-2">
              Ctrl+Wheel to zoom • Shift+Drag to pan
            </span>
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
            {(zoomLevel !== 1 || panOffset.x !== 0 || panOffset.y !== 0) && (
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

      {/* Main Container with Two Panels */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)]">
        {/* Left: Timeline (60%) */}
        <div 
          ref={containerRef}
          className="relative overflow-auto lg:w-[60%] w-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className="max-w-4xl mx-auto px-8 py-16 transition-transform duration-100 ease-out"
            style={{ 
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: '0 0',
              cursor: isDragging ? 'grabbing' : 'default',
              userSelect: isDragging ? 'none' : 'auto'
            }}
          >
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
          <div className="relative space-y-8 animate-fade-in">
            {/* Timeline Line with dots */}
            <div className="absolute left-8 top-0 w-px bg-gradient-to-b from-primary/30 via-primary/20 to-primary/10 h-full" />

            {/* Timeline Content */}
            {timelineData.map((yearData) => {
              const isMajorYear = yearData.significance === 'major';
              const yearSize = isMajorYear ? 'text-3xl' : 'text-2xl';
              const markerSize = isMajorYear ? 'w-4 h-4' : 'w-3 h-3';
              const spacing = isMajorYear ? 'mb-6' : 'mb-4';
              
              return (
                <div key={yearData.year} className={`relative ${isMajorYear ? 'my-12' : 'my-8'}`}>
                  {/* Year Marker - Minimalist dot */}
                  <div className={`absolute left-[26px] top-2 ${markerSize} rounded-full ${
                    isMajorYear 
                      ? 'bg-primary shadow-lg shadow-primary/40' 
                      : 'bg-primary/60 shadow-md shadow-primary/20'
                  } transition-all duration-300`} />

                  <div className="ml-24 space-y-4">
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
                        <div key={eventIndex} className="space-y-2 mb-4 animate-fade-in">
                          <div className="text-2xl font-light text-foreground flex items-center gap-3">
                            {event.event}
                            {event.location && (
                              <div className="flex items-center gap-2 text-base text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                {event.location}
                              </div>
                            )}
                          </div>
                          {event.date && (
                            <div className="text-xs text-muted-foreground flex items-center gap-2 font-light">
                              <Calendar className="w-3 h-3" />
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
                      <div className="space-y-3 animate-scale-in">
                        {yearData.memories.map((memory) => {
                          const isMajorMemory = memory.significance === 'major';
                          return (
                            <Card
                              key={memory.id}
                              className={`timeline-card transition-all duration-500 cursor-pointer ${
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
                              onClick={() => setSelectedMemory(memory)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-white/60 flex items-center gap-2 flex-wrap font-light mb-2">
                                      <Calendar className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">
                                        {new Date(memory.memory_date || memory.created_at || memory.date).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </span>
                                      {memory.memory_location && (
                                        <>
                                          <span className="mx-1">•</span>
                                          <MapPin className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{memory.memory_location}</span>
                                        </>
                                      )}
                                    </div>
                                    <h3 className="text-base font-light text-white line-clamp-2">
                                      {memory.title}
                                    </h3>
                                  </div>
                                  
                                  <div className="flex gap-1 flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditMemory(memory.id);
                                      }}
                                      title="View details"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-white/60 hover:text-red-400 hover:bg-red-400/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMemory(memory.id, memory.title);
                                      }}
                                      title="Delete memory"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
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

        {/* Right: Story Map (40%) */}
        <div className="lg:w-[40%] w-full lg:border-l-[1.5px] border-section-border bg-background p-8 lg:sticky lg:top-[60px] lg:h-[calc(100vh-60px)] overflow-auto">
          <StoryMap memories={timelineMemories} profile={timelineProfile} />
        </div>
      </div>

      {/* Memory Detail Dialog */}
      {selectedMemory && (
        <MemoryDetailDialog
          memory={selectedMemory}
          open={!!selectedMemory}
          onOpenChange={(open) => !open && setSelectedMemory(null)}
          onUpdate={fetchTimelineData}
        />
      )}
    </div>
  );
};

export default Timeline;
