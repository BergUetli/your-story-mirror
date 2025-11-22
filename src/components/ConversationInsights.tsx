import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tag, TrendingUp, Calendar, MapPin, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ExtractedTag {
  name: string;
  category: 'people' | 'places' | 'emotions' | 'activities' | 'family' | 'memories';
  count: number;
}

// Map backend topics to frontend categories
const TOPIC_TO_CATEGORY_MAP: Record<string, ExtractedTag['category']> = {
  family: 'family',
  work: 'activities',
  travel: 'places',
  food: 'activities',
  health: 'activities',
  hobbies: 'activities',
  friends: 'people',
  education: 'activities',
  home: 'places',
  emotions: 'emotions',
};

interface ConversationInsightsProps {
  conversationId?: string;
  tags?: ExtractedTag[];
}

/**
 * ConversationInsights Component
 * 
 * Displays color-coded tags extracted from conversations post-call
 * Shows frequency counts and allows filtering of transcript
 */
export const ConversationInsights: React.FC<ConversationInsightsProps> = ({
  conversationId,
  tags = []
}) => {
  const { user } = useAuth();
  const [extractedTags, setExtractedTags] = useState<ExtractedTag[]>(tags);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch real tags from voice_recordings table
  useEffect(() => {
    const fetchConversationTags = async () => {
      if (!user?.id || tags.length > 0) return;
      
      setIsExtracting(true);
      setError(null);
      
      try {
        // Fetch the most recent conversation recording for this user
        const { data: recordings, error: fetchError } = await supabase
          .from('voice_recordings')
          .select('topics, transcript_text')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        if (recordings && recordings.length > 0 && recordings[0].topics) {
          const topics = recordings[0].topics as string[];
          
          // Convert backend topics to frontend tags with categories
          const tagsFromTopics: ExtractedTag[] = topics.map(topic => ({
            name: topic.charAt(0).toUpperCase() + topic.slice(1),
            category: TOPIC_TO_CATEGORY_MAP[topic] || 'activities',
            count: 1 // Will be updated with actual frequency in future
          }));

          // Aggregate duplicate topics
          const aggregated = tagsFromTopics.reduce((acc, tag) => {
            const existing = acc.find(t => t.name === tag.name);
            if (existing) {
              existing.count++;
            } else {
              acc.push({ ...tag });
            }
            return acc;
          }, [] as ExtractedTag[]);

          setExtractedTags(aggregated);
        }
      } catch (err) {
        console.error('Error fetching conversation tags:', err);
        setError('Failed to load conversation insights');
      } finally {
        setIsExtracting(false);
      }
    };

    fetchConversationTags();
  }, [conversationId, tags, user?.id]);

  const getCategoryColor = (category: ExtractedTag['category']) => {
    const colors = {
      family: 'from-blue-500 to-blue-600',
      people: 'from-purple-500 to-purple-600',
      places: 'from-green-500 to-green-600',
      emotions: 'from-pink-500 to-pink-600',
      activities: 'from-orange-500 to-orange-600',
      memories: 'from-cyan-500 to-cyan-600',
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  const getCategoryIcon = (category: ExtractedTag['category']) => {
    const icons = {
      family: User,
      people: User,
      places: MapPin,
      emotions: TrendingUp,
      activities: Calendar,
      memories: Tag,
    };
    const Icon = icons[category] || Tag;
    return <Icon className="w-3 h-3" />;
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Conversation Insights
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Tags extracted from your conversation
          </p>
        </div>
      </div>

      {/* Tags Section */}
      <Card className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-foreground">🏷️ Tags Extracted</h4>
            {isExtracting && (
              <span className="text-xs text-muted-foreground animate-pulse">
                Analyzing...
              </span>
            )}
          </div>

          {error ? (
            <div className="text-center py-8 text-destructive">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{error}</p>
            </div>
          ) : extractedTags.length === 0 && !isExtracting ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tags extracted yet</p>
              <p className="text-xs mt-1">Start a conversation to see insights</p>
            </div>
          ) : (
            <div className="space-y-2">
              {extractedTags.map((tag, index) => (
                <button
                  key={index}
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
                      <span className="font-medium text-sm">{tag.name}</span>
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

          {extractedTags.length > 0 && (
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

      {/* Sentiment Timeline (Placeholder) */}
      <Card className="p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Sentiment Timeline
        </h4>
        <div className="h-24 bg-gradient-to-r from-green-100 via-yellow-100 to-green-100 rounded-lg flex items-center justify-center">
          <p className="text-xs text-muted-foreground">
            Sentiment analysis coming soon
          </p>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-3">
        <h4 className="text-xs font-medium text-foreground mb-2">🔍 Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="text-xs h-8">
            📥 Export
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-8">
            📋 Copy
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-8">
            🔗 Share
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-8">
            ⭐ Save
          </Button>
        </div>
      </Card>
    </div>
  );
};
