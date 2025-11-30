import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tag, TrendingUp, Calendar, MapPin, User, Heart, Briefcase, Home, Plane } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ExtractedTag {
  name: string;
  category: 'people' | 'places' | 'emotions' | 'activities' | 'family' | 'memories' | 'work' | 'travel';
  count: number;
}

interface ConversationMessage {
  role: string;
  text: string;
}

// Keywords for real-time extraction
const CATEGORY_KEYWORDS: Record<ExtractedTag['category'], string[]> = {
  family: ['mom', 'dad', 'mother', 'father', 'sister', 'brother', 'grandma', 'grandpa', 'grandmother', 'grandfather', 'aunt', 'uncle', 'cousin', 'family', 'parent', 'child', 'son', 'daughter', 'wife', 'husband', 'spouse'],
  people: ['friend', 'colleague', 'neighbor', 'boss', 'teacher', 'doctor', 'mentor', 'partner'],
  places: ['home', 'house', 'school', 'university', 'college', 'office', 'hospital', 'park', 'beach', 'mountain', 'city', 'country', 'town', 'village', 'restaurant', 'cafe'],
  emotions: ['happy', 'sad', 'angry', 'excited', 'nervous', 'anxious', 'proud', 'grateful', 'love', 'joy', 'fear', 'hope', 'worried', 'peaceful', 'content', 'frustrated', 'surprised'],
  activities: ['birthday', 'wedding', 'graduation', 'holiday', 'vacation', 'celebration', 'party', 'dinner', 'lunch', 'breakfast', 'meeting', 'event', 'ceremony'],
  memories: ['remember', 'childhood', 'growing up', 'years ago', 'back then', 'memory', 'memories', 'experience', 'story', 'moment'],
  work: ['job', 'career', 'work', 'project', 'business', 'company', 'promotion', 'interview', 'meeting', 'presentation'],
  travel: ['trip', 'travel', 'vacation', 'flight', 'journey', 'adventure', 'explore', 'visit', 'tour']
};

interface ConversationInsightsProps {
  conversationId?: string;
  tags?: ExtractedTag[];
  messages?: ConversationMessage[];
}

