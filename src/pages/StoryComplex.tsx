import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Heart, 
  MapPin, 
  Calendar, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Mic, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb,
  Edit3,
  RefreshCw,
  Wand2,
  Save,
  X,
  MessageSquare,
  Bot
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MemoryDetailDialog } from '@/components/MemoryDetailDialog';
import { biographyChecker, type BiographyAnalysis } from '@/services/biographyChecker';
import { getGroupedMemories, type GroupedMemory } from '@/utils/memoryGrouping';
import { narrativeAI, type PersistentBiography, type NarrativeGenerationContext, type BiographyChapter } from '@/services/narrativeAI';
import { useToast } from '@/hooks/use-toast';

const Story = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State for data
  const [groupedMemories, setGroupedMemories] = useState<GroupedMemory[]>([]);
  const [biographyTopics, setBiographyTopics] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [persistentBiography, setPersistentBiography] = useState<PersistentBiography | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  // State for biography editing
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationType, setRegenerationType] = useState<'full' | 'prompt'>('full');
  
  // State for theme popup and memory details
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [themeMemories, setThemeMemories] = useState<GroupedMemory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<GroupedMemory | null>(null);
  
  // State for biography analysis
  const [biographyAnalysis, setBiographyAnalysis] = useState<BiographyAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // State for collapsible chapters
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());

  // Fetch all story data
  const fetchStoryData = async () => {
    const userId = user?.id;
    if (!userId) return;
    
    try {
      setDataLoading(true);
      
      // Fetch grouped memories
      const memories = await getGroupedMemories(userId);
      setGroupedMemories(memories);

      // Fetch user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();
      setUserProfile(profile);

      // Fetch biography topics
      const { data: topics } = await supabase
        .from('biography_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setBiographyTopics(topics || []);

      // Fetch or generate persistent biography
      await fetchOrGenerateBiography(userId, memories, topics || [], profile);
      
    } catch (error) {
      console.error('Failed to fetch story data:', error);
      toast({
        title: 'Error loading story',
        description: 'Please try refreshing the page',
        variant: 'destructive'
      });
    } finally {
      setDataLoading(false);
    }
  };

  // Fetch or generate persistent biography
  const fetchOrGenerateBiography = async (
    userId: string, 
    memories: GroupedMemory[], 
    topics: any[], 
    profile: any
  ) => {
    try {
      // Try to get existing persistent biography
      let biography = await narrativeAI.getPersistentBiography(userId);
      
      if (!biography && memories.length > 0) {
        // Generate new biography if none exists and we have memories
        console.log('🤖 Generating initial AI biography...');
        setIsRegenerating(true);
        setRegenerationType('full');
        
        const context: NarrativeGenerationContext = {
          user_profile: {
            name: profile?.name,
            birth_date: profile?.birth_date,
            birth_place: profile?.birth_place,
            current_location: profile?.current_location,
            age: profile?.birth_date ? new Date().getFullYear() - new Date(profile.birth_date).getFullYear() : undefined
          },
          memories,
          biography_topics: topics.map(t => ({
            topic_category: t.topic_category,
            topic_title: t.topic_title,
            content: t.content
          })),
          generation_preferences: {
            tone: 'reflective_optimistic',
            length: 'comprehensive',
            focus_themes: ['growth', 'relationships', 'achievements']
          }
        };

        biography = await narrativeAI.generatePersistentBiography(userId, context);
        
        toast({
          title: 'AI Biography Generated',
          description: 'Your unique life story has been crafted by our AI storyteller',
          duration: 5000
        });
      }
      
      setPersistentBiography(biography);
      
      // Analyze the biography if it exists
      if (biography) {
        analyzeExistingBiography(biography);
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch/generate biography:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Analyze existing biography
  const analyzeExistingBiography = async (biography: PersistentBiography) => {
    try {
      setIsAnalyzing(true);
      
      const analysis = await biographyChecker.analyzeBiography(
        biography.introduction,
        biography.chapters.map(ch => ({
          title: ch.chapter_title,
          content: ch.chapter_content,
          memories: [] // We don't need to pass actual memories for analysis
        })),
        biography.conclusion,
        { tone: 'optimistic', focus: ['growth', 'relationships', 'achievements'] }
      );
      
      setBiographyAnalysis(analysis);
      
    } catch (error) {
      console.error('Biography analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle biography regeneration with user prompt
  const handleRegenerateWithPrompt = async () => {
    const userId = user?.id;
    if (!userId || !editPrompt.trim()) return;

    try {
      setIsRegenerating(true);
      setRegenerationType('prompt');
      
      const context: NarrativeGenerationContext = {
        user_profile: {
          name: userProfile?.name,
          birth_date: userProfile?.birth_date,
          birth_place: userProfile?.birth_place,
          current_location: userProfile?.current_location,
          age: userProfile?.birth_date ? new Date().getFullYear() - new Date(userProfile.birth_date).getFullYear() : undefined
        },
        memories: groupedMemories,
        biography_topics: biographyTopics.map(t => ({
          topic_category: t.topic_category,
          topic_title: t.topic_title,
          content: t.content
        })),
        generation_preferences: {
          tone: 'reflective_optimistic',
          length: 'comprehensive',
          focus_themes: ['growth', 'relationships', 'achievements']
        }
      };

      const updatedBiography = await narrativeAI.regenerateBiographyWithPrompt(
        userId,
        editPrompt.trim(),
        context
      );

      setPersistentBiography(updatedBiography);
      setIsEditing(false);
      setEditPrompt('');
      
      toast({
        title: 'Biography Updated',
        description: 'Your story has been regenerated based on your prompt',
        duration: 5000
      });

      // Re-analyze the updated biography
      analyzeExistingBiography(updatedBiography);
      
    } catch (error) {
      console.error('❌ Failed to regenerate biography:', error);
      toast({
        title: 'Regeneration Failed',
        description: 'Please try again or contact support',
        variant: 'destructive'
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Handle full biography regeneration
  const handleFullRegeneration = async () => {
    const userId = user?.id;
    if (!userId) return;

    try {
      setIsRegenerating(true);
      setRegenerationType('full');
      
      // Force regeneration by treating as new
      await fetchOrGenerateBiography(userId, groupedMemories, biographyTopics, userProfile);
      
      toast({
        title: 'Biography Regenerated',
        description: 'Your complete story has been recreated with fresh AI insights',
        duration: 5000
      });
      
    } catch (error) {
      console.error('❌ Failed to regenerate biography:', error);
      toast({
        title: 'Regeneration Failed',
        description: 'Please try again later',
        variant: 'destructive'
      });
    }
  };

  // Handle Solin biography editing
  const handleSolinBiographyEdit = () => {
    navigate('/sanctuary?mode=biography&context=story_editing', { 
      state: { 
        returnTo: '/story',
        purpose: 'biography_modification',
        currentBiography: persistentBiography,
        guidance: 'Help me modify or enhance my life story. You can suggest changes to the narrative, tone, or focus areas.'
      }
    });
    
    toast({
      title: 'Opening Solin for Story Editing',
      description: 'Discuss changes to your biography with your AI companion.',
      duration: 3000
    });
  };

  // Analyze themes from grouped memories (same as before)
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

  // Handle theme click
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

  useEffect(() => {
    fetchStoryData();
  }, [user?.id]);

  const themes = analyzeThemes();
  const totalMemories = groupedMemories.length;

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your story...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-xl font-semibold">Your AI-Generated Story</h1>
          </div>
          
          {/* Story Controls */}
          <div className="flex items-center gap-2">
            {persistentBiography && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Story
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSolinBiographyEdit}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Talk to Solin
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFullRegeneration}
                  disabled={isRegenerating}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Edit Prompt Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              Modify Your Biography
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                What would you like to change about your story?
              </label>
              <Textarea
                placeholder="E.g., 'Make it more focused on my career achievements' or 'Add more emphasis on family relationships' or 'Change the tone to be more uplifting'..."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                rows={4}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Your story will be regenerated using AI based on your instructions.
              </p>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleRegenerateWithPrompt}
                  disabled={!editPrompt.trim() || isRegenerating}
                  className="flex items-center gap-2"
                >
                  {isRegenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  Regenerate Story
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {isRegenerating && (
          <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-primary animate-pulse" />
              <div>
                <p className="font-medium text-foreground">
                  AI is {regenerationType === 'full' ? 'crafting your complete story' : 'updating your biography'}...
                </p>
                <p className="text-sm text-muted-foreground">
                  This may take a moment as we create your unique narrative.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Your AI-Generated Story */}
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Your AI-Generated Biography
                {persistentBiography && (
                  <span className="text-xs text-muted-foreground ml-2">
                    Last updated: {new Date(persistentBiography.last_regenerated_at).toLocaleDateString()}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {persistentBiography ? (
                <div className="space-y-4">
                  {/* Introduction */}
                  <div className="prose prose-sm max-w-none">
                    <p className="text-base text-foreground leading-relaxed font-light">
                      {persistentBiography.introduction}
                    </p>
                  </div>
                  
                  {/* AI-Generated Chapters */}
                  {persistentBiography.chapters.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                        Life Chapters
                      </h3>
                      {persistentBiography.chapters.map((chapter, index) => (
                        <div key={chapter.id} className="border border-border rounded-lg">
                          <button
                            onClick={() => toggleChapter(index)}
                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/20 transition-colors rounded-lg"
                          >
                            <h4 className="text-base font-medium text-primary flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {chapter.chapter_title}
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
                                  {chapter.chapter_content}
                                </p>
                                {chapter.memory_group_ids.length > 0 && (
                                  <div className="mt-3 text-xs text-muted-foreground">
                                    Based on {chapter.memory_group_ids.length} of your memories
                                  </div>
                                )}
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
                      {persistentBiography.conclusion}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <Bot className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground mb-2">
                      Your AI Story Awaits
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add memories to generate your unique AI-crafted biography
                    </p>
                    <Link to="/">
                      <Button className="bg-primary hover:bg-primary/90">
                        Share Your First Memory
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Biography Analysis Section */}
              {persistentBiography && biographyAnalysis && (
                <div className="p-4 bg-white border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      AI Story Quality Analysis
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
                        AI Enhancement Suggestions:
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
            </CardContent>
          </Card>

          {/* Explore Your Themes - Same as before */}
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Explore Your Themes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Discover the patterns and themes that shape your AI-generated story
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
                    No themes discovered yet. Add memories to see patterns emerge in your AI story.
                  </p>
                  <Link to="/">
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

      {/* Theme Memories Popup - Same as before */}
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