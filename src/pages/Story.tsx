import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Heart, MapPin, Calendar, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemories } from '@/hooks/useMemories';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const Story = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [timelineMemories, setTimelineMemories] = useState<any[]>([]);
  const [timelineProfile, setTimelineProfile] = useState<any>(null);
  const [timelineLoading, setTimelineLoading] = useState(true);
  
  const fetchStoryData = async () => {
    const userId = user?.id || '00000000-0000-0000-0000-000000000000';
    
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
      
      setTimelineMemories(memories || []);
      setTimelineProfile(profiles || profile || null);
    } catch (error) {
      console.error('Failed to fetch story data:', error);
    } finally {
      setTimelineLoading(false);
    }
  };

  useEffect(() => {
    fetchStoryData();
  }, [user?.id]);

  // Generate comprehensive biographical story narrative
  const generateBiographicalNarrative = () => {
    if (!timelineProfile?.birth_date) {
      return {
        introduction: "A journey of growth and possibility awaits discovery.",
        chapters: [],
        conclusion: "The story continues to unfold with each passing day."
      };
    }
    
    const birthYear = new Date(timelineProfile.birth_date).getFullYear();
    const birthPlace = timelineProfile.birth_place || "an unknown place";
    const currentLocation = timelineProfile.current_location || "places unknown";
    const name = timelineProfile.name || "This person";
    const currentYear = new Date().getFullYear();
    
    // Sort memories chronologically
    const sortedMemories = [...timelineMemories].sort((a, b) => {
      const dateA = new Date(a.memory_date || a.created_at).getTime();
      const dateB = new Date(b.memory_date || b.created_at).getTime();
      return dateA - dateB;
    });

    // Create introduction
    const introduction = `${name} was born in ${birthYear} in ${birthPlace}, beginning a journey that would span ${currentYear - birthYear} years and countless meaningful moments. From those early days to the present in ${currentLocation}, this is the story of a life lived with purpose and filled with memories worth preserving.`;

    // Group memories into life chapters (decades or significant periods)
    const chapters = [];
    const memoryGroups = {};
    
    // Group memories by decade or significant life periods
    sortedMemories.forEach(memory => {
      const memoryDate = new Date(memory.memory_date || memory.created_at);
      const memoryYear = memoryDate.getFullYear();
      const age = memoryYear - birthYear;
      
      let period;
      if (age <= 12) period = "Early Years";
      else if (age <= 18) period = "Growing Up";  
      else if (age <= 25) period = "Young Adult Years";
      else if (age <= 35) period = "Building a Life";
      else if (age <= 50) period = "Middle Years";
      else period = "Wisdom Years";
      
      if (!memoryGroups[period]) {
        memoryGroups[period] = [];
      }
      memoryGroups[period].push(memory);
    });

    // Create narrative chapters
    Object.entries(memoryGroups).forEach(([period, memories]) => {
      const chapterMemories = memories as any[];
      if (chapterMemories.length === 0) return;

      let narrative = `During the ${period.toLowerCase()}, `;
      
      // Create flowing narrative from memories
      chapterMemories.forEach((memory, index) => {
        const memoryYear = new Date(memory.memory_date || memory.created_at).getFullYear();
        const location = memory.memory_location ? ` in ${memory.memory_location}` : '';
        
        if (index === 0) {
          narrative += `there was ${memory.title.toLowerCase()}${location} (${memoryYear})`;
        } else if (index === chapterMemories.length - 1 && chapterMemories.length > 1) {
          narrative += `, and ${memory.title.toLowerCase()}${location} (${memoryYear})`;
        } else {
          narrative += `, followed by ${memory.title.toLowerCase()}${location} (${memoryYear})`;
        }
      });
      
      narrative += `. ${chapterMemories.length > 1 ? 'These moments' : 'This experience'} shaped the journey and added depth to the unfolding story.`;
      
      chapters.push({
        title: period,
        content: narrative,
        memories: chapterMemories
      });
    });

    const conclusion = `Today, with ${timelineMemories.length} preserved memories spanning ${chapters.length} distinct life periods, the story continues to evolve. Each new day brings opportunities for growth, connection, and meaning—ensuring that this remarkable journey of ${name} will continue to inspire for generations to come.`;

    return { introduction, chapters, conclusion };
  };

  // Analyze themes from memories
  const analyzeThemes = () => {
    if (!timelineMemories || timelineMemories.length === 0) {
      return [
        { name: "Love & Relationships", count: 0, icon: Heart, color: "text-red-500" },
        { name: "Travel & Adventure", count: 0, icon: MapPin, color: "text-blue-500" },
        { name: "Achievements", count: 0, icon: Sparkles, color: "text-yellow-500" },
      ];
    }

    const themes = {
      love: { keywords: ['love', 'relationship', 'marriage', 'wedding', 'anniversary', 'partner'], count: 0 },
      travel: { keywords: ['travel', 'trip', 'vacation', 'visit', 'journey', 'adventure'], count: 0 },
      achievements: { keywords: ['graduation', 'job', 'promotion', 'award', 'achievement', 'success'], count: 0 },
    };

    timelineMemories.forEach(memory => {
      const text = (memory.title + ' ' + (memory.text || '')).toLowerCase();
      
      Object.keys(themes).forEach(theme => {
        if (themes[theme].keywords.some(keyword => text.includes(keyword))) {
          themes[theme].count++;
        }
      });
    });

    return [
      { name: "Love & Relationships", count: themes.love.count, icon: Heart, color: "text-red-500" },
      { name: "Travel & Adventure", count: themes.travel.count, icon: MapPin, color: "text-blue-500" },
      { name: "Achievements", count: themes.achievements.count, icon: Sparkles, color: "text-yellow-500" },
    ];
  };

  const themes = analyzeThemes();
  const biographicalStory = generateBiographicalNarrative();
  const totalMemories = timelineMemories.length;

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
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Your Story So Far */}
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Your Story So Far
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {/* Introduction */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-base text-foreground leading-relaxed font-light">
                    {biographicalStory.introduction}
                  </p>
                </div>
                
                {/* Life Chapters */}
                {biographicalStory.chapters.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                      Life Chapters
                    </h3>
                    {biographicalStory.chapters.map((chapter, index) => (
                      <div key={index} className="space-y-3">
                        <h4 className="text-base font-medium text-primary flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {chapter.title}
                        </h4>
                        <div className="bg-muted/20 rounded-lg p-4 border-l-4 border-primary">
                          <p className="text-sm text-foreground leading-relaxed">
                            {chapter.content}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {chapter.memories.map((memory) => (
                              <span 
                                key={memory.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                              >
                                <Calendar className="w-3 h-3" />
                                {new Date(memory.memory_date || memory.created_at).getFullYear()}
                                {memory.memory_location && (
                                  <>
                                    <MapPin className="w-3 h-3 ml-1" />
                                    {memory.memory_location.split(',')[0]}
                                  </>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Conclusion */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    {biographicalStory.conclusion}
                  </p>
                </div>
              </div>

              {totalMemories > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Your Living Biography
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>{totalMemories}</strong> memories woven into {biographicalStory.chapters.length} life chapters
                      </p>
                    </div>
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                </div>
              )}

              {totalMemories === 0 && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground mb-2">
                      Your Story Awaits
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start preserving your memories to see your biographical story unfold
                    </p>
                    <Link to="/">
                      <Button className="bg-primary hover:bg-primary/90">
                        Start Your Story
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Explore Your Themes */}
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Explore Your Themes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Discover the patterns and themes that shape your life story
              </p>
              
              <div className="space-y-4">
                {themes.map((theme) => (
                  <div key={theme.name} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <theme.icon className={`w-5 h-5 ${theme.color}`} />
                      <div>
                        <h4 className="font-medium text-sm">{theme.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {theme.count} {theme.count === 1 ? 'memory' : 'memories'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-primary">{theme.count}</div>
                    </div>
                  </div>
                ))}
              </div>

              {totalMemories === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm mb-4">
                    No themes discovered yet. Add more memories to see patterns emerge.
                  </p>
                  <Link to="/add-memory">
                    <Button className="bg-primary hover:bg-primary/90">
                      Add Your First Memory
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Story;