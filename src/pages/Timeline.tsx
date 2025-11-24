import { useState, useEffect, useCallback } from 'react';
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
import { getSignedUrl } from '@/lib/storage';
import { CustomTimeline } from '@/components/CustomTimeline';

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
      
      // Filter for complete memories with title, text, and memory_date specifically
      const completeMemories = (memories || []).filter((m: any) => {
        const hasTitle = !!m.title && m.title.trim().length > 0;
        const hasText = !!m.text && m.text.trim().length > 0;
        const hasMemoryDate = !!m.memory_date;
        
        if (!hasTitle || !hasText || !hasMemoryDate) {
          console.log('Filtering out incomplete memory:', {
            id: m.id,
            title: m.title,
            hasTitle,
            hasText,
            hasMemoryDate,
            memory_date: m.memory_date
          });
        }
        
        return hasTitle && hasText && hasMemoryDate;
      });
      console.info('📊 Timeline memories loaded:', completeMemories.length, 'complete memories out of', memories?.length || 0);
      
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

      <div className="flex-1 overflow-hidden">
        {profileLoading || isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground animate-pulse">Loading timeline...</div>
          </div>
        ) : timelineMemories.length === 0 ? (
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
          <CustomTimeline
            memories={timelineMemories}
            birthDate={timelineProfile?.birth_date || profile?.birth_date || null}
            memoryArtifacts={memoryArtifacts}
            onMemoryClick={setSelectedMemory}
          />
        )}
      </div>

      <EnhancedVoiceSearch
        open={showVoiceSearch}
        onOpenChange={setShowVoiceSearch}
      />
    </div>
  );
};

export default Timeline;
