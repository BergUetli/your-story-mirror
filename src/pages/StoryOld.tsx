import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Heart, MapPin, Calendar, Sparkles, ChevronDown, ChevronUp, Mic, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useMemories } from '@/hooks/useMemories';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MemoryDetailDialog } from '@/components/MemoryDetailDialog';
import { biographyChecker, type BiographyAnalysis } from '@/services/biographyChecker';
import { getGroupedMemories, type GroupedMemory } from '@/utils/memoryGrouping';
import { useToast } from '@/hooks/use-toast';

const Story = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [groupedMemories, setGroupedMemories] = useState<GroupedMemory[]>([]);
  const [timelineProfile, setTimelineProfile] = useState<any>(null);
  const [timelineLoading, setTimelineLoading] = useState(true);
  
  // State for theme popup and memory details
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [themeMemories, setThemeMemories] = useState<GroupedMemory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<GroupedMemory | null>(null);
  
  // State for biography analysis
  const [biographyAnalysis, setBiographyAnalysis] = useState<BiographyAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // State for collapsible chapters - start with chapters collapsed to emphasize the flowing story
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  
  const fetchStoryData = async () => {
    const userId = user?.id || '00000000-0000-0000-0000-000000000000';
    
    try {
      setTimelineLoading(true);
      
      // Fetch grouped memories (handles chunked memories properly)
      const memories = await getGroupedMemories(userId);

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
      
      setGroupedMemories(memories);
      setTimelineProfile(profiles || profile || null);
      
      // Automatically analyze biography when data is loaded
      if (memories.length > 0) {
        analyzeCurrentBiography(memories, profiles || profile || null);
      }
    } catch (error) {
      console.error('Failed to fetch story data:', error);
    } finally {
      setTimelineLoading(false);
    }
  };

  useEffect(() => {
    fetchStoryData();
  }, [user?.id]);

  // Biography analysis function
  const analyzeCurrentBiography = async (memories: GroupedMemory[], profileData: any) => {
    try {
      setIsAnalyzing(true);
      const biography = generateBiographicalNarrative(memories, profileData);
      
      const analysis = await biographyChecker.analyzeBiography(
        biography.introduction,
        biography.chapters,
        biography.conclusion,
        { tone: 'optimistic', focus: ['growth', 'relationships', 'achievements'] }
      );
      
      setBiographyAnalysis(analysis);
      console.log('📊 Biography Analysis Complete:', analysis);
    } catch (error) {
      console.error('Biography analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle Solin voice agent for biography topics
  const handleSolinBiographyChat = () => {
    // Navigate to Solin with specific biography context
    navigate('/sanctuary?mode=biography&context=general_topics', { 
      state: { 
        returnTo: '/story',
        purpose: 'biography_enhancement',
        guidance: 'Tell me about your values, personality, or general life philosophy. This helps create a richer biographical narrative beyond specific memories.'
      }
    });
    
    toast({
      title: 'Opening Solin for Biography Chat',
      description: 'Share general topics about yourself to enhance your life story.',
      duration: 3000
    });
  };

  // Generate comprehensive biographical story narrative with flowing prose
  const generateBiographicalNarrative = (memories?: GroupedMemory[], profileData?: any) => {
    const memoriesToUse = memories || groupedMemories;
    const profileToUse = profileData || timelineProfile;
    
    if (!profileToUse?.birth_date) {
      return {
        introduction: "Every life tells a story, and this one is just beginning to unfold. Each day brings new chapters waiting to be discovered and preserved.",
        chapters: [],
        conclusion: "The story continues to grow with each passing moment, creating a legacy of memories and meaning."
      };
    }
    
    const birthYear = new Date(profileToUse.birth_date).getFullYear();
    const birthPlace = profileToUse.birth_place || "a place that holds the first whispers of this story";
    const currentLocation = profileToUse.current_location || "where the journey continues";
    const name = profileToUse.name || "This remarkable individual";
    const currentYear = new Date().getFullYear();
    
    // Sort memories chronologically for narrative flow
    const sortedMemories = [...memoriesToUse].sort((a, b) => {
      const dateA = new Date(a.memory_date || a.created_at).getTime();
      const dateB = new Date(b.memory_date || b.created_at).getTime();
      return dateA - dateB;
    });

    // Create rich, flowing introduction
    const yearsLived = currentYear - birthYear;
    const introduction = `In ${birthYear}, ${name} entered the world in ${birthPlace}, beginning what would become a ${yearsLived}-year tapestry of experiences, growth, and meaningful connections. This is not merely a collection of dates and events, but the living narrative of a life thoughtfully lived—from those earliest moments to the present day in ${currentLocation}. Each memory preserved here represents a thread in the larger weaving of identity, purpose, and human connection.`;

    // Create flowing narrative chapters (not just lists)
    const chapters = [];
    const memoryGroups = {};
    
    // Group memories by meaningful life periods
    sortedMemories.forEach(memory => {
      const memoryDate = new Date(memory.memory_date || memory.created_at);
      const memoryYear = memoryDate.getFullYear();
      const age = memoryYear - birthYear;
      
      let period;
      if (age <= 12) period = "Foundations: The Early Years";
      else if (age <= 18) period = "Discovery: Growing Into the World";
      else if (age <= 25) period = "Exploration: Young Adult Adventures";
      else if (age <= 35) period = "Building: Creating Life's Structure";
      else if (age <= 50) period = "Flourishing: The Middle Journey";
      else period = "Wisdom: The Continuing Story";
      
      if (!memoryGroups[period]) {
        memoryGroups[period] = [];
      }
      memoryGroups[period].push(memory);
    });

    // Create flowing narrative chapters that weave memories into story
    Object.entries(memoryGroups).forEach(([period, memories]) => {
      const chapterMemories = memories as GroupedMemory[];
      if (chapterMemories.length === 0) return;

      // Create rich, flowing narrative instead of just listing events
      let narrative = "";
      
      // Introduction sentence for the period
      const periodName = period.split(':')[0].toLowerCase();
      narrative += `The ${periodName} brought with it a series of defining moments that would shape the path ahead. `;
      
      // Weave memories into flowing prose
      chapterMemories.forEach((memory, index) => {
        const memoryYear = new Date(memory.memory_date || memory.created_at).getFullYear();
        const location = memory.memory_location ? ` in ${memory.memory_location}` : '';
        
        // Extract key themes from memory content
        const themes = extractThemesFromMemory(memory);
        const themeContext = themes.length > 0 ? ` This experience of ${themes.join(' and ')}` : '';
        
        if (index === 0) {
          narrative += `In ${memoryYear}, ${memory.title.toLowerCase()} unfolded${location}.${themeContext} would become a cornerstone memory of this period. `;
        } else if (index === chapterMemories.length - 1 && chapterMemories.length > 1) {
          narrative += `Then came ${memory.title.toLowerCase()}${location} in ${memoryYear}, bringing this chapter to a meaningful close.${themeContext} represented both an ending and a new beginning. `;
        } else {
          narrative += `This was followed by ${memory.title.toLowerCase()}${location} (${memoryYear}), which ${themeContext ? 'deepened the themes of' + themeContext.toLowerCase() : 'added new dimensions to the journey'}. `;
        }
      });
      
      // Reflective conclusion for each chapter
      narrative += `Looking back, these ${chapterMemories.length} ${chapterMemories.length === 1 ? 'experience' : 'experiences'} from the ${periodName} reveal the threads of growth, resilience, and discovery that would continue weaving throughout the years ahead.`;
      
      chapters.push({
        title: period,
        content: narrative,
        memories: chapterMemories
      });
    });

    // Rich, forward-looking conclusion
    const conclusion = `Today, this living biography encompasses ${memoriesToUse.length} carefully preserved memories spanning ${chapters.length} distinct chapters of life. But this is not an ending—it is a continuation. Each new day adds fresh pages to this remarkable story, ensuring that the legacy of ${name} will continue to grow, inspire, and touch the lives of others for generations to come. The story is far from over; in many ways, it is just beginning to reveal its full meaning and impact.`;

    return { introduction, chapters, conclusion };
  };

  // Helper function to extract themes from memory content for richer narrative
  const extractThemesFromMemory = (memory: GroupedMemory): string[] => {
    const text = (memory.title + ' ' + memory.text).toLowerCase();
    const themes = [];
    
    if (text.includes('family') || text.includes('parent') || text.includes('child')) themes.push('family connection');
    if (text.includes('love') || text.includes('relationship') || text.includes('marriage')) themes.push('love and partnership');
    if (text.includes('work') || text.includes('job') || text.includes('career')) themes.push('professional growth');
    if (text.includes('travel') || text.includes('adventure') || text.includes('journey')) themes.push('exploration and adventure');
    if (text.includes('learn') || text.includes('study') || text.includes('education')) themes.push('learning and growth');
    if (text.includes('friend') || text.includes('community') || text.includes('together')) themes.push('friendship and community');
    if (text.includes('challenge') || text.includes('difficult') || text.includes('overcome')) themes.push('resilience and strength');
    
    return themes.slice(0, 2); // Limit to avoid overwhelming
  };

  // Analyze themes from grouped memories
  const analyzeThemes = () => {
    if (!groupedMemories || groupedMemories.length === 0) {
      return [
        { name: "Love & Relationships", count: 0, icon: Heart, color: "text-red-500", memories: [] },
        { name: "Travel & Adventure", count: 0, icon: MapPin, color: "text-blue-500", memories: [] },
        { name: "Achievements", count: 0, icon: Sparkles, color: "text-yellow-500", memories: [] },
      ];
    }

    const themes = {
      love: { keywords: ['love', 'relationship', 'marriage', 'wedding', 'anniversary', 'partner', 'family', 'spouse'], count: 0, memories: [] },
      travel: { keywords: ['travel', 'trip', 'vacation', 'visit', 'journey', 'adventure', 'explore', 'destination'], count: 0, memories: [] },
      achievements: { keywords: ['graduation', 'job', 'promotion', 'award', 'achievement', 'success', 'accomplishment', 'milestone'], count: 0, memories: [] },
    };

    groupedMemories.forEach(memory => {
      const text = (memory.title + ' ' + (memory.text || '')).toLowerCase();
      
      Object.keys(themes).forEach(theme => {
        if (themes[theme].keywords.some(keyword => text.includes(keyword))) {
          themes[theme].count++;
          themes[theme].memories.push(memory);
        }
      });
    });

    return [
      { name: "Love & Relationships", count: themes.love.count, icon: Heart, color: "text-red-500", memories: themes.love.memories },
      { name: "Travel & Adventure", count: themes.travel.count, icon: MapPin, color: "text-blue-500", memories: themes.travel.memories },
      { name: "Achievements", count: themes.achievements.count, icon: Sparkles, color: "text-yellow-500", memories: themes.achievements.memories },
    ];
  };

  // Handle theme click to show related memories
  const handleThemeClick = (theme: any) => {
    if (theme.count > 0) {
      setSelectedTheme(theme.name);
      setThemeMemories(theme.memories as GroupedMemory[]);
    }
  };

  // Toggle chapter expansion
  const toggleChapter = (index: number) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedChapters(newExpanded);
  };

  const themes = analyzeThemes();
  const biographicalStory = generateBiographicalNarrative();
  const totalMemories = groupedMemories.length;

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
                
                {/* Life Chapters - Collapsible */}
                {biographicalStory.chapters.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                      Life Chapters
                    </h3>
                    {biographicalStory.chapters.map((chapter, index) => (
                      <div key={index} className="border border-border rounded-lg">
                        <button
                          onClick={() => toggleChapter(index)}
                          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/20 transition-colors rounded-lg"
                        >
                          <h4 className="text-base font-medium text-primary flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {chapter.title}
                          </h4>
                          {expandedChapters.has(index) ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        
                        {expandedChapters.has(index) && (
                          <div className="px-4 pb-4">
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
                        )}
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

              {/* Biography Analysis Section */}
              {totalMemories > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
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

                  {/* Biography Quality Analysis */}
                  {biographyAnalysis && (
                    <div className="p-4 bg-white border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Biography Quality Analysis
                        </h4>
                        <div className="text-sm font-semibold text-primary">
                          {biographyAnalysis.overall_score}/100
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Flow</div>
                          <div className="text-sm font-medium">{biographyAnalysis.flow_score}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Tone</div>
                          <div className="text-sm font-medium">{biographyAnalysis.tone_score}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Positivity</div>
                          <div className="text-sm font-medium">{biographyAnalysis.positivity_score}</div>
                        </div>
                      </div>

                      {biographyAnalysis.suggestions.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Lightbulb className="w-3 h-3" />
                            Suggestions for enhancement:
                          </div>
                          {biographyAnalysis.suggestions.slice(0, 2).map((suggestion, index) => (
                            <p key={index} className="text-xs text-muted-foreground italic">
                              • {suggestion}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add Biography Topics Button */}
                  <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          Enhance Your Biography
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Share your values, personality, and philosophy with Solin
                        </p>
                      </div>
                      <Button 
                        onClick={handleSolinBiographyChat}
                        size="sm"
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90"
                      >
                        <Mic className="w-4 h-4" />
                        Talk to Solin
                      </Button>
                    </div>
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
                      Start by sharing memories or telling Solin about yourself
                    </p>
                    <div className="space-y-3">
                      <Link to="/">
                        <Button className="bg-primary hover:bg-primary/90 w-full">
                          Share Your First Memory
                        </Button>
                      </Link>
                      <Button 
                        onClick={handleSolinBiographyChat}
                        variant="outline"
                        className="w-full flex items-center gap-2"
                      >
                        <Mic className="w-4 h-4" />
                        Talk to Solin About Yourself
                      </Button>
                    </div>
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
                  <div 
                    key={theme.name} 
                    className={`flex items-center justify-between p-3 rounded-lg border border-border transition-colors ${
                      theme.count > 0 ? 'hover:bg-muted/30 cursor-pointer' : 'opacity-60'
                    }`}
                    onClick={() => handleThemeClick(theme)}
                  >
                    <div className="flex items-center gap-3">
                      <theme.icon className={`w-5 h-5 ${theme.color}`} />
                      <div>
                        <h4 className="font-medium text-sm">{theme.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {theme.count} {theme.count === 1 ? 'memory' : 'memories'}
                          {theme.count > 0 && <span className="ml-1 text-primary">• Click to view</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${
                        theme.count > 0 ? 'text-primary hover:scale-105 transition-transform' : 'text-muted-foreground'
                      }`}>
                        {theme.count}
                      </div>
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

      {/* Theme Memories Popup - Simple List */}
      <Dialog open={!!selectedTheme} onOpenChange={(open) => !open && setSelectedTheme(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Memories: {selectedTheme}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {themeMemories.map((memory) => (
              <div
                key={memory.id}
                className="p-4 border border-border rounded-lg hover:bg-muted/20 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedMemory(memory);
                  setSelectedTheme(null);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-foreground mb-1">
                      {memory.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(memory.memory_date || memory.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      {memory.memory_location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {memory.memory_location}
                        </div>
                      )}
                    </div>
                    {memory.text && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {memory.text.substring(0, 150)}{memory.text.length > 150 ? '...' : ''}
                        {memory.totalChunks > 1 && (
                          <span className="text-primary ml-1">({memory.totalChunks} parts)</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Memory Detail Dialog */}
      {selectedMemory && (
        <MemoryDetailDialog
          memory={selectedMemory}
          open={!!selectedMemory}
          onOpenChange={(open) => !open && setSelectedMemory(null)}
          onUpdate={fetchStoryData}
        />
      )}
    </div>
  );
};

export default Story;