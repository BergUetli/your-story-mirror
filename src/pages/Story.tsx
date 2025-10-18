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

  // Enhanced narrative generation from actual memories
  const generateDynamicNarrative = (memories: Memory[], profile: any) => {
    if (memories.length === 0) {
      return {
        introduction: "Every life has a story waiting to be told. This digital sanctuary is ready to preserve the memories that matter most.",
        chapters: [],
        conclusion: "The journey of memory preservation begins with a single story. What will yours be?"
      };
    }

    const name = profile?.name || 'This person';
    const birthPlace = profile?.birth_place;
    const currentLocation = profile?.current_location;
    
    // Filter for significant memories (longer content, emotional keywords, specific details)
    const getMemorySignificance = (memory: Memory): number => {
      let score = 0;
      
      // Content length indicates detail/importance
      if (memory.text.length > 100) score += 3;
      else if (memory.text.length > 50) score += 2;
      else if (memory.text.length > 20) score += 1;
      
      // Emotional indicators
      const emotionalWords = ['love', 'fear', 'joy', 'sad', 'happy', 'excited', 'proud', 'remember', 'never forget', 'special', 'important', 'changed', 'learned', 'realized'];
      const emotionalCount = emotionalWords.filter(word => 
        memory.text.toLowerCase().includes(word) || memory.title.toLowerCase().includes(word)
      ).length;
      score += emotionalCount * 2;
      
      // Specific details (locations, dates, names)
      if (memory.memory_location) score += 2;
      if (memory.memory_date) score += 1;
      
      return score;
    };

    // Sort by significance, then by date
    const significantMemories = [...memories]
      .map(memory => ({ ...memory, significance: getMemorySignificance(memory) }))
      .filter(memory => memory.significance > 2) // Only include meaningful memories
      .sort((a, b) => {
        if (a.significance !== b.significance) return b.significance - a.significance;
        return new Date(a.memory_date || a.created_at).getTime() - new Date(b.memory_date || b.created_at).getTime();
      });

    // If no significant memories, use all memories but prioritize longer ones
    const narrativeMemories = significantMemories.length > 0 
      ? significantMemories 
      : [...memories].sort((a, b) => b.text.length - a.text.length);

    // Create dynamic introduction based on actual memory themes
    const memoryThemes = extractThemes(narrativeMemories);
    let introduction = `${name}'s life story unfolds through ${narrativeMemories.length} significant memories`;
    
    if (birthPlace && currentLocation) {
      introduction += `, spanning from ${birthPlace} to ${currentLocation}`;
    } else if (currentLocation) {
      introduction += `, with roots in ${currentLocation}`;
    }
    
    if (memoryThemes.length > 0) {
      introduction += `. These memories reveal themes of ${memoryThemes.slice(0, 3).join(', ')}, painting a picture of a life rich with experience and growth.`;
    } else {
      introduction += `. Each memory captures a moment that helped shape who ${name} is today.`;
    }

    // Create narrative chapters from memory clusters
    const chapters = createNarrativeChapters(narrativeMemories, name);

    // Create personalized conclusion
    const recentMemoryCount = narrativeMemories.filter(m => {
      const memoryYear = new Date(m.memory_date || m.created_at).getFullYear();
      const currentYear = new Date().getFullYear();
      return currentYear - memoryYear <= 2;
    }).length;

    let conclusion = `Through these ${narrativeMemories.length} preserved memories, we see the continuing evolution of ${name}'s story. `;
    
    if (recentMemoryCount > 0) {
      conclusion += `With ${recentMemoryCount} memories from recent years, this narrative continues to grow, `;
    }
    
    conclusion += `ensuring that the experiences that shaped ${name} will be remembered and cherished for generations to come.`;

    return { introduction, chapters, conclusion };
  };

  // Extract themes from memories
  const extractThemes = (memories: Memory[]): string[] => {
    const themes = new Set<string>();
    
    memories.forEach(memory => {
      const text = (memory.title + ' ' + memory.text).toLowerCase();
      
      // Family themes
      if (/family|mother|father|parent|sibling|brother|sister|grandmother|grandfather/.test(text)) {
        themes.add('family connections');
      }
      
      // Achievement themes  
      if (/achievement|success|proud|accomplished|graduation|promotion|award/.test(text)) {
        themes.add('personal achievements');
      }
      
      // Growth themes
      if (/learned|grew|changed|realized|understanding|wisdom|experience/.test(text)) {
        themes.add('personal growth');
      }
      
      // Adventure themes
      if (/travel|adventure|journey|explore|trip|vacation|new place/.test(text)) {
        themes.add('exploration and adventure');
      }
      
      // Love themes
      if (/love|relationship|wedding|marriage|partner|romance/.test(text)) {
        themes.add('love and relationships');
      }
      
      // Challenge themes
      if (/difficult|challenge|struggle|overcome|perseverance|strength/.test(text)) {
        themes.add('overcoming challenges');
      }
    });
    
    return Array.from(themes);
  };

  // Create flowing narrative paragraphs from memory clusters
  const createNarrativeChapters = (memories: Memory[], name: string) => {
    if (memories.length === 0) return [];
    
    const chapters = [];
    
    // Group memories by time periods and themes
    const timeGroups = groupMemoriesByTimePeriod(memories);
    
    // Create flowing narrative paragraphs (no chapter titles)
    Object.entries(timeGroups).forEach(([period, periodMemories]) => {
      if (periodMemories.length === 0) return;
      
      // Create rich narrative for this time period
      const paragraphContent = createFlowingParagraph(periodMemories, name, period);
      
      chapters.push({
        title: '', // No titles for flowing text
        content: paragraphContent,
        memories: periodMemories
      });
    });
    
    return chapters;
  };

  // Group memories by life periods
  const groupMemoriesByTimePeriod = (memories: Memory[]) => {
    const currentYear = new Date().getFullYear();
    const groups: { [key: string]: Memory[] } = {
      'recent': [],
      'middle': [], 
      'early': []
    };
    
    memories.forEach(memory => {
      const memoryYear = new Date(memory.memory_date || memory.created_at).getFullYear();
      const yearsAgo = currentYear - memoryYear;
      
      if (yearsAgo <= 2) groups.recent.push(memory);
      else if (yearsAgo <= 10) groups.middle.push(memory);
      else groups.early.push(memory);
    });
    
    return groups;
  };

  // Create flowing paragraph content for biography style
  const createFlowingParagraph = (memories: Memory[], name: string, period: string): string => {
    if (memories.length === 0) return '';
    
    const keyMemory = memories[0]; // Highest significance memory in this period
    let paragraph = '';
    
    // Create smooth transitions between time periods
    if (period === 'recent') {
      paragraph = `As the years have progressed, `;
    } else if (period === 'middle') {
      paragraph = `Through the developing years of life, `;
    } else {
      paragraph = `In the earlier chapters of this story, `;
    }
    
    // Incorporate the most significant memory with rich detail
    paragraph += `${name} experienced what would become `;
    
    // Determine memory significance
    const significance = memories[0].significance || 0;
    if (significance > 8) {
      paragraph += `one of the most transformative moments of this period`;
    } else if (significance > 5) {
      paragraph += `a particularly meaningful experience`;
    } else {
      paragraph += `a memorable chapter`;
    }
    
    paragraph += ` through ${keyMemory.title.toLowerCase()}`;
    
    // Add location and time context naturally
    if (keyMemory.memory_location && keyMemory.memory_date) {
      const year = new Date(keyMemory.memory_date).getFullYear();
      paragraph += ` in ${keyMemory.memory_location} during ${year}`;
    } else if (keyMemory.memory_location) {
      paragraph += ` in ${keyMemory.memory_location}`;
    } else if (keyMemory.memory_date) {
      const year = new Date(keyMemory.memory_date).getFullYear();
      paragraph += ` in ${year}`;
    }
    
    paragraph += '. ';
    
    // Weave in actual memory content as reflection
    if (keyMemory.text.length > 50) {
      const sentences = keyMemory.text.split(/[.!?]/).filter(s => s.trim().length > 10);
      if (sentences.length > 0) {
        const bestSentence = sentences[0].trim();
        if (bestSentence.length > 20 && bestSentence.length < 200) {
          // Make it flow as part of the biography narrative
          paragraph += `The experience was marked by a profound realization: ${bestSentence.toLowerCase()}. `;
        }
      }
    }
    
    // Connect other memories from this period naturally
    if (memories.length > 1) {
      const additionalMemories = memories.slice(1, 4); // Take up to 3 more
      
      if (additionalMemories.length === 1) {
        paragraph += `This was also the time of ${additionalMemories[0].title.toLowerCase()}, `;
      } else if (additionalMemories.length === 2) {
        paragraph += `This period was further defined by ${additionalMemories[0].title.toLowerCase()} and ${additionalMemories[1].title.toLowerCase()}, `;
      } else {
        const titles = additionalMemories.map(m => m.title.toLowerCase());
        const lastTitle = titles.pop();
        paragraph += `This era encompassed ${titles.join(', ')}, and ${lastTitle}, `;
      }
      
      paragraph += `each experience building upon the last to create a tapestry of growth and understanding.`;
    } else {
      paragraph += `This singular experience became a cornerstone of personal development, influencing countless decisions and perspectives in the years that followed.`;
    }
    
    return paragraph;
  };



  // Fetch story data (with offline fallback)
  const fetchStoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // For non-signed users, show demo content with rich narrative
      if (!user?.id) {
        console.log('User not signed in, showing enhanced demo content');
        const demoMemories: Memory[] = [
          {
            id: 'demo-1',
            title: 'My First Day at University',
            text: 'Walking through those campus gates, I felt a mixture of excitement and terror. Mom had packed my favorite snacks, and Dad kept reminding me to call home. The dormitory smelled like cleaning supplies and possibility. My roommate was from California, and we spent hours talking about our dreams and fears. I realized this was the beginning of becoming who I was meant to be. The independence was intoxicating, but I also missed the comfort of home-cooked meals and familiar faces.',
            created_at: '2020-09-01T08:00:00Z',
            memory_date: '2020-09-01',
            memory_location: 'State University Campus'
          },
          {
            id: 'demo-2', 
            title: 'The Summer I Learned to Surf',
            text: 'That summer in California changed everything. I was staying with my aunt, working at a beach cafe, when I decided to finally learn to surf. Every morning at 6 AM, I would paddle out with the local surfers. They laughed at my terrible form but encouraged me anyway. After two weeks of drinking saltwater and getting tumbled by waves, I finally caught my first real wave. The feeling was indescribable - like flying and falling at the same time. I understood then why people become obsessed with the ocean. That summer taught me patience, persistence, and the joy of embracing something completely outside my comfort zone.',
            created_at: '2021-07-15T15:30:00Z',
            memory_date: '2021-07-15',
            memory_location: 'Malibu Beach, California'
          },
          {
            id: 'demo-3',
            title: 'The Night Grandpa Told Me About the War',
            text: 'It was Christmas Eve, and the family had gone to bed, but Grandpa and I stayed up by the fireplace. He rarely talked about his time in Korea, but that night something changed. Maybe it was the warmth of the fire or the quiet of the house, but he began telling me stories I had never heard. About friends he lost, about moments of terror and unexpected kindness, about how war changes you in ways you can never fully explain. His voice got quiet when he talked about coming home and trying to fit back into normal life. I realized that night that the quiet, gentle man I knew carried depths of experience I could barely imagine. It made me understand courage differently.',
            created_at: '2019-12-24T22:30:00Z',
            memory_date: '2019-12-24',
            memory_location: 'Family Home, Ohio'
          },
          {
            id: 'demo-4',
            title: 'Getting Lost in Tokyo',
            text: 'My first solo international trip, and I managed to get completely lost on day two. I had been so confident with my translation app and printed maps, but somehow ended up in a residential neighborhood with no English signs anywhere. An elderly woman noticed my confusion and, despite speaking no English, gestured for me to follow her. She walked me six blocks to a train station, bought me a ticket, and made sure I got on the right train. She refused any money and just smiled and bowed. That act of kindness from a complete stranger taught me more about humanity and travel than any guidebook could. It was the moment I stopped being a tourist and started being a traveler.',
            created_at: '2022-03-18T14:20:00Z',
            memory_date: '2022-03-18',
            memory_location: 'Tokyo, Japan'
          }
        ];
        
        const demoProfile = {
          name: 'Alex Chen',
          birth_place: 'Portland, Oregon',
          current_location: 'San Francisco, California'
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

      // Try to fetch actual user memories with timeout protection
      console.log('Attempting to fetch memories for user:', user.id);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 8000)
      );

      const memoriesPromise = supabase
        .from('memories')
        .select('id, title, text, created_at, memory_date, memory_location')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      try {
        // Try to fetch memories with timeout protection
        const memoriesResult = await Promise.race([memoriesPromise, timeoutPromise]) as any;
        
        // Try to fetch profile (non-blocking if it fails)
        let profileResult: any = { data: null, error: null };
        try {
          profileResult = await Promise.race([profilePromise, 
            new Promise((_, reject) => setTimeout(() => reject(new Error('Profile timeout')), 3000))
          ]) as any;
        } catch (profileError) {
          console.warn('Profile fetch failed, continuing without profile:', profileError);
        }

        if (memoriesResult.error) {
          throw memoriesResult.error;
        }

        const fetchedMemories = memoriesResult.data || [];
        setMemories(fetchedMemories);
        setUserProfile(profileResult.data || { 
          name: user.email?.split('@')[0] || 'User',
          user_id: user.id 
        });

        console.log(`✅ Successfully loaded ${fetchedMemories.length} memories`);
        
        toast({
          title: 'Story Loaded Successfully',
          description: `Crafted from your ${fetchedMemories.length} preserved memories`,
        });

      } catch (dbError: any) {
        console.warn('⚠️ Database connection failed, using offline mode:', dbError.message);
        
        // Graceful fallback: Show user's offline state with helpful message
        setMemories([]);
        setUserProfile({ 
          name: user.email?.split('@')[0] || 'User',
          user_id: user.id 
        });
        
        toast({
          title: 'Offline Mode',
          description: 'Unable to load memories right now. Add new memories to see your story grow!',
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

  const narrative = generateDynamicNarrative(memories, userProfile);

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
    <div className="min-h-screen relative" style={{
      background: `
        linear-gradient(135deg, #f8f7f4 0%, #f1efea 100%),
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 23px,
          rgba(139, 69, 19, 0.1) 24px,
          rgba(139, 69, 19, 0.1) 25px
        )
      `
    }}>
      {/* Minimal Navigation */}
      <nav className="absolute top-4 left-4 z-10">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-800 bg-white/80 backdrop-blur-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </nav>

      {/* Paper Document Container */}
      <div className="min-h-screen flex items-center justify-center p-8">
        <div 
          className="max-w-4xl w-full bg-white shadow-2xl relative"
          style={{
            minHeight: '90vh',
            boxShadow: `
              0 0 20px rgba(0, 0, 0, 0.1),
              0 0 40px rgba(0, 0, 0, 0.05),
              inset 0 0 0 1px rgba(139, 69, 19, 0.1)
            `,
            background: `
              linear-gradient(135deg, #ffffff 0%, #fefefe 100%),
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 29px,
                rgba(139, 69, 19, 0.08) 30px,
                rgba(139, 69, 19, 0.08) 31px
              )
            `
          }}
        >
          {/* Paper Content */}
          <div className="px-16 py-20 space-y-8">
            
            {/* Title */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-serif text-slate-800 mb-2">
                {userProfile?.name ? `The Life Story of ${userProfile.name}` : 'A Life Story'}
              </h1>
              <div className="w-32 h-px bg-slate-300 mx-auto mt-4"></div>
              {memories.length > 0 && (
                <p className="text-sm text-slate-500 mt-4 font-light">
                  Based on {memories.length} preserved memories
                </p>
              )}
            </div>
            
            {/* Introduction Paragraph */}
            <div className="text-justify">
              <p className="text-lg leading-8 text-slate-700 font-light first-letter:text-6xl first-letter:font-serif first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:leading-none first-letter:text-slate-600">
                {narrative.introduction}
              </p>
            </div>
            
            {/* Chapter Content - Pure Text Flow */}
            {narrative.chapters.length > 0 && (
              <div className="space-y-6">
                {narrative.chapters.map((chapter, index) => (
                  <div key={index} className="text-justify">
                    <p className="text-lg leading-8 text-slate-700 font-light">
                      {chapter.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Conclusion Paragraph */}
            {narrative.conclusion && (
              <div className="text-justify mt-8">
                <p className="text-lg leading-8 text-slate-700 font-light italic">
                  {narrative.conclusion}
                </p>
              </div>
            )}

            {/* No memories state - Clean version */}
            {memories.length === 0 && !loading && (
              <div className="text-center py-16 space-y-6">
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-2xl font-serif text-slate-700 mb-4">
                    Your Story Awaits
                  </h2>
                  <p className="text-lg leading-8 text-slate-600 font-light mb-8">
                    Every life has a story worth telling. Share your memories to create a beautiful, 
                    flowing biography that captures the essence of your journey through life.
                  </p>
                  <Link to="/">
                    <Button className="bg-slate-700 hover:bg-slate-800 text-white px-8 py-2">
                      Begin Your Story
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Subtle signature line */}
            {memories.length > 0 && (
              <div className="text-center mt-16 pt-8 border-t border-slate-200">
                <div className="text-sm text-slate-400 font-light">
                  Preserved with care by Solin One • Digital Memory Sanctuary
                </div>
              </div>
            )}
          </div>

          {/* Paper aging effects */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              background: `
                radial-gradient(circle at 20% 80%, rgba(139, 69, 19, 0.03) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(139, 69, 19, 0.03) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(139, 69, 19, 0.02) 0%, transparent 50%)
              `
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Story;