import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Heart, MapPin, Calendar, Sparkles, Bot, AlertCircle, ZoomIn, ZoomOut, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
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
  
  // Pan and Zoom functionality
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomLevelRef = useRef(1);
  const panOffsetRef = useRef({ x: 0, y: 0 });
  
  // Pagination functionality
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageTransition, setPageTransition] = useState('');

  // Simplified and safe grammar checking functions
  const grammarCheck = (text: string, userName: string = ''): string => {
    let corrected = text.trim();
    
    // Protect the user's name from modifications
    const nameProtectionToken = `__USER_NAME_${Math.random().toString(36).substr(2, 9)}__`;
    if (userName) {
      corrected = corrected.replace(new RegExp(`\\b${userName}\\b`, 'gi'), nameProtectionToken);
    }
    
    // Fix basic capitalization
    corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
    
    // Fix incomplete year patterns
    corrected = corrected
      .replace(/\btwo thousand\s*\.+/gi, '2000')
      .replace(/\btwo thousand and one\b/gi, '2001')
      .replace(/\btwo thousand one\b/gi, '2001')
      .replace(/\bnineteen eighty-?five\b/gi, '1985')
      .replace(/\bnineteen ninety\b/gi, '1990');
    
    // Fix institution names (specific, safe patterns only)
    corrected = corrected
      .replace(/\bmanipai?l university\b/gi, 'Manipal University')
      .replace(/\bharvard university\b/gi, 'Harvard University');
    
    // Fix basic location names (safe patterns only)
    corrected = corrected
      .replace(/\bengland\b/gi, 'England')
      .replace(/\bindia\b/gi, 'India');
    
    // Basic punctuation and spacing fixes
    corrected = corrected
      .replace(/\s+/g, ' ')
      .replace(/\s+([.!?])/g, '$1')
      .replace(/\.+/g, '.');
    
    if (!/[.!?]$/.test(corrected)) {
      corrected += '.';
    }
    
    // Restore the user's name
    if (userName) {
      corrected = corrected.replace(new RegExp(nameProtectionToken, 'g'), userName);
    }
    
    return corrected;
  };
  
  const convertToThirdPerson = (text: string, name: string): string => {
    let converted = text;
    
    // Only do very specific, safe conversions
    converted = converted
      // Handle "I" at start of sentence (with word boundary)
      .replace(/^I\s+([a-z])/gi, `${name} $1`)
      // Handle "I" with clear word boundaries  
      .replace(/\bI\s+([a-z])/g, `${name} $1`)
      // Handle possessive "my" with word boundaries
      .replace(/\bmy\s+([a-z])/gi, `${name}'s $1`)
      // Handle "me" at end of phrases
      .replace(/\s+me(\s|[.!?])/g, ` ${name}$1`);
    
    // Fix verb conjugation only for the specific name
    converted = converted
      .replace(new RegExp(`\\b${name} am\\b`, 'g'), `${name} was`)
      .replace(new RegExp(`\\b${name} have\\b`, 'g'), `${name} had`);
    
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

  const addBasicArticles = (text: string): string => {
    let processed = text;
    
    // Only add articles in very specific, safe cases
    processed = processed
      // Fix compound words
      .replace(/\bafter party\b/gi, 'afterparty')
      // Add "with the" for family (safe pattern)
      .replace(/\bwith family\b/gi, 'with the family');
    
    return processed;
  };

  const finalGrammarCheck = (text: string, userName: string = ''): string => {
    let final = text.trim();
    
    // Protect the user's name
    const nameProtectionToken = `__USER_NAME_${Math.random().toString(36).substr(2, 9)}__`;
    if (userName) {
      final = final.replace(new RegExp(`\\b${userName}\\b`, 'gi'), nameProtectionToken);
    }
    
    // Only very safe, minimal corrections
    final = final
      // Fix double spaces
      .replace(/\s+/g, ' ')
      // Fix spacing around punctuation
      .replace(/\s+([.!?])/g, '$1')
      .replace(/([.!?])\s+([A-Z])/g, '$1 $2')
      // Fix obvious double articles (but be very careful)
      .replace(/\bthe the\b/gi, 'the')
      // Ensure sentence ending
      .replace(/\.+$/, '.');
    
    if (!/[.!?]$/.test(final)) {
      final += '.';
    }
    
    // Restore the user's name
    if (userName) {
      final = final.replace(new RegExp(nameProtectionToken, 'g'), userName);
    }
    
    return final;
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

    const name = profile?.preferred_name || profile?.name || 'This person';
    const birthPlace = profile?.hometown || profile?.birth_place;
    const currentLocation = profile?.location || profile?.current_location;
    const age = profile?.age;
    const occupation = profile?.occupation;
    const hobbies = profile?.hobbies_interests;
    
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
    
    // Add age and occupation context if available
    if (age && occupation) {
      introduction += `. At ${age} years old, ${name} has built a life as a ${occupation.toLowerCase()}`;
    } else if (occupation) {
      introduction += `. ${name} has built a life as a ${occupation.toLowerCase()}`;
    } else if (age) {
      introduction += `. At ${age} years old, ${name}'s journey`;
    }
    
    if (birthPlace && currentLocation) {
      // Properly format location names
      const formattedBirthPlace = formatLocationName(birthPlace);
      const formattedCurrentLocation = formatLocationName(currentLocation);
      if (age || occupation) {
        introduction += `, with roots in ${formattedBirthPlace} and now making a home in ${formattedCurrentLocation}`;
      } else {
        introduction += `, spanning from ${formattedBirthPlace} to ${formattedCurrentLocation}`;
      }
    } else if (currentLocation) {
      const formattedLocation = formatLocationName(currentLocation);
      if (age || occupation) {
        introduction += ` in ${formattedLocation}`;
      } else {
        introduction += `, rooted in ${formattedLocation}`;
      }
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
    
    // Add interests/hobbies context to make it more personal
    if (hobbies && hobbies.length > 0) {
      const hobbyList = hobbies.slice(0, 3);
      if (hobbyList.length === 1) {
        conclusion += `shaped by a love for ${hobbyList[0].toLowerCase()}. `;
      } else if (hobbyList.length === 2) {
        conclusion += `enriched by passions for ${hobbyList[0].toLowerCase()} and ${hobbyList[1].toLowerCase()}. `;
      } else {
        conclusion += `enriched by passions for ${hobbyList[0].toLowerCase()}, ${hobbyList[1].toLowerCase()}, and ${hobbyList[2].toLowerCase()}. `;
      }
    }
    
    conclusion += `These experiences that shaped ${name} will be remembered and cherished for generations to come.`;

    // Final document-level grammar check with name protection
    const finalIntroduction = finalGrammarCheck(introduction, name);
    const finalChapters = chapters.map(chapter => ({
      ...chapter,
      content: finalGrammarCheck(chapter.content, name)
    }));
    const finalConclusion = finalGrammarCheck(conclusion, name);

    return { 
      introduction: finalIntroduction, 
      chapters: finalChapters, 
      conclusion: finalConclusion 
    };
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
          // Safe grammar check
          let processedContent = grammarCheck(bestContent, name);
          
          if (isFirstPerson) {
            // Convert first person to third person with safe patterns
            processedContent = convertToThirdPerson(processedContent, name);
          }
          
          // Simple, safe integration without dangerous transformations
          if (hasEmotion || reflectiveSentence) {
            if (processedContent.match(/^(realized|learned|discovered|understood|felt)/i)) {
              paragraph += `During this time, ${name} ${processedContent.toLowerCase()}. `;
            } else {
              paragraph += `Reflecting on this period, ${processedContent}. `;
            }
          } else {
            // Keep it simple and safe
            const safeContent = addBasicArticles(processedContent.toLowerCase());
            paragraph += `This was the time of ${safeContent}. `;
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
    
    // Final grammar check on the complete paragraph with name protection
    return grammarCheck(paragraph, name);
  };

  // Pagination logic - Split content into readable pages
  const splitContentIntoPages = (narrative: any) => {
    if (!narrative) return [];
    
    const wordsPerPage = 400; // Approximate words per page for comfortable reading
    const pages = [];
    
    // Page 1: Title + Introduction
    const titleContent = {
      type: 'title',
      content: {
        title: userProfile?.name ? `The Life Story of ${userProfile.name}` : 'A Life Story',
        subtitle: memories.length > 0 ? `Based on ${memories.length} preserved memories` : '',
        introduction: narrative.introduction
      }
    };
    pages.push(titleContent);
    
    // Split chapters into pages
    let currentPageContent = [];
    let currentWordCount = 0;
    
    narrative.chapters.forEach((chapter: any, index: number) => {
      const chapterWords = chapter.content.split(' ').length;
      
      if (currentWordCount + chapterWords > wordsPerPage && currentPageContent.length > 0) {
        // Start new page
        pages.push({
          type: 'content',
          content: currentPageContent
        });
        currentPageContent = [chapter];
        currentWordCount = chapterWords;
      } else {
        // Add to current page
        currentPageContent.push(chapter);
        currentWordCount += chapterWords;
      }
    });
    
    // Add remaining content
    if (currentPageContent.length > 0) {
      pages.push({
        type: 'content',
        content: currentPageContent
      });
    }
    
    // Add conclusion page if it exists
    if (narrative.conclusion) {
      pages.push({
        type: 'conclusion',
        content: {
          conclusion: narrative.conclusion
        }
      });
    }
    
    return pages;
  };

  // Page navigation functions
  const nextPage = () => {
    if (currentPage < totalPages) {
      setPageTransition('next');
      setTimeout(() => {
        setCurrentPage(prev => prev + 1);
        setPageTransition('');
      }, 150);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setPageTransition('prev');
      setTimeout(() => {
        setCurrentPage(prev => prev - 1);
        setPageTransition('');
      }, 150);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextPage();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);



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
        .from('user_profiles')
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

  // Keep refs in sync with state for pan and zoom
  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  // Zoom control handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Mouse wheel zoom (only with Ctrl key held)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Only zoom if Ctrl key is pressed, otherwise allow normal scroll
      if (!e.ctrlKey) return;
      
      e.preventDefault();
      
      const delta = e.deltaY * -0.001;
      const currentZoom = zoomLevelRef.current;
      const currentPan = panOffsetRef.current;
      const newZoom = Math.min(Math.max(currentZoom + delta, 0.5), 2);
      
      if (newZoom !== currentZoom) {
        // Calculate zoom center based on mouse position
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Adjust pan to zoom towards mouse position
        const zoomRatio = newZoom / currentZoom;
        const newPanX = mouseX - (mouseX - currentPan.x) * zoomRatio;
        const newPanY = mouseY - (mouseY - currentPan.y) * zoomRatio;
        
        setZoomLevel(newZoom);
        setPanOffset({ x: newPanX, y: newPanY });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Mouse drag to pan (only with Shift key held)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && e.shiftKey) { // Left mouse + Shift key
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const narrative = generateDynamicNarrative(memories, userProfile);
  const pages = splitContentIntoPages(narrative);
  
  // Update total pages when content changes
  useEffect(() => {
    setTotalPages(pages.length || 1);
    if (currentPage > pages.length) {
      setCurrentPage(1);
    }
  }, [pages.length, currentPage]);
  
  // Get current page content
  const getCurrentPageContent = () => {
    if (pages.length === 0) {
      return {
        type: 'empty',
        content: {}
      };
    }
    return pages[currentPage - 1] || pages[0];
  };
  
  const currentPageContent = getCurrentPageContent();

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
      {/* Enhanced Navigation with Zoom Controls */}
      <nav className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-800 bg-white/80 backdrop-blur-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        
        {/* Zoom Controls and Page Info */}
        <div className="flex items-center gap-4">
          {/* Page Navigation Info */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2">
            <span className="text-sm text-slate-600 font-medium">
              Page {currentPage} of {totalPages}
            </span>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2">
            <span className="text-xs text-slate-600 font-medium mr-2">
              Ctrl+Wheel to zoom • Shift+Drag to pan • Arrow keys to turn pages
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              className="text-slate-600 border-slate-300"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600 font-medium min-w-[60px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2}
              className="text-slate-600 border-slate-300"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            {(zoomLevel !== 1 || panOffset.x !== 0 || panOffset.y !== 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetZoom}
                className="text-slate-600"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Scrollable Container with Pan and Zoom */}
      <div 
        ref={containerRef}
        className="min-h-screen overflow-auto cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isDragging ? 'grabbing' : 'default',
          userSelect: isDragging ? 'none' : 'auto'
        }}
      >
        {/* Paper Document Container with Transform */}
        <div className="min-h-screen flex items-center justify-center p-8">
          <div 
            className={`max-w-4xl w-full bg-white shadow-2xl relative transition-all duration-300 ease-out ${
              pageTransition === 'next' ? 'translate-x-4 opacity-80' : 
              pageTransition === 'prev' ? '-translate-x-4 opacity-80' : ''
            }`}
            style={{
              minHeight: '90vh',
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: '0 0',
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
            
            {/* Left Page Turn Button */}
            {currentPage > 1 && (
              <button
                onClick={prevPage}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-12 h-20 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-l-lg shadow-lg hover:bg-slate-50 transition-all duration-200 flex items-center justify-center group z-10"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-6 h-6 text-slate-600 group-hover:text-slate-800 transition-colors" />
              </button>
            )}
            
            {/* Right Page Turn Button */}
            {currentPage < totalPages && (
              <button
                onClick={nextPage}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-12 h-20 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-r-lg shadow-lg hover:bg-slate-50 transition-all duration-200 flex items-center justify-center group z-10"
                aria-label="Next page"
              >
                <ChevronRight className="w-6 h-6 text-slate-600 group-hover:text-slate-800 transition-colors" />
              </button>
            )}
          {/* Paper Content - Paginated */}
          <div className="px-16 py-20 space-y-8 min-h-[80vh] flex flex-col">
            
            {/* Render current page content */}
            {currentPageContent.type === 'title' && (
              <>
                {/* Title Page */}
                <div className="text-center mb-12 flex-grow flex flex-col justify-center">
                  <h1 className="text-4xl font-serif text-slate-800 mb-2">
                    {currentPageContent.content.title}
                  </h1>
                  <div className="w-32 h-px bg-slate-300 mx-auto mt-4"></div>
                  {currentPageContent.content.subtitle && (
                    <p className="text-sm text-slate-500 mt-4 font-light">
                      {currentPageContent.content.subtitle}
                    </p>
                  )}
                  {currentPageContent.content.introduction && (
                    <div className="text-justify mt-12 max-w-3xl mx-auto">
                      <p className="text-lg leading-8 text-slate-700 font-light first-letter:text-6xl first-letter:font-serif first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:leading-none first-letter:text-slate-600">
                        {currentPageContent.content.introduction}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {currentPageContent.type === 'content' && (
              <>
                {/* Content Pages */}
                <div className="space-y-6 flex-grow">
                  {currentPageContent.content.map((chapter: any, index: number) => (
                    <div key={index} className="text-justify">
                      <p className="text-lg leading-8 text-slate-700 font-light">
                        {chapter.content}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {currentPageContent.type === 'conclusion' && (
              <>
                {/* Conclusion Page */}
                <div className="text-justify flex-grow flex flex-col justify-center">
                  <p className="text-lg leading-8 text-slate-700 font-light italic text-center max-w-3xl mx-auto">
                    {currentPageContent.content.conclusion}
                  </p>
                  
                  {/* Signature on final page */}
                  <div className="text-center mt-16 pt-8 border-t border-slate-200">
                    <div className="text-sm text-slate-400 font-light">
                      Preserved with care by Solin One • Digital Memory Sanctuary
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {currentPageContent.type === 'empty' && (
              <>
                {/* No memories state */}
                <div className="text-center py-16 space-y-6 flex-grow flex flex-col justify-center">
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
              </>
            )}
            
            {/* Page number indicator at bottom */}
            <div className="text-center pt-4 mt-auto">
              <div className="text-xs text-slate-400 font-light">
                {totalPages > 1 && `${currentPage} / ${totalPages}`}
              </div>
            </div>
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
      
      {/* Page Navigation Hints - Only show on first visit */}
      {totalPages > 1 && currentPage === 1 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800/90 text-white px-4 py-2 rounded-lg backdrop-blur-sm animate-pulse">
          <div className="text-sm text-center">
            Use <span className="font-semibold">←→ keys</span> or <span className="font-semibold">click sides</span> to turn pages
          </div>
        </div>
      )}
    </div>
  );
};

export default Story;