// Extract tags from text - runs independently, never blocks caller
const extractTagsFromMessages = (messages: ConversationMessage[]): ExtractedTag[] => {
  if (messages.length === 0) return [];

  const tagCounts: Record<string, { category: ExtractedTag['category']; count: number }> = {};
  const allText = messages.map(m => m.text.toLowerCase()).join(' ');

  Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = allText.match(regex);
      if (matches && matches.length > 0) {
        const tagName = keyword.charAt(0).toUpperCase() + keyword.slice(1);
        if (tagCounts[tagName]) {
          tagCounts[tagName].count += matches.length;
        } else {
          tagCounts[tagName] = {
            category: category as ExtractedTag['category'],
            count: matches.length
          };
        }
      }
    });
  });

  return Object.entries(tagCounts)
    .map(([name, data]) => ({
      name,
      category: data.category,
      count: data.count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

/**
 * ConversationInsights Component
 * 
 * Displays color-coded tags extracted from conversations in real-time.
 * IMPORTANT: Uses debounced async processing to NEVER block the voice agent.
 */
export const ConversationInsights: React.FC<ConversationInsightsProps> = ({
  conversationId,
  tags = [],
  messages = []
}) => {
  const { user } = useAuth();
  const [dbTags, setDbTags] = useState<ExtractedTag[]>(tags);
  const [extractedTags, setExtractedTags] = useState<ExtractedTag[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for debouncing - ensures extraction never blocks voice agent
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedLengthRef = useRef(0);

  // Debounced async extraction - runs independently of voice agent
  useEffect(() => {
    // Only process if we have new messages
    if (messages.length === 0 || messages.length === lastProcessedLengthRef.current) {
      return;
    }

    // Clear any pending extraction
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Schedule extraction with debounce - never blocks the main thread
    debounceTimerRef.current = setTimeout(() => {
      // Use requestIdleCallback if available, otherwise setTimeout
      const processExtraction = () => {
        const extracted = extractTagsFromMessages(messages);
        lastProcessedLengthRef.current = messages.length;
        
        if (extracted.length > 0) {
          setExtractedTags(extracted);
        }
      };

      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(processExtraction, { timeout: 2000 });
      } else {
        setTimeout(processExtraction, 0);
      }
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [messages]);

  // Determine which tags to display
  const displayTags = extractedTags.length > 0 ? extractedTags : dbTags;
  const isLiveExtracting = messages.length > 0;

  // Fetch tags from voice_recordings table (fallback when no live messages)
  useEffect(() => {
    const fetchConversationTags = async () => {
      if (!user?.id || tags.length > 0 || messages.length > 0) return;
      
      setIsExtracting(true);
      setError(null);
      
      try {
        const { data: recordings, error: fetchError } = await supabase
          .from('voice_recordings')
          .select('topics, transcript_text')
          .eq('user_id', user.id.toString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        if (recordings && recordings.length > 0 && recordings[0].topics) {
          const topics = recordings[0].topics as string[];
          
          const tagsFromTopics: ExtractedTag[] = topics.map(topic => ({
            name: topic.charAt(0).toUpperCase() + topic.slice(1),
            category: 'activities' as ExtractedTag['category'],
            count: 1
          }));

          const aggregated = tagsFromTopics.reduce((acc, tag) => {
            const existing = acc.find(t => t.name === tag.name);
            if (existing) {
              existing.count++;
            } else {
              acc.push({ ...tag });
            }
            return acc;
          }, [] as ExtractedTag[]);

          setDbTags(aggregated);
        }
      } catch (err) {
        console.error('Error fetching conversation tags:', err);
        setError('Failed to load conversation insights');
      } finally {
        setIsExtracting(false);
      }
    };

    fetchConversationTags();
  }, [conversationId, tags, user?.id, messages.length]);

  const getCategoryColor = (category: ExtractedTag['category']) => {
    const colors = {
      family: 'from-blue-500 to-blue-600',
      people: 'from-purple-500 to-purple-600',
      places: 'from-green-500 to-green-600',
      emotions: 'from-pink-500 to-pink-600',
      activities: 'from-orange-500 to-orange-600',
      memories: 'from-cyan-500 to-cyan-600',
      work: 'from-slate-500 to-slate-600',
      travel: 'from-teal-500 to-teal-600',
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  const getCategoryIcon = (category: ExtractedTag['category']) => {
    const icons = {
      family: User,
      people: User,
      places: MapPin,
      emotions: Heart,
      activities: Calendar,
      memories: Tag,
      work: Briefcase,
      travel: Plane,
    };
    const Icon = icons[category] || Tag;
    return <Icon className="w-3 h-3" />;
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 pb-3 border-b" style={{ borderColor: 'rgba(229, 231, 235, 0.5)' }}>
        <h2 className="font-manrope text-lg lg:text-xl font-semibold text-foreground tracking-tight">
          Conversation Insights
        </h2>
        <p className="font-manrope text-xs lg:text-sm text-muted-foreground mt-1">
          {isLiveExtracting ? 'Extracting insights in real-time...' : 'Tags extracted from your conversation'}
        </p>
      </div>

      {/* Tags Section */}
      <Card className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-manrope text-xs lg:text-sm font-medium text-foreground">🏷️ Tags Extracted</h4>
            {(isExtracting || isLiveExtracting) && (
              <span className="font-manrope text-xs text-muted-foreground animate-pulse">
                {isLiveExtracting ? 'Live' : 'Analyzing...'}
              </span>
            )}
          </div>

          {error ? (
            <div className="text-center py-8 text-destructive">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-manrope text-xs lg:text-sm">{error}</p>
            </div>
          ) : displayTags.length === 0 && !isExtracting ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-manrope text-xs lg:text-sm">No tags extracted yet</p>
              <p className="font-manrope text-xs mt-1">Start a conversation to see insights</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayTags.map((tag, index) => (
                <button
                  key={`${tag.name}-${index}`}
                  className={`w-full group hover:scale-[1.02] transition-all duration-200`}
                >
                  <div
                    className={`
                      flex items-center justify-between p-3 rounded-lg
                      bg-gradient-to-r ${getCategoryColor(tag.category)}
                      text-white shadow-sm hover:shadow-md
                    `}
                  >
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(tag.category)}
                      <span className="font-manrope font-medium text-sm">{tag.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className="bg-white/20 text-white border-white/30 text-xs px-2 py-0.5"
                      >
                        +{tag.count}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {displayTags.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 text-xs"
            >
              View All Tags →
            </Button>
          )}
        </div>
      </Card>

      {/* Sentiment Analysis (Placeholder) */}
      <Card className="p-4 flex-1 flex flex-col">
        <h4 className="font-manrope text-xs lg:text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Sentiment Analysis
        </h4>
        <div className="flex-1 bg-gradient-to-r from-green-100 via-yellow-100 to-green-100 rounded-lg flex items-center justify-center">
          <p className="font-manrope text-xs text-muted-foreground">
            Sentiment analysis coming soon
          </p>
        </div>
      </Card>
    </div>
  );
};
