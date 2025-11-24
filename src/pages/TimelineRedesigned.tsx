import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';
import { TimelineHero } from '@/components/timeline/TimelineHero';
import { TimelineNavigation } from '@/components/timeline/TimelineNavigation';
import { TimelineChapter } from '@/components/timeline/TimelineChapter';
import { MemoryDetailDialog } from '@/components/MemoryDetailDialog';

interface Memory {
  id: string;
  title: string;
  text: string;
  memory_date: string;
  memory_location?: string;
  tags?: string[];
  created_at: string;
  [key: string]: any;
}

const TimelineRedesigned = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryArtifacts, setMemoryArtifacts] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [activeChapter, setActiveChapter] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch memories
  useEffect(() => {
    const fetchMemories = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Fetch memories with valid dates
        const { data: memoriesData, error: memoriesError } = await supabase
          .from('memories')
          .select('*')
          .eq('user_id', user.id)
          .not('memory_date', 'is', null)
          .not('title', 'is', null)
          .not('text', 'is', null)
          .order('memory_date', { ascending: true });

        if (memoriesError) throw memoriesError;

        const validMemories = (memoriesData || []).filter(
          (m) => m.title?.trim() && m.text?.trim() && m.memory_date
        );

        setMemories(validMemories);

        // Fetch artifacts
        if (validMemories.length > 0) {
          const memoryIds = validMemories.map((m) => m.id);
          const { data: artifactsData } = await supabase
            .from('memory_artifacts')
            .select('memory_id, artifact_id, artifacts(*)')
            .in('memory_id', memoryIds);

          const artifactsMap = new Map<string, any>();
          artifactsData?.forEach((ma) => {
            if (!artifactsMap.has(ma.memory_id)) {
              artifactsMap.set(ma.memory_id, []);
            }
            if (ma.artifacts) {
              const storagePath = (ma.artifacts as any).storage_path;
              const { data } = supabase.storage
                .from('memory-images')
                .getPublicUrl(storagePath);
              artifactsMap.get(ma.memory_id)!.push({
                ...ma.artifacts,
                signedUrl: data.publicUrl,
              });
            }
          });

          setMemoryArtifacts(artifactsMap);
        }
      } catch (error) {
        console.error('Error fetching memories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMemories();
  }, [user]);

  // Group memories into chapters (decades)
  const chapters = useMemo(() => {
    if (memories.length === 0) return [];

    const birthYear = profile?.birth_date 
      ? new Date(profile.birth_date).getFullYear()
      : new Date(memories[0].memory_date).getFullYear();

    const currentYear = new Date().getFullYear();
    const chapterList = [];

    // Create decade-based chapters
    for (let year = Math.floor(birthYear / 10) * 10; year <= currentYear; year += 10) {
      const startYear = year;
      const endYear = Math.min(year + 9, currentYear);
      
      const chapterMemories = memories.filter((m) => {
        const memYear = new Date(m.memory_date).getFullYear();
        return memYear >= startYear && memYear <= endYear;
      });

      if (chapterMemories.length > 0) {
        chapterList.push({
          startYear,
          endYear,
          memories: chapterMemories,
          memoryCount: chapterMemories.length,
        });
      }
    }

    return chapterList;
  }, [memories, profile?.birth_date]);

  // Scroll to content
  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to chapter
  const scrollToChapter = (index: number) => {
    const chapter = chapters[index];
    if (chapter) {
      const element = document.getElementById(`chapter-${chapter.startYear}-${chapter.endYear}`);
      element?.scrollIntoView({ behavior: 'smooth' });
      setActiveChapter(index);
    }
  };

  // Track active chapter on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 2;

      chapters.forEach((chapter, index) => {
        const element = document.getElementById(`chapter-${chapter.startYear}-${chapter.endYear}`);
        if (element) {
          const rect = element.getBoundingClientRect();
          const elementTop = rect.top + window.scrollY;
          const elementBottom = elementTop + rect.height;

          if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
            setActiveChapter(index);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [chapters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-md">
          <h2 className="font-manrope font-semibold text-2xl text-foreground mb-4">
            No memories yet
          </h2>
          <p className="font-manrope text-muted-foreground">
            Start adding memories to build your personal timeline
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-background">
      {/* Hero Section */}
      <TimelineHero
        userName={user?.email?.split('@')[0] || 'Your'}
        birthDate={profile?.birth_date || null}
        memoryCount={memories.length}
        onScrollToContent={scrollToContent}
      />

      {/* Navigation */}
      {chapters.length > 1 && (
        <TimelineNavigation
          chapters={chapters}
          activeChapter={activeChapter}
          onChapterClick={scrollToChapter}
        />
      )}

      {/* Content */}
      <div ref={contentRef} className="lg:pl-64">
        {chapters.map((chapter, index) => (
          <TimelineChapter
            key={`${chapter.startYear}-${chapter.endYear}`}
            startYear={chapter.startYear}
            endYear={chapter.endYear}
            memories={chapter.memories}
            memoryArtifacts={memoryArtifacts}
            onMemoryClick={setSelectedMemory}
            isActive={activeChapter === index}
          />
        ))}
      </div>

      {/* Memory Detail Dialog */}
      {selectedMemory && (
        <MemoryDetailDialog
          memory={selectedMemory}
          open={!!selectedMemory}
          onOpenChange={(open) => !open && setSelectedMemory(null)}
        />
      )}
    </div>
  );
};

export default TimelineRedesigned;
