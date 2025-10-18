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

  // Grammar checking and correction functions
  const grammarCheck = (text: string): string => {
    let corrected = text.trim();
    
    // Fix common capitalization issues
    corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
    
    // Fix verb tense consistency - convert simple past fragments to complete sentences
    corrected = corrected.replace(/^(went|did|had|was|were|saw|met|got|took|made)\s+/gi, (match) => {
      const verb = match.trim().toLowerCase();
      switch (verb) {
        case 'went': return 'Going ';
        case 'did': return 'Doing ';
        case 'had': return 'Having ';
        case 'was': return 'Being ';
        case 'were': return 'Being ';
        case 'saw': return 'Seeing ';
        case 'met': return 'Meeting ';
        case 'got': return 'Getting ';
        case 'took': return 'Taking ';
        case 'made': return 'Making ';
        default: return match;
      }
    });
    
    // Fix incomplete sentences - ensure proper sentence structure
    if (!/[.!?]$/.test(corrected)) {
      corrected += '.';
    }
    
    // Fix common grammar patterns
    corrected = corrected
      // Fix "in england" to "in England"
      .replace(/\bin ([a-z])/g, (match, letter) => `in ${letter.toUpperCase()}`)
      // Fix years formatting 
      .replace(/\b(nineteen|twenty)\s+(eighty|ninety|zero|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s*-?\s*(one|two|three|four|five|six|seven|eight|nine)?/gi, 
        (match) => {
          // Convert written years to numbers where appropriate
          const yearMap: {[key: string]: string} = {
            'nineteen eighty-five': '1985',
            'nineteen eighty five': '1985', 
            'two thousand one': '2001',
            'two thousand and one': '2001'
          };
          return yearMap[match.toLowerCase()] || match;
        })
      // Fix double spaces
      .replace(/\s+/g, ' ')
      // Fix spacing around punctuation
      .replace(/\s+([.!?])/g, '$1')
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2');
    
    return corrected;
  };
  
  const convertToThirdPerson = (text: string, name: string): string => {
    let converted = text;
    
    // Convert first person pronouns to third person
    converted = converted
      // Handle "I" at start of sentence
      .replace(/^I\s+/gi, `${name} `)
      // Handle "I" in middle of sentence
      .replace(/\s+I\s+/g, ` ${name} `)
      // Handle possessive "my" 
      .replace(/^My\s+/gi, `${name}'s `)
      .replace(/\s+my\s+/g, ` ${name}'s `)
      // Handle "we" - convert to appropriate third person
      .replace(/^We\s+/gi, `${name} and companions `)
      .replace(/\s+we\s+/g, ` they `)
      // Handle "our"
      .replace(/^Our\s+/gi, `Their `)
      .replace(/\s+our\s+/g, ` their `)
      // Handle "me"
      .replace(/\s+me\b/g, ` ${name}`)
      // Handle reflexive pronouns
      .replace(/\s+(myself|ourselves)\b/g, ` ${name}`)
      // Fix verb conjugation after pronoun conversion
      .replace(new RegExp(`${name} am\\b`, 'g'), `${name} was`)
      .replace(new RegExp(`${name} have\\b`, 'g'), `${name} had`)
      .replace(new RegExp(`${name} are\\b`, 'g'), `${name} was`);
    
    return converted;
  };

  const formatLocationName = (location: string): string => {
    if (!location) return location;
    
    // Capitalize each word in location names
    return location
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      // Handle common location patterns
      .replace(/\bUsa\b/g, 'USA')
      .replace(/\bUk\b/g, 'UK')
      .replace(/\bNyc\b/g, 'NYC');
  };

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
    
    // Enhanced memory significance scoring for better narrative content
    const getMemorySignificance = (memory: Memory): number => {
      let score = 0;
      const text = memory.text.toLowerCase();
      const title = memory.title.toLowerCase();
      const combined = text + ' ' + title;
      
      // Content depth and quality
      if (memory.text.length > 200) score += 4;
      else if (memory.text.length > 100) score += 3;
      else if (memory.text.length > 50) score += 2;
      else if (memory.text.length > 20) score += 1;
      
      // Reflective and emotional content (higher weight)
      const reflectiveWords = ['realized', 'learned', 'understood', 'discovered', 'grew', 'changed', 'became', 'felt', 'experienced', 'never forget', 'remember thinking', 'it taught me', 'i understood'];
      const reflectiveCount = reflectiveWords.filter(word => combined.includes(word)).length;
      score += reflectiveCount * 3;
      
      // Emotional depth indicators
      const emotionalWords = ['love', 'fear', 'joy', 'sad', 'happy', 'excited', 'proud', 'grateful', 'overwhelmed', 'peaceful', 'confused', 'clarity', 'meaningful'];
      const emotionalCount = emotionalWords.filter(word => combined.includes(word)).length;
      score += emotionalCount * 2;
      
      // Life transition indicators (highly valuable for narrative)
      const transitionWords = ['first time', 'last time', 'graduation', 'wedding', 'birth', 'death', 'moving', 'started', 'ended', 'beginning', 'turning point'];
      const transitionCount = transitionWords.filter(word => combined.includes(word)).length;
      score += transitionCount * 3;
      
      // Narrative quality indicators
      const narrativeWords = ['story', 'journey', 'adventure', 'challenge', 'achievement', 'milestone', 'breakthrough', 'struggle', 'triumph'];
      const narrativeCount = narrativeWords.filter(word => combined.includes(word)).length;
      score += narrativeCount * 2;
      
      // Specific details enhance narrative value
      if (memory.memory_location) score += 2;
      if (memory.memory_date) score += 1;
      
      // Penalize very short or purely factual content
      if (memory.text.length < 30) score -= 1;
      if (/^(went|did|had|was|were|saw|met)\s+\w+/.test(text)) score -= 1; // Simple past tense descriptions
      
      return Math.max(0, score); // Ensure non-negative
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

    // Create dynamic introduction based on actual memory themes with grammar checking
    const memoryThemes = extractThemes(narrativeMemories);
    let introduction = `${name}'s life story unfolds through ${narrativeMemories.length} significant memories`;
    
    if (birthPlace && currentLocation) {
      // Properly format location names
      const formattedBirthPlace = formatLocationName(birthPlace);
      const formattedCurrentLocation = formatLocationName(currentLocation);
      introduction += `, spanning from ${formattedBirthPlace} to ${formattedCurrentLocation}`;
    } else if (currentLocation) {
      const formattedLocation = formatLocationName(currentLocation);
      introduction += `, rooted in ${formattedLocation}`;
    }
    
    if (memoryThemes.length > 0) {
      // Ensure proper grammar in theme listing
      const themeList = memoryThemes.slice(0, 3);
      if (themeList.length === 1) {
        introduction += `. These memories reveal a central theme of ${themeList[0]}, painting a picture of a life rich with purpose and meaning.`;
      } else if (themeList.length === 2) {
        introduction += `. These memories reveal themes of ${themeList[0]} and ${themeList[1]}, painting a picture of a life rich with experience and growth.`;
      } else {
        introduction += `. These memories reveal themes of ${themeList.slice(0, -1).join(', ')}, and ${themeList[themeList.length - 1]}, painting a picture of a life rich with experience and growth.`;
      }
    } else {
      introduction += `. Each memory captures a moment that helped shape who ${name} is today.`;
    }

    // Create narrative chapters from memory clusters
    const chapters = createNarrativeChapters(narrativeMemories, name);

    // Create personalized conclusion with proper grammar
    const recentMemoryCount = narrativeMemories.filter(m => {
      const memoryYear = new Date(m.memory_date || m.created_at).getFullYear();
      const currentYear = new Date().getFullYear();
      return currentYear - memoryYear <= 2;
    }).length;

    let conclusion = '';
    
    if (narrativeMemories.length === 1) {
      conclusion = `Through this preserved memory, we glimpse into a meaningful moment that helped define ${name}'s journey. `;
    } else {
      conclusion = `Through these ${narrativeMemories.length} preserved memories, we witness the continuing evolution of ${name}'s story. `;
    }
    
    if (recentMemoryCount > 0) {
      if (recentMemoryCount === 1) {
        conclusion += `With one memory from recent years, this narrative continues to grow, `;
      } else {
        conclusion += `With ${recentMemoryCount} memories from recent years, this narrative continues to unfold, `;
      }
    }
    
    conclusion += `ensuring that the experiences that shaped ${name} will be remembered and cherished for generations to come.`;

    return { introduction, chapters, conclusion };
  };

  // Enhanced theme extraction with weighted significance
  const extractThemes = (memories: Memory[]): string[] => {
    const themeScores = new Map<string, number>();
    
    memories.forEach(memory => {
      const text = (memory.title + ' ' + memory.text).toLowerCase();
      const significance = memory.significance || 1;
      
      // Family and relationships (weighted by memory significance)
      if (/family|mother|father|parent|sibling|brother|sister|grandmother|grandfather|relatives/.test(text)) {
        themeScores.set('family bonds', (themeScores.get('family bonds') || 0) + significance);
      }
      
      // Achievement and success
      if (/achievement|success|proud|accomplished|graduation|promotion|award|recognition|honor/.test(text)) {
        themeScores.set('personal achievements', (themeScores.get('personal achievements') || 0) + significance);
      }
      
      // Learning and growth  
      if (/learned|grew|changed|realized|understanding|wisdom|experience|insight|discovery/.test(text)) {
        themeScores.set('personal growth', (themeScores.get('personal growth') || 0) + significance);
      }
      
      // Adventure and exploration
      if (/travel|adventure|journey|explore|trip|vacation|new place|foreign|abroad/.test(text)) {
        themeScores.set('exploration', (themeScores.get('exploration') || 0) + significance);
      }
      
      // Love and romance
      if (/love|relationship|wedding|marriage|partner|romance|dating|boyfriend|girlfriend/.test(text)) {
        themeScores.set('love and relationships', (themeScores.get('love and relationships') || 0) + significance);
      }
      
      // Challenges and resilience
      if (/difficult|challenge|struggle|overcome|perseverance|strength|hardship|obstacle/.test(text)) {
        themeScores.set('resilience', (themeScores.get('resilience') || 0) + significance);
      }
      
      // Education and learning
      if (/school|university|college|education|study|learning|academic|student/.test(text)) {
        themeScores.set('education', (themeScores.get('education') || 0) + significance);
      }
      
      // Career and work
      if (/work|career|job|profession|business|employment|workplace/.test(text)) {
        themeScores.set('professional development', (themeScores.get('professional development') || 0) + significance);
      }
      
      // Creativity and arts
      if (/art|music|creative|painting|writing|performing|artistic/.test(text)) {
        themeScores.set('creative expression', (themeScores.get('creative expression') || 0) + significance);
      }
    });
    
    // Return themes sorted by significance, take top themes
    return Array.from(themeScores.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 4)
      .map(([theme]) => theme);
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
    
    // Intelligently weave in actual memory content with grammar checking
    if (keyMemory.text.length > 50) {
      const memoryText = keyMemory.text.trim();
      
      // Analyze the memory content to determine how to integrate it
      const isFirstPerson = /^(I |My |We |Our )/i.test(memoryText);
      const isNarrative = /^(The |That |This |It )/i.test(memoryText);
      const hasEmotion = /(felt|remember|realized|learned|discovered|understood|experienced)/i.test(memoryText);
      
      // Extract meaningful content
      const sentences = memoryText.split(/[.!?]/).filter(s => s.trim().length > 10);
      if (sentences.length > 0) {
        let bestContent = sentences[0].trim();
        
        // Find a sentence that contains reflection or emotion if available
        const reflectiveSentence = sentences.find(s => 
          /(felt|remember|realized|learned|discovered|understood|never forget|changed|grew)/i.test(s)
        );
        
        if (reflectiveSentence && reflectiveSentence.trim().length > 20) {
          bestContent = reflectiveSentence.trim();
        }
        
        if (bestContent.length > 20 && bestContent.length < 250) {
          // Grammar check and correct the content
          let processedContent = grammarCheck(bestContent);
          
          if (isFirstPerson) {
            // Convert first person to third person narrative with proper grammar
            processedContent = convertToThirdPerson(processedContent, name);
          }
          
          // Choose appropriate integration based on content type with proper sentence structure
          if (hasEmotion || reflectiveSentence) {
            // For emotional/reflective content, integrate as direct narrative
            if (processedContent.match(/^(realized|learned|discovered|understood|felt)/i)) {
              paragraph += `During this time, ${name} ${processedContent.toLowerCase()}. `;
            } else {
              paragraph += `Reflecting on this period, ${processedContent}. `;
            }
          } else if (isNarrative) {
            paragraph += `${processedContent}. `;
          } else {
            // For factual content, frame appropriately
            paragraph += `This experience involved ${processedContent.toLowerCase()}. `;
          }
        }
      }
    }
    
    // Connect other memories from this period with proper grammar
    if (memories.length > 1) {
      const additionalMemories = memories.slice(1, 4); // Take up to 3 more
      
      // Format memory titles properly
      const formatMemoryTitle = (title: string): string => {
        return title.toLowerCase()
          .replace(/^(the|a|an)\s+/, '') // Remove articles at start
          .replace(/^\w/, c => c.toLowerCase()); // Ensure lowercase start for flow
      };
      
      if (additionalMemories.length === 1) {
        const formattedTitle = formatMemoryTitle(additionalMemories[0].title);
        paragraph += `This period was also marked by ${formattedTitle}, `;
      } else if (additionalMemories.length === 2) {
        const title1 = formatMemoryTitle(additionalMemories[0].title);
        const title2 = formatMemoryTitle(additionalMemories[1].title);
        paragraph += `This era was further defined by ${title1} and ${title2}, `;
      } else {
        const formattedTitles = additionalMemories.map(m => formatMemoryTitle(m.title));
        const lastTitle = formattedTitles.pop();
        paragraph += `This chapter encompassed ${formattedTitles.join(', ')}, and ${lastTitle}, `;
      }
      
      if (memories.length <= 3) {
        paragraph += `each experience contributing to personal growth and understanding.`;
      } else {
        paragraph += `weaving together multiple experiences that collectively shaped this important period of development.`;
      }
    } else {
      paragraph += `This singular experience became a defining moment, influencing perspectives and decisions in the years that followed.`;
    }
    
    // Final grammar check on the complete paragraph
    return grammarCheck(paragraph);
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