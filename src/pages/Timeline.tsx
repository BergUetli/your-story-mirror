import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// Extend window interface for scroll timeout
declare global {
  interface Window {
    scrollTimeout: number;
  }
}
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, MapPin, Calendar, ZoomIn, ZoomOut, RefreshCw, Trash2, Edit, Plus, ChevronUp, ChevronDown, Play, Pause, Search } from 'lucide-react';
import { EnhancedVoiceSearch } from '@/components/EnhancedVoiceSearch';
import { Link } from 'react-router-dom';
import { useMemories } from '@/hooks/useMemories';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MemoryDetailDialog } from '@/components/MemoryDetailDialog';
import { TimelineMemoryCard } from '@/components/TimelineMemoryCard';
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

// LABEL OVERLAP CHECKER MODULE - Use this for ALL timeline sizing decisions
const checkLabelOverlaps = (timelineData: any[], totalYears: number, baseHeight: number, minGap: number = 50) => {
  if (timelineData.length <= 1) {
    return { hasOverlaps: false, expansionNeeded: 1, details: [] };
  }

  const pixelsPerYear = baseHeight / totalYears;
  const sortedYears = [...timelineData].sort((a, b) => a.year - b.year);
  const overlaps = [];
  let maxExpansionNeeded = 1;

  console.log(`🔍 LABEL OVERLAP CHECK: Base height ${baseHeight}px, ${pixelsPerYear.toFixed(1)}px per year, min gap ${minGap}px`);

  for (let i = 0; i < sortedYears.length - 1; i++) {
    const current = sortedYears[i];
    const next = sortedYears[i + 1];
    const yearGap = next.year - current.year;
    const pixelGap = yearGap * pixelsPerYear;

    if (pixelGap < minGap) {
      const expansionNeeded = minGap / pixelGap;
      maxExpansionNeeded = Math.max(maxExpansionNeeded, expansionNeeded);
      overlaps.push({
        currentYear: current.year,
        nextYear: next.year,
        yearGap,
        pixelGap: Math.round(pixelGap),
        needed: Math.round(expansionNeeded * 100) / 100
      });
      console.log(`❌ OVERLAP: ${current.year}-${next.year} gap=${Math.round(pixelGap)}px < ${minGap}px (needs ${Math.round((expansionNeeded - 1) * 100)}% expansion)`);
    } else {
      console.log(`✅ OK: ${current.year}-${next.year} gap=${Math.round(pixelGap)}px ≥ ${minGap}px`);
    }
  }

  const result = {
    hasOverlaps: overlaps.length > 0,
    expansionNeeded: maxExpansionNeeded,
    details: overlaps,
    finalHeight: baseHeight * maxExpansionNeeded
  };

  console.log(`📊 OVERLAP SUMMARY: ${overlaps.length} overlaps, expansion needed: ${Math.round((maxExpansionNeeded - 1) * 100)}%, final: ${Math.round(result.finalHeight)}px`);
  return result;
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
    
    // Only include years with significant events or current year
    // Birth year is always significant, other years need major events/memories
    const isSignificantYear = year === birthYear || // Always show birth year
                             year === currentYear || // Always show current year
                             hasMajorEvents; // Show years with major events/memories
    
    if (isSignificantYear && (yearEvents.length > 0 || yearMemories.length > 0 || year === currentYear || year === birthYear)) {
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
  
  // Scroll state for modern scroll indicators
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showScrollControls, setShowScrollControls] = useState(false);
  
  const { memories, loadMemories, isLoading } = useMemories();
  const { profile, loading: profileLoading } = useProfile();
  
  // Fetch timeline data through orchestrator for optimized performance
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

  // Poll for updates every 5 seconds when on timeline page (more frequent for testing)
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
  
  // For now, let's remove the auto-expansion status to focus on the working collision detection
  // The collision detection itself is working perfectly as shown in console logs

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
  
  // Auto-expand ALL years with memories on initial load (not just significant ones)
  // Use a flag to prevent re-expansion
  const hasInitializedExpansion = useRef(false);
  
  useEffect(() => {
    if (!timelineLoading && timelineData.length > 0 && !hasInitializedExpansion.current) {
      const yearsWithAnyContent = timelineData
        .filter(y => 
          y.memories.length > 0 || // Expand ANY year with memories
          y.events.length > 0 ||   // Always expand years with life events (like birth)
          y.significance === 'major'
        )
        .map(y => y.year);
      console.log('🔄 Timeline: Auto-expanding all years with content:', yearsWithAnyContent);
      console.log('🔄 Timeline: Timeline data details:', timelineData.map(y => ({
        year: y.year,
        memoriesCount: y.memories.length,
        eventsCount: y.events.length,
        significance: y.significance,
        memories: y.memories.map(m => ({ title: m.title, significance: m.significance }))
      })));
      if (yearsWithAnyContent.length > 0) {
        setExpandedYears(new Set(yearsWithAnyContent));
        hasInitializedExpansion.current = true;
      }
    }
  }, [timelineLoading, timelineData]);

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
        
        // Expand the year containing the memory
        setExpandedYears(prev => new Set([...prev, foundYear]));
        
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
  }, [timelineLoading, timelineData]);

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

  // Scroll handling for progress indicator
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight - container.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    
    setScrollProgress(progress);
    setShowScrollControls(scrollTop > 100); // Show controls after scrolling 100px
    
    // Set scrolling state for visual feedback
    setIsScrolling(true);
    clearTimeout(window.scrollTimeout);
    window.scrollTimeout = window.setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  };

  // Smooth scroll functions
  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    const container = containerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  };

  const scrollToYear = (year: number) => {
    const yearElement = document.querySelector(`[data-year="${year}"]`);
    if (yearElement && containerRef.current) {
      const container = containerRef.current;
      const elementTop = yearElement.getBoundingClientRect().top;
      const containerTop = container.getBoundingClientRect().top;
      const scrollPosition = container.scrollTop + (elementTop - containerTop) - 100; // 100px offset
      
      container.scrollTo({ top: scrollPosition, behavior: 'smooth' });
    }
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
            {/* Voice Search */}
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

      {/* Main Container - Full Width Timeline */}
      <div className="h-[calc(100vh-60px)]">
        {/* Timeline - Full Width */}
        <div 
          ref={containerRef}
          className="relative overflow-auto w-full modern-scrollbar"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onScroll={handleScroll}
          style={{
            scrollBehavior: 'smooth',
          }}
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
          (() => {
            // Shared variables for timeline calculations
            const sharedBirthYear = timelineProfile?.birth_date 
              ? new Date(timelineProfile.birth_date).getFullYear() 
              : timelineData[0]?.year || new Date().getFullYear();
            
            return (
          <div 
            className="relative animate-fade-in"
            style={{
              minHeight: (() => {
                // FULL PAGE DEFAULT: Always start with one full page height minimum
                const currentYear = new Date().getFullYear();
                const sharedBirthYear = timelineProfile?.birth_date 
                  ? new Date(timelineProfile.birth_date).getFullYear() 
                  : timelineData[0]?.year || new Date().getFullYear();
                const totalYears = currentYear - sharedBirthYear;
                
                // ALWAYS ONE PAGE MINIMUM: Ensure timeline fills viewport height
                const viewportHeight = window.innerHeight - 200;
                const baseHeight = Math.max(viewportHeight * 0.9, 800); // Always at least 90% of screen or 800px minimum
                
                // Use dedicated overlap checker module with generous spacing for readability
                const overlapCheck = checkLabelOverlaps(timelineData, totalYears, baseHeight, 80);
                
                console.log(`🎯 FULL PAGE TIMELINE: ${Math.round(baseHeight)}px → ${Math.round((overlapCheck as any).finalHeight)}px (${Math.round((overlapCheck as any).finalHeight / viewportHeight * 100)}% of screen)`);
                
                return (overlapCheck as any).finalHeight;
              })()
            }}
          >
            {(() => {
              // POSITIONING: Use same overlap checker for consistent results
              const currentYear = new Date().getFullYear();
              const totalYears = currentYear - sharedBirthYear;
              const viewportHeight = window.innerHeight - 200;
              
              // Same logic as container: Start with full page, use overlap checker with generous spacing
              const baseHeight = Math.max(viewportHeight * 0.9, 800);
              const overlapCheck = checkLabelOverlaps(timelineData, totalYears, baseHeight, 80);
              
              // Final sizing - guaranteed to match container
              const pixelsPerYear = (overlapCheck as any).finalHeight / totalYears;
              const totalHeight = (overlapCheck as any).finalHeight;

              return (
                <>
                  {/* Timeline Line - centered */}
                  <div 
                    className="absolute left-1/4 top-0 w-1 bg-black"
                    style={{ height: `${totalHeight}px` }}
                  />

                  {/* Timeline Content with proportional spacing - CHRONOLOGICAL ORDER */}
                  {timelineData
                    .sort((a, b) => a.year - b.year) // Sort chronologically: earliest year first (birth to current)
                    .map((yearData, index) => {
                    const isMajorYear = yearData.significance === 'major';
                    // Consistent font size for all years for better alignment
                    const yearSize = 'text-2xl'; // Same size for all years
                    const markerSize = isMajorYear ? 'w-4 h-4' : 'w-3 h-3';
                    const spacing = isMajorYear ? 'mb-6' : 'mb-4';
                    
                    // Position proportionally from birth year (top) to current year (bottom)
                    const yearsFromBirth = yearData.year - sharedBirthYear;
                    let topPosition = (yearsFromBirth * pixelsPerYear) + 50; // Start 50px from top
                    
                    // Anchor birth year at the top
                    if (yearData.year === sharedBirthYear) {
                      topPosition = 50; // Fixed at top with small margin
                    }
                    
                    // Anchor current year at the bottom
                    if (yearData.isCurrentYear) {
                      topPosition = totalHeight - 150; // Fixed at bottom with margin for content
                    }
                    
                    return (
                      <div 
                        key={yearData.year} 
                        className="absolute left-0 right-0"
                        style={{ top: `${topPosition}px` }}
                        data-year={yearData.year}
                       >
                        {/* Year Marker - Aligned with year labels */}
                        <div 
                          className={`absolute ${markerSize} rounded-full ${
                            isMajorYear 
                              ? 'bg-black shadow-lg' 
                              : 'bg-black/80 shadow-md'
                          } transition-all duration-300`}
                          style={{
                            left: 'calc(25% - 8px)', // Center on timeline
                            top: '16px' // Align with year labels (12px + 4px for centering)
                          }}
                        />

                        {/* Left Side: Year Label - Vertically aligned with right content */}
                        <div 
                          className="absolute right-[76%] pr-4 cursor-pointer group flex flex-col items-end justify-start"
                          onClick={() => toggleYear(yearData.year)}
                          style={{ top: '12px' }} // Move year labels significantly lower to align with content baseline
                        >
                          <h2 className={`${yearSize} font-light text-right text-foreground group-hover:text-primary transition-colors leading-none font-mono tabular-nums`}>
                            {yearData.year}
                          </h2>

                          {yearData.isCurrentYear && (
                            <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full inline-block mt-1 whitespace-nowrap">
                              17th October 2025
                            </span>
                          )}
                        </div>

                        {/* Right Side: Content - Aligned with year labels */}
                        <div className="ml-[26%] pl-12 space-y-2 flex flex-col justify-start" style={{ paddingTop: '0px' }}>
                          {/* Life Events (Birth) - Compact layout */}
                          {yearData.events.map((event, eventIndex) => (
                            <div key={eventIndex} className="space-y-1 mb-2 animate-fade-in">
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
                                  <div className="flex items-center gap-1 font-light">
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
                          
                          {/* Show message for current year if no memories yet */}
                          {yearData.isCurrentYear && yearData.memories.length === 0 && yearData.events.length === 0 && (
                            <p className="text-sm text-muted-foreground italic animate-pulse font-light">
                              Start recording memories to fill your timeline...
                            </p>
                          )}

                          {/* Memory Content - Always show memories if they exist */}
                          {yearData.memories.length > 0 && (
                            <div 
                              className={`animate-scale-in ${yearData.events.length > 0 ? 'mt-8' : 'mt-4'}`}
                              style={{
                                position: 'relative',
                                minHeight: yearData.memories.length > 1 ? '120px' : '60px' // Extra height for stacked memories
                              }}
                            >
                              {yearData.memories.map((memory, memoryIndex) => {
                                const isMajorMemory = memory.significance === 'major';
                                
                                // Calculate stacking offset for multiple memories in same year
                                const isStacked = yearData.memories.length > 1;
                                const stackOffset = isStacked ? memoryIndex * 16 : 0; // 16px horizontal offset for each subsequent memory
                                const verticalOffset = isStacked ? memoryIndex * 8 : 0; // 8px vertical offset for visual depth
                                
                                return (
                                  <div 
                                    key={memory.id} 
                                    className="absolute timeline-card transition-all duration-300"
                                    style={{
                                      left: `${stackOffset}px`,
                                      top: `${verticalOffset}px`,
                                      zIndex: yearData.memories.length - memoryIndex, // First memory on top, others stacked behind
                                      width: isStacked ? 'calc(100% - 32px)' : '100%', // Slightly narrower when stacked
                                    }}
                                  >
                                    <TimelineMemoryCard
                                      memory={memory}
                                      artifact={memoryArtifacts[memory.id] || null}
                                      onClick={() => setSelectedMemory(memory)}
                                      isMaterializing={materializingMemory === memory.id}
                                      hasVoiceRecording={memoryVoiceRecordings.has(memory.id)}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
            );
          })()
        )}
          </div>
        </div>

        {/* Modern Scroll Indicators and Controls */}
        {timelineData.length > 0 && (
          <>
            {/* Scroll Progress Bar */}
            <div className="fixed left-0 top-[60px] w-1 h-[calc(100vh-60px)] bg-muted/20 z-40 lg:block hidden">
              <div 
                className={`w-full bg-gradient-to-b from-primary/60 to-primary transition-all duration-300 ${
                  isScrolling ? 'shadow-lg shadow-primary/20' : ''
                }`}
                style={{ height: `${scrollProgress}%` }}
              />
            </div>

            {/* Floating Scroll Controls */}
            {showScrollControls && (
              <div className="fixed right-6 bottom-6 flex flex-col gap-2 z-50 animate-fade-in">
                {/* Year Quick Navigation */}
                <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
                  <div className="text-xs text-muted-foreground mb-2 px-2">Jump to:</div>
                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto mini-scrollbar">
                    {timelineData
                      .slice()
                      .sort((a, b) => b.year - a.year) // Reverse chronological for navigation (newest first)
                      .map((yearData) => (
                      <Button
                        key={yearData.year}
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 justify-start px-2 hover:bg-primary/10 font-mono tabular-nums"
                        onClick={() => scrollToYear(yearData.year)}
                      >
                        {yearData.year}
                        {yearData.memories.length > 0 && (
                          <span className="ml-auto text-primary">•</span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Scroll Direction Controls */}
                <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-1 shadow-lg flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-primary/10"
                    onClick={scrollToTop}
                    title="Scroll to top"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-primary/10"
                    onClick={scrollToBottom}
                    title="Scroll to bottom"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Scroll Progress Indicator (mobile) */}
            <div className="fixed bottom-0 left-0 right-0 h-1 bg-muted/20 z-40 lg:hidden">
              <div 
                className={`h-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-300 ${
                  isScrolling ? 'shadow-lg shadow-primary/20' : ''
                }`}
                style={{ width: `${scrollProgress}%` }}
              />
            </div>
          </>
        )}

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

      {/* Enhanced Voice Search Dialog */}
      <EnhancedVoiceSearch
        open={showVoiceSearch}
        onOpenChange={setShowVoiceSearch}
      />
    </div>
  );
};

export default Timeline;
