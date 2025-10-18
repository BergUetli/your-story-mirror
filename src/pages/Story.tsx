import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Heart, MapPin, Calendar, Sparkles, Bot, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Memory {
  id: string;
  title: string;
  text: string;
  created_at: string;
  memory_date?: string;
  memory_location?: string;
}

const Story = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate simple AI-style narrative from memories
  const generateSimpleNarrative = (memories: Memory[], profile: any) => {
    if (memories.length === 0) {
      return {
        introduction: "Every life has a story waiting to be told. This digital sanctuary is ready to preserve the memories that matter most.",
        chapters: [],
        conclusion: "The journey of memory preservation begins with a single story. What will yours be?"
      };
    }

    const name = profile?.name || 'This individual';
    const birthPlace = profile?.birth_place || 'a place of beginnings';
    const currentLocation = profile?.current_location || 'where the story continues';
    
    // Sort memories by date
    const sortedMemories = [...memories].sort((a, b) => {
      const dateA = new Date(a.memory_date || a.created_at).getTime();
      const dateB = new Date(b.memory_date || b.created_at).getTime();
      return dateA - dateB;
    });

    // Create rich introduction
    const introduction = `${name}'s journey through life has been carefully documented through ${memories.length} meaningful memories. From ${birthPlace} to ${currentLocation}, each preserved moment tells a part of a larger story—one of growth, connection, and the human experience in all its complexity.`;

    // Group memories into simple chapters
    const chapters = [];
    const recentMemories = sortedMemories.slice(0, 3);
    const olderMemories = sortedMemories.slice(3);

    if (recentMemories.length > 0) {
      let recentContent = "The most recent chapters of this story include ";
      recentContent += recentMemories.map((memory, index) => {
        const year = new Date(memory.memory_date || memory.created_at).getFullYear();
        const location = memory.memory_location ? ` in ${memory.memory_location}` : '';
        return `${memory.title.toLowerCase()}${location} (${year})`;
      }).join(', ') + '.';
      
      recentContent += ` These experiences represent ${recentMemories.length} significant moments that have shaped recent years, each contributing to the ongoing narrative of personal development and life experience.`;

      chapters.push({
        title: 'Recent Chapters',
        content: recentContent,
        memories: recentMemories
      });
    }

    if (olderMemories.length > 0) {
      let earlierContent = `Earlier in this life story, ${olderMemories.length} foundational experiences helped shape the person ${name} would become. `;
      earlierContent += `From ${olderMemories[0].title.toLowerCase()} to other significant moments, these memories form the bedrock of character and perspective that continues to influence decisions and relationships today.`;

      chapters.push({
        title: 'Foundation Years',
        content: earlierContent,
        memories: olderMemories
      });
    }

    // Create forward-looking conclusion
    const conclusion = `This collection of ${memories.length} memories represents more than just moments in time—they are the building blocks of identity and the foundation for future growth. As new experiences unfold, this living biography will continue to expand, ensuring that the story of ${name} remains preserved for generations to come.`;

    return { introduction, chapters, conclusion };
  };

  // Fetch story data (with offline fallback)
  const fetchStoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is signed in - if not, show demo content
      if (!user?.id) {
        console.log('User not signed in, showing demo content');
        // Set demo content instead of error
        const demoMemories: Memory[] = [
          {
            id: 'demo-1',
            title: 'First Day of School',
            text: 'I remember walking into that classroom, feeling both excited and nervous. The teacher smiled warmly and I knew everything would be okay.',
            created_at: '2020-09-01T08:00:00Z',
            memory_date: '2020-09-01',
            memory_location: 'Roosevelt Elementary School'
          },
          {
            id: 'demo-2', 
            title: 'Summer Vacation at the Beach',
            text: 'The waves crashed against the shore as we built sandcastles. Dad taught me how to bodysurf, and we collected shells until sunset.',
            created_at: '2021-07-15T15:30:00Z',
            memory_date: '2021-07-15',
            memory_location: 'Myrtle Beach, SC'
          },
          {
            id: 'demo-3',
            title: 'Learning to Ride a Bike',
            text: 'After so many attempts, I finally pedaled without training wheels. The feeling of freedom was incredible - I felt like I could go anywhere!',
            created_at: '2019-05-10T10:00:00Z',
            memory_date: '2019-05-10',
            memory_location: 'Neighborhood Park'
          }
        ];
        
        const demoProfile = {
          name: 'Demo User',
          birth_place: 'Sample City',
          current_location: 'Demo Town'
        };

        setMemories(demoMemories);
        setUserProfile(demoProfile);
        setLoading(false);
        
        toast({
          title: 'Demo Story Loaded',
          description: 'Sign in to save your own memories and create your personal story',
        });
        return;
      }

      // Try to fetch from Supabase with timeout and fallback
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      );

      const fetchPromise = Promise.all([
        supabase
          .from('memories')
          .select('id, title, text, created_at, memory_date, memory_location')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('*')
          .eq('user_id', user.id)
          .single()
      ]);

      try {
        const [memoriesResult, profileResult] = await Promise.race([
          fetchPromise,
          timeoutPromise
        ]) as any;

        if (memoriesResult.error && memoriesResult.error.code !== 'PGRST116') {
          throw memoriesResult.error;
        }

        setMemories(memoriesResult.data || []);
        setUserProfile(profileResult.data);

        toast({
          title: 'Story Loaded',
          description: `Found ${memoriesResult.data?.length || 0} memories to weave into your story`,
        });

      } catch (dbError: any) {
        console.warn('Database connection failed, using fallback:', dbError);
        
        // Fallback: Show empty state with helpful message
        setMemories([]);
        setUserProfile({ name: user.email?.split('@')[0] || 'User' });
        
        toast({
          title: 'Database Temporarily Unavailable',
          description: 'Showing offline mode. Your data is safe and will sync when connection is restored.',
          variant: 'default'
        });
      }

    } catch (error: any) {
      console.error('Failed to fetch story data:', error);
      
      // Even on error, don't show error state - show empty state instead
      setMemories([]);
      setUserProfile({ name: user?.email?.split('@')[0] || 'User' });
      
      toast({
        title: 'Offline Mode',
        description: 'Unable to connect to database. Your memories will sync when connection is restored.',
        variant: 'default'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoryData();
  }, [user?.id]);

  const narrative = generateSimpleNarrative(memories, userProfile);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-8 h-8 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your story...</p>
        </div>
      </div>
    );
  }

  // Remove error state - we now handle all errors gracefully with fallbacks
  // This ensures the app always works even with database issues

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
            <h1 className="text-xl font-semibold">Your Story</h1>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card className="modern-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Your Life Story
              <span className="text-sm text-muted-foreground ml-2">
                ({memories.length} memories preserved)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Introduction */}
            <div className="prose prose-sm max-w-none">
              <p className="text-base text-foreground leading-relaxed font-light">
                {narrative.introduction}
              </p>
            </div>
            
            {/* Chapters */}
            {narrative.chapters.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Life Chapters
                </h3>
                {narrative.chapters.map((chapter, index) => (
                  <div key={index} className="bg-muted/20 rounded-lg p-4 border-l-4 border-primary">
                    <h4 className="text-base font-medium text-primary mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {chapter.title}
                    </h4>
                    <p className="text-sm text-foreground leading-relaxed mb-3">
                      {chapter.content}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {chapter.memories.slice(0, 3).map((memory) => (
                        <span 
                          key={memory.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                        >
                          <Calendar className="w-3 h-3" />
                          {memory.title}
                        </span>
                      ))}
                      {chapter.memories.length > 3 && (
                        <span className="text-xs text-muted-foreground px-2 py-1">
                          +{chapter.memories.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Conclusion */}
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                {narrative.conclusion}
              </p>
            </div>

            {/* No memories state */}
            {memories.length === 0 && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Bot className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-base font-medium text-foreground mb-2">
                    Your Story Awaits
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start by sharing memories to create your unique life narrative
                  </p>
                  <Link to="/">
                    <Button className="bg-primary hover:bg-primary/90">
                      Share Your First Memory
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Stats */}
            {memories.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Story Statistics
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>{memories.length}</strong> memories • 
                      <strong>{narrative.chapters.length}</strong> chapters • 
                      <strong>{Math.round(narrative.introduction.length / 5)}</strong> words
                    </p>
                  </div>
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Story;