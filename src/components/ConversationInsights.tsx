import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tag, TrendingUp, Calendar, MapPin, User, Heart, Briefcase, Home, Plane } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  conversationInsightsService,
  INSIGHTS_EVENTS,
  ExtractedTag,
  InsightsStatus
} from '@/lib/conversationInsightsService';

interface ConversationInsightsProps {
  conversationId?: string;
  tags?: ExtractedTag[];
}

/**
 * ConversationInsights Component
 * 
 * Displays color-coded tags extracted from conversations in real-time.
 * 
 * ARCHITECTURE: Uses an event-based system completely decoupled from React's render cycle.
 * The conversationInsightsService handles all message processing independently,
 * and this component only subscribes to update events.
 * 
 * This design ensures that:
 * 1. Voice agent message handlers don't trigger React re-renders
 * 2. Tag extraction runs in browser idle time (requestIdleCallback)
 * 3. UI updates are batched and debounced (2+ seconds)
 */
export const ConversationInsights: React.FC<ConversationInsightsProps> = ({
  conversationId,
  tags = []
}) => {
  const { user } = useAuth();
  const [dbTags, setDbTags] = useState<ExtractedTag[]>(tags);
  const [liveTags, setLiveTags] = useState<ExtractedTag[]>([]);
  const [status, setStatus] = useState<InsightsStatus>('idle');
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track if we've fetched from DB
  const hasFetchedRef = useRef(false);

  // Subscribe to insights service events
  useEffect(() => {
    // Subscribe to tag updates
    const unsubTags = conversationInsightsService.constructor.prototype.constructor.subscribe
      ? (conversationInsightsService.constructor as any).subscribe(
          INSIGHTS_EVENTS.TAGS_UPDATED,
          (detail: { tags: ExtractedTag[] }) => {
            setLiveTags(detail.tags);
          }
        )
      : null;

    // Manual subscription since static method
    const handleTagsUpdated = (event: Event) => {
      const { tags } = (event as CustomEvent).detail;
      setLiveTags(tags);
    };
    
    const handleStatusChanged = (event: Event) => {
      const { status } = (event as CustomEvent).detail;
      setStatus(status);
    };
    
    const handleConversationStarted = () => {
      setIsLive(true);
      setLiveTags([]);
    };
    
    const handleConversationEnded = (event: Event) => {
      setIsLive(false);
      const { tags } = (event as CustomEvent).detail;
      if (tags?.length > 0) {
        setLiveTags(tags);
      }
    };

    // Add event listeners
    window.addEventListener(INSIGHTS_EVENTS.TAGS_UPDATED, handleTagsUpdated);
    window.addEventListener(INSIGHTS_EVENTS.STATUS_CHANGED, handleStatusChanged);
    window.addEventListener(INSIGHTS_EVENTS.CONVERSATION_STARTED, handleConversationStarted);
    window.addEventListener(INSIGHTS_EVENTS.CONVERSATION_ENDED, handleConversationEnded);

    // Initialize state from service
    setLiveTags(conversationInsightsService.getTags());
    setStatus(conversationInsightsService.getStatus());

    return () => {
      if (unsubTags) unsubTags();
      window.removeEventListener(INSIGHTS_EVENTS.TAGS_UPDATED, handleTagsUpdated);
      window.removeEventListener(INSIGHTS_EVENTS.STATUS_CHANGED, handleStatusChanged);
      window.removeEventListener(INSIGHTS_EVENTS.CONVERSATION_STARTED, handleConversationStarted);
      window.removeEventListener(INSIGHTS_EVENTS.CONVERSATION_ENDED, handleConversationEnded);
    };
  }, []);

  // Fetch tags from database when NOT in live conversation
  // CRITICAL: Use conversationId prop (not isLive state) to detect active voice sessions
  // This prevents database operations during voice agent connections
  useEffect(() => {
    // IMMEDIATELY skip if there's an active conversation - prevents interference with voice agent
    if (conversationId) {
      console.log('⏭️ ConversationInsights: Skipping DB fetch - active conversation:', conversationId);
      return;
    }
    
    // Skip if in live conversation state or already fetched
    if (isLive || hasFetchedRef.current) return;
    
    // Skip if no user or already have tags
    if (!user?.id || tags.length > 0 || dbTags.length > 0) return;

    // Delay fetch to ensure it doesn't run during conversation startup
    const timeoutId = setTimeout(async () => {
      // Double-check conversation state before executing
      if (conversationId || isLive) {
        console.log('⏭️ ConversationInsights: Cancelled DB fetch - conversation started');
        return;
      }
      
      hasFetchedRef.current = true;
      
      try {
        const { data: recordings, error: fetchError } = await supabase
          .from('voice_recordings')
          .select('topics, transcript_text')
          .eq('user_id', user.id.toString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        // Final check before state update
        if (conversationId || isLive) {
          console.log('⏭️ ConversationInsights: Skipped state update - conversation active');
          return;
        }

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
      }
    }, 2000); // 2 second delay to allow conversation to start first

    return () => clearTimeout(timeoutId);
  }, [conversationId, isLive, tags, user?.id, dbTags.length]);

  // Determine which tags to display
  const displayTags = liveTags.length > 0 ? liveTags : dbTags;

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

  const getStatusText = () => {
    if (isLive) {
      switch (status) {
        case 'processing':
          return 'Analyzing...';
        case 'listening':
          return 'Live';
        default:
          return 'Live';
      }
    }
    return 'From last conversation';
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 pb-3 border-b" style={{ borderColor: 'rgba(229, 231, 235, 0.5)' }}>
        <h2 className="font-manrope text-lg lg:text-xl font-semibold text-foreground tracking-tight">
          Conversation Insights
        </h2>
        <p className="font-manrope text-xs lg:text-sm text-muted-foreground mt-1">
          {isLive ? 'Extracting insights in real-time...' : 'Tags extracted from your conversation'}
        </p>
      </div>

      {/* Tags Section */}
      <Card className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-manrope text-xs lg:text-sm font-medium text-foreground">🏷️ Tags Extracted</h4>
            <span className={`font-manrope text-xs ${isLive ? 'text-green-600 animate-pulse' : 'text-muted-foreground'}`}>
              {getStatusText()}
            </span>
          </div>

          {error ? (
            <div className="text-center py-8 text-destructive">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-manrope text-xs lg:text-sm">{error}</p>
            </div>
          ) : displayTags.length === 0 ? (
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
