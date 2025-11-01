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
    birthYear = earliestMemory ? earliestMemory.getFullYear() : currentYear;
  }
  
  const timelineData = [];
  
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
    
    const hasMajorEvents = yearEvents.some(e => e.significance === 'major') || 
                          yearMemories.some(m => m.significance === 'major');
    
    const hasAnyContent = yearEvents.length > 0 || yearMemories.length > 0;
    
    // Only include years with actual content, birth year, or current year
    // No empty placeholders - timeline scales naturally
    if (year === birthYear || year === currentYear || hasAnyContent) {
      timelineData.push({
        year,
        events: yearEvents,
        memories: yearMemories,
        hasContent: hasAnyContent,
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
  const [selectedMemory, setSelectedMemory] = useState<any | null>(null);
  
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
        .eq('is_primary_chunk', true)
        .order('created_at', { ascending: false });

      if (memoriesError) throw memoriesError;

      // Fetch from users table which has birth_date and birth_place
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Also fetch user_profiles for additional data
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (userError) console.error('User profile error:', userError);
      if (profileError) console.error('Profile error:', profileError);
      
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
      
      setTimelineMemories(memories || []);
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
    return timelineData.map((yearData) => {
      const nestedItems = [];
      
      // Add events as nested items
      yearData.events.forEach((event: any) => {
        nestedItems.push({
          title: new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          cardTitle: event.event,
          cardSubtitle: event.location ? `📍 ${event.location}` : '',
          cardDetailedText: event.type === 'milestone' ? '🎉 Major Life Event' : '',
        });
      });
      
      // Add memories as nested items
      yearData.memories.forEach((memory: any) => {
        const memoryDate = new Date(memory.memory_date || memory.created_at);
        nestedItems.push({
          title: memoryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          cardTitle: memory.title,
          cardSubtitle: memory.text ? memory.text.substring(0, 100) + (memory.text.length > 100 ? '...' : '') : '',
          cardDetailedText: memory.text || '',
          metadata: { memoryId: memory.id, isMemory: true, fullMemory: memory }
        });
      });
      
      // Build card title based on content
      let cardTitle = '';
      if (yearData.events.length > 0) {
        cardTitle = yearData.events.map(e => e.event).join(', ');
      } else if (yearData.memories.length > 0) {
        cardTitle = `${yearData.memories.length} ${yearData.memories.length === 1 ? 'Memory' : 'Memories'}`;
      } else if (yearData.isCurrentYear) {
        cardTitle = 'Present';
      } else {
        cardTitle = 'No memories this year';
      }
      
      return {
        title: yearData.year.toString(),
        cardTitle,
        cardSubtitle: yearData.isCurrentYear ? 'Current year' : '',
        items: nestedItems.length > 0 ? nestedItems : undefined,
      };
    });
  }, [timelineData]);

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
                  padding: 20px 0 !important;
                }
                
                /* Card spacing */
                [class*="timeline-card-content"] {
                  padding: 16px !important;
                  margin: 10px 0 !important;
                  min-height: 120px !important;
                }
                
                /* Year labels - prevent overlap */
                [class*="timeline-title"] {
                  font-size: 1rem !important;
                  font-weight: 600 !important;
                  padding: 8px 12px !important;
                  background: white !important;
                  border: 2px solid #e5e7eb !important;
                  border-radius: 8px !important;
                  margin: 20px 0 !important;
                  white-space: nowrap !important;
                }
                
                /* Timeline line */
                [class*="timeline-vertical-circle"] {
                  margin: 20px 0 !important;
                }
                
                /* Responsive adjustments */
                @media (max-width: 768px) {
                  [class*="timeline-card-content"] {
                    font-size: 0.875rem !important;
                  }
                  
                  [class*="timeline-title"] {
                    font-size: 0.875rem !important;
                  }
                }
              `}
            </style>
            <Chrono
              items={chronoItems}
              mode="VERTICAL"
              scrollable={false}
              hideControls={false}
              cardHeight={150}
              nestedCardHeight={180}
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
                cardBgColor: '#ffffff',
                cardForeColor: '#111827',
                titleColor: '#1f2937',
                titleColorActive: '#3b82f6',
              }}
              fontSizes={{
                cardSubtitle: '0.875rem',
                cardText: '0.875rem',
                cardTitle: '1rem',
                title: '1rem',
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
