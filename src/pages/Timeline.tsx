import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Chrono } from 'react-chrono';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Plus, MapPin, Calendar } from 'lucide-react';
import { EnhancedVoiceSearch } from '@/components/EnhancedVoiceSearch';
import { Link } from 'react-router-dom';
import { useMemories } from '@/hooks/useMemories';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MemoryDetailDialog } from '@/components/MemoryDetailDialog';
import { getSignedUrl } from '@/lib/storage';

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
      event: `Born in ${birthPlace}`, 
      type: 'milestone',
      significance: 'major' as const,
      location: birthPlace,
      date: profile.birth_date || `${birthYear}-01-01`
    }
  ];
};

// Create timeline data
const createTimelineData = (actualMemories: any[], profile: any) => {
  const currentYear = new Date().getFullYear();
  
  // Always use birth_date or age from profile (birth date is collected during signup)
  let birthYear: number | undefined;
  if (profile?.birth_date) {
    const bd = String(profile.birth_date);
    const match = bd.match(/^(\d{4})/);
    if (match) {
      birthYear = parseInt(match[1], 10);
    } else {
      const d = new Date(bd);
      if (!isNaN(d.getTime())) birthYear = d.getFullYear();
    }
  } else if (typeof profile?.age === 'number' && isFinite(profile.age)) {
    birthYear = currentYear - profile.age;
  }
  
  // If no birth info, fall back to earliest memory year or current year
  if (!birthYear) {
    const earliestMemory = actualMemories
      .map(m => m.memory_date || m.created_at || m.date)
      .filter(Boolean)
      .map((d: string) => new Date(d))
      .filter((d: Date) => !isNaN(d.getTime()))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];
    birthYear = earliestMemory ? earliestMemory.getFullYear() : currentYear - 40;
    if (birthYear > currentYear) birthYear = currentYear;
    if (birthYear < 1900) birthYear = 1900;
  }
  
  const timelineData = [];
  console.info('📅 Timeline start year computed:', birthYear, 'currentYear:', currentYear);
  
  const lifeEvents = generateLifeEvents(profile);
  
  for (let year = birthYear; year <= currentYear; year++) {
    const yearEvents = lifeEvents.filter(event => event.year === year);
    const yearMemories = actualMemories.filter(memory => {
      const dateToUse = memory.memory_date || memory.created_at || memory.date;
      if (!dateToUse) return false;
      
      const parsedDate = new Date(dateToUse);
      if (isNaN(parsedDate.getTime())) return false;
      
      return parsedDate.getFullYear() === year;
    }).map(memory => ({
      ...memory,
      significance: detectEventSignificance(memory)
    }));
    
    const hasMajorEvents = yearMemories.some(m => m.significance === 'major');
    
    const hasAnyContent = yearMemories.length > 0;
    
    // Include only years that have memories
    if (hasAnyContent) {
      timelineData.push({
        year,
        events: [],
        memories: yearMemories,
        hasContent: hasAnyContent,
        isCurrentYear: false,
        significance: hasMajorEvents ? 'major' : 'minor'
      });
    }
  }
  
  return timelineData;
};

