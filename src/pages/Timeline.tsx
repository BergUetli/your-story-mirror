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
  const birthYear = profile?.birth_date ? new Date(profile.birth_date).getFullYear() : currentYear - 25;
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
        .order('created_at', { ascending: false });

      if (memoriesError) throw memoriesError;

      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) console.error('Profile error:', profileError);
      
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
    loadMemories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const timelineData = useMemo(() => {
    return createTimelineData(timelineMemories, timelineProfile || profile);
  }, [timelineMemories, timelineProfile, profile]);

  // Transform to react-chrono format
  const chronoItems = useMemo(() => {
    return timelineData.map((yearData) => ({
      title: yearData.year.toString(),
      cardTitle: yearData.events.map(e => e.event).join(', ') || 
                 (yearData.memories.length > 0 ? `${yearData.memories.length} ${yearData.memories.length === 1 ? 'Memory' : 'Memories'}` : ''),
      cardSubtitle: yearData.isCurrentYear ? new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '',
      cardDetailedText: yearData.memories.map(m => m.title).join(' • '),
      yearData,
    }));
  }, [timelineData]);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card sticky top-0 z-50">
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

      <div className="h-[calc(100vh-60px)] overflow-auto">
        {profileLoading || isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground animate-pulse">Loading timeline...</div>
          </div>
        ) : timelineData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-6">
            <div className="space-y-2">
              <p className="text-2xl font-medium">No memories yet</p>
              <p className="text-base text-muted-foreground max-w-md">
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
          <div className="w-full max-w-6xl mx-auto py-8 px-4" style={{ minHeight: '80vh' }}>
            <Chrono
              items={chronoItems}
              mode="VERTICAL"
              scrollable={{ scrollbar: false }}
              hideControls={false}
              cardHeight={150}
              theme={{
                primary: '#3b82f6',
                secondary: '#f3f4f6',
                cardBgColor: '#ffffff',
                cardForeColor: '#1f2937',
                titleColor: '#1f2937',
                titleColorActive: '#3b82f6',
              }}
              fontSizes={{
                cardSubtitle: '0.875rem',
                cardText: '0.875rem',
                cardTitle: '1.125rem',
                title: '1.25rem',
              }}
              classNames={{
                card: 'shadow-md border border-gray-200',
                cardMedia: 'rounded-t-lg',
                cardSubTitle: 'text-gray-600',
                cardText: 'text-gray-700',
                cardTitle: 'font-semibold text-gray-900',
                title: 'font-bold',
              }}
            >
              {chronoItems.map((item, index) => (
                <div key={index} className="space-y-3 p-4 bg-white">
                  {item.yearData.events.map((event: any, eventIndex: number) => (
                    <div key={eventIndex} className="space-y-1 mb-3">
                      <div className="text-base font-semibold text-gray-900">{event.event}</div>
                      {event.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {item.yearData.memories.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {item.yearData.memories.map((memory: any) => (
                        <button
                          key={memory.id}
                          onClick={() => setSelectedMemory(memory)}
                          className="w-full text-left p-3 rounded-lg border-2 border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        >
                          <div className="font-semibold text-sm text-gray-900">{memory.title}</div>
                          {memory.text && (
                            <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {memory.text}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {new Date(memory.created_at).toLocaleDateString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </Chrono>
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