const Timeline = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMemory, setSelectedMemory] = useState<any | null>(null);
  
  const { memories, loadMemories, isLoading } = useMemories();
  const { profile, loading: profileLoading } = useProfile();
  
  const [timelineMemories, setTimelineMemories] = useState<any[]>([]);
  const [timelineProfile, setTimelineProfile] = useState<any>(null);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [memoryArtifacts, setMemoryArtifacts] = useState<Map<string, any>>(new Map());
  
  const [showVoiceSearch, setShowVoiceSearch] = useState(false);

  const fetchTimelineData = useCallback(async () => {
    const userId = user?.id || '00000000-0000-0000-0000-000000000000';

    try {
      setTimelineLoading(true);
      
      const { data: memories, error: memoriesError } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId)
        .or('is_primary_chunk.is.true,is_primary_chunk.is.null')
        .order('created_at', { ascending: false });

      if (memoriesError) throw memoriesError;

      // Fetch from users table which has birth_date and birth_place
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('birth_date,birth_place,age')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      // Also fetch user_profiles for additional data
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (userError) console.error('User profile error:', userError);
      if (profileError) console.error('Profile error:', profileError);
      
      console.info('👤 Timeline profile sources:', { userProfile, profiles });
      
      // Combine data, prioritizing users table for birth info
      const combinedProfile = {
        ...profiles,
        ...userProfile,
        birth_date: userProfile?.birth_date || profiles?.birth_date,
        birth_place: userProfile?.birth_place || profiles?.hometown || profiles?.location,
        age: userProfile?.age || profiles?.age,
      };
      
      // Calculate birth_date from age if not provided
      if (combinedProfile.age && !combinedProfile.birth_date) {
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - combinedProfile.age;
        combinedProfile.birth_date = `${birthYear}-01-01`;
      }
      
      const completeMemories = (memories || []).filter((m: any) => !!m.title && !!m.text && !!(m.memory_date || m.created_at || m.date));
      console.info('📊 Timeline memories loaded:', completeMemories.length, 'complete memories');
      
      // Fetch artifacts for all memories
      const memoryIds = completeMemories.map((m: any) => m.id);
      if (memoryIds.length > 0) {
        const { data: artifactLinks, error: artifactError } = await supabase
          .from('memory_artifacts')
          .select('memory_id, artifact_id, artifacts(id, artifact_type, storage_path)')
          .in('memory_id', memoryIds);
        
        if (!artifactError && artifactLinks) {
          const artifactMap = new Map();
          
          // Group artifacts by memory_id and fetch signed URLs for visual artifacts only
          for (const link of artifactLinks) {
            const artifact = (link as any).artifacts;
            const memoryId = (link as any).memory_id;
            
            // Only process image and video artifacts (exclude text/documents)
            if (artifact && (artifact.artifact_type === 'image' || artifact.artifact_type === 'video') && artifact.storage_path) {
              const signedUrl = await getSignedUrl('memory-images', artifact.storage_path, 3600);
              if (signedUrl) {
                if (!artifactMap.has(memoryId)) {
                  artifactMap.set(memoryId, []);
                }
                artifactMap.get(memoryId).push({
                  ...artifact,
                  signedUrl
                });
              }
            }
          }
          
          setMemoryArtifacts(artifactMap);
        }
      }
      
      setTimelineMemories(completeMemories);
      console.info('🧬 Combined profile for timeline:', { combinedProfile });
      setTimelineProfile(combinedProfile);
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
    loadMemories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const timelineData = useMemo(() => {
    return createTimelineData(timelineMemories, timelineProfile || profile);
  }, [timelineMemories, timelineProfile, profile]);

  // Transform to react-chrono nested format
  const chronoItems = useMemo(() => {
    // Compute birth info for marker-only item
    const p: any = timelineProfile || profile || {};
    let birthYear: number | undefined;
    if (p?.birth_date) {
      const bd = String(p.birth_date);
      const match = bd.match(/^(\d{4})/);
      if (match) birthYear = parseInt(match[1], 10);
      else {
        const d = new Date(bd);
        if (!isNaN(d.getTime())) birthYear = d.getFullYear();
      }
    } else if (typeof p?.age === 'number' && isFinite(p.age)) {
      birthYear = new Date().getFullYear() - p.age;
    }
    const birthPlace = p?.birth_place || p?.hometown || p?.location || '';

    const yearsWithMemories = new Set(timelineData.map((y: any) => y.year));

    const items = timelineData.map((yearData) => {
      const nestedItems: any[] = [];

      // Inject a lightweight Birth marker inside the birth year bucket
      if (birthYear && yearData.year === birthYear) {
        const bdTitle = p?.birth_date
          ? new Date(p.birth_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'Jan 1';
        nestedItems.push({
          title: bdTitle,
          cardTitle: 'Birth',
          cardSubtitle: birthPlace ? `Born in ${birthPlace}` : '',
          cardDetailedText: '',
          metadata: { isBirth: true }
        });
      }

      // Add memories as nested items
      yearData.memories.forEach((memory: any) => {
        const memoryDate = new Date(memory.memory_date || memory.created_at);
        
        const item: any = {
          title: memoryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          cardTitle: memory.title,
          cardSubtitle: memory.text ? memory.text.substring(0, 100) + (memory.text.length > 100 ? '...' : '') : '',
          metadata: { memoryId: memory.id, isMemory: true, fullMemory: memory }
        };
        
        nestedItems.push(item);
      });

      // Build card title based on content
      const cardTitle = `${yearData.memories.length} ${yearData.memories.length === 1 ? 'Memory' : 'Memories'}`;

      return {
        title: yearData.year.toString(),
        cardTitle,
        cardSubtitle: '',
        items: nestedItems.length > 0 ? nestedItems : undefined,
      };
    });

    // If there are no memories in the birth year, add a small standalone Birth marker item
    if (birthYear && !yearsWithMemories.has(birthYear)) {
      items.unshift({
        title: String(birthYear),
        cardTitle: 'Birth',
        cardSubtitle: birthPlace ? `Born in ${birthPlace}` : '',
        items: [],
      });
    }

    return items;
  }, [timelineData, timelineProfile, profile, memoryArtifacts]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b border-border bg-card sticky top-0 z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-lg sm:text-xl font-semibold">Timeline</h1>
            <Link to="/timeline-orbit">
              <Button variant="outline" size="sm">
                3D View
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVoiceSearch(true)}
              className="text-xs"
            >
              🎤 <span className="hidden sm:inline ml-1">Voice</span>
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

      <div className="flex-1 overflow-auto">
        {profileLoading || isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground animate-pulse">Loading timeline...</div>
          </div>
        ) : timelineData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-6 px-4">
            <div className="space-y-2">
              <p className="text-xl sm:text-2xl font-medium">No memories yet</p>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                Start preserving your life stories
              </p>
            </div>
            <Link to="/add-memory">
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Memory
              </Button>
            </Link>
          </div>
        ) : (
          <div className="w-full py-12 px-4" style={{ 
            maxWidth: '1400px', 
            margin: '0 auto',
          }}>
            <style>
              {`
                /* Fix react-chrono layout issues */
                .react-chrono-wrapper {
                  width: 100% !important;
                }
                
                /* Ensure proper spacing */
                [data-testid="timeline-main-wrapper"] {
                  padding: 12px 0 !important;
                }
                
                /* Enhanced Card Styling - Apple/Google Photos inspired */
                [class*="timeline-card-content"] {
                  padding: 16px !important;
                  margin: 12px 0 !important;
                  min-height: 100px !important;
                  border-radius: 12px !important;
                  background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(249,250,251,0.95)) !important;
                  border: 1px solid rgba(229, 231, 235, 0.6) !important;
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06) !important;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }
                
                /* Enhanced hover state */
                [class*="timeline-card-content"]:hover {
                  transform: translateY(-4px) scale(1.01) !important;
                  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04) !important;
                  border-color: rgba(59, 130, 246, 0.4) !important;
                }
                
                /* Card titles - better typography */
                [class*="timeline-card-content"] [class*="card-title"] {
                  font-size: 1rem !important;
                  font-weight: 600 !important;
                  color: #111827 !important;
                  margin-bottom: 6px !important;
                  line-height: 1.4 !important;
                }
                
                /* Card subtitles */
                [class*="timeline-card-content"] [class*="card-sub-title"] {
                  font-size: 0.875rem !important;
                  color: #6b7280 !important;
                  line-height: 1.5 !important;
                }
                
                /* Year labels - enhanced styling */
                [class*="timeline-title"] {
                  font-size: 1rem !important;
                  font-weight: 700 !important;
                  padding: 6px 14px !important;
                  background: linear-gradient(135deg, #ffffff, #f9fafb) !important;
                  border: 1.5px solid rgba(59, 130, 246, 0.2) !important;
                  border-radius: 10px !important;
                  margin: 14px 0 !important;
                  white-space: nowrap !important;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
                  color: #1f2937 !important;
                }
                
                /* Timeline line enhancement */
                [class*="timeline-vertical-circle"] {
                  margin: 14px 0 !important;
                  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15) !important;
                }
                
                /* Timeline dots */
                [class*="timeline-circle"] {
                  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2) !important;
                }
                
                /* Nested items enhancement */
                [class*="nested-card"] {
                  border-radius: 10px !important;
                  background: rgba(255, 255, 255, 0.95) !important;
                  border: 1px solid rgba(229, 231, 235, 0.5) !important;
                  margin: 8px 0 !important;
                  padding: 12px !important;
                  transition: all 0.2s ease !important;
                }
                
                [class*="nested-card"]:hover {
                  transform: translateX(4px) !important;
                  border-color: rgba(59, 130, 246, 0.3) !important;
                  background: rgba(255, 255, 255, 1) !important;
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06) !important;
                }
                
                /* Responsive adjustments */
                @media (max-width: 768px) {
                  [class*="timeline-card-content"] {
                    font-size: 0.875rem !important;
                    padding: 14px !important;
                  }
                  
                  [class*="timeline-title"] {
                    font-size: 0.9rem !important;
                    padding: 5px 12px !important;
                  }
                  
                  [class*="timeline-card-content"] [class*="card-title"] {
                    font-size: 0.9375rem !important;
                  }
                }
              `}
            </style>
            <Chrono
              items={chronoItems}
              mode="VERTICAL"
              scrollable={true}
              hideControls={false}
              cardHeight={110}
              nestedCardHeight={130}
              disableClickOnCircle={false}
              useReadMore={false}
              onItemSelected={(item) => {
                // Handle nested item clicks
                const selectedItem = chronoItems[item.index];
                if (selectedItem?.items?.[item.nestedIndex || 0]) {
                  const nestedItem = selectedItem.items[item.nestedIndex || 0];
                  if (nestedItem.metadata?.isMemory && nestedItem.metadata?.fullMemory) {
                    setSelectedMemory(nestedItem.metadata.fullMemory);
                  }
                }
              }}
              theme={{
                primary: '#3b82f6',
                secondary: '#f9fafb',
                cardBgColor: 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(249,250,251,0.95))',
                cardForeColor: '#111827',
                titleColor: '#1f2937',
                titleColorActive: '#3b82f6',
                cardBorderRadius: '12px',
              }}
              fontSizes={{
                cardSubtitle: '0.8rem',
                cardText: '0.8rem',
                cardTitle: '0.95rem',
                title: '0.9rem',
              }}
            />
          </div>
        )}
      </div>

      {selectedMemory && (
        <MemoryDetailDialog
          memory={selectedMemory}
          open={!!selectedMemory}
          onOpenChange={(open) => !open && setSelectedMemory(null)}
          onUpdate={fetchTimelineData}
        />
      )}

      <EnhancedVoiceSearch
        open={showVoiceSearch}
        onOpenChange={setShowVoiceSearch}
      />
    </div>
  );
};

export default Timeline;
