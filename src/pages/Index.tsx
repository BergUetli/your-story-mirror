import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useConversation } from '@11labs/react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ModernVoiceAgent } from '@/components/ModernVoiceAgent';
import { intelligentPrompting } from '@/services/intelligentPrompting';
import { chunkMemoryContent } from '@/utils/memoryChunking';
import { narrativeAI, type NarrativeGenerationContext } from '@/services/narrativeAI';
// Dummy mode removed - always use real authentication
import { 
  Heart, 
  Clock, 
  Shield, 
  ArrowRight,
  Users,
  Lock,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Always use real user - no dummy mode in production
  const effectiveUser = user;
  
  const [isConnecting, setIsConnecting] = useState(false);
  const noEndBeforeRef = useRef(0);
  const isTogglingRef = useRef(false);
  const lastConnectedAtRef = useRef(0);
  const retryCountRef = useRef(0);
  const startConversationRef = useRef<(isRetry?: boolean) => Promise<void>>();

  // Biography topics tool for collecting general information about the user
  const saveBiographyTopicTool = useCallback(async (parameters: {
    topic_category: string;
    topic_title: string;
    content: string;
    context_notes?: string;
  }) => {
    const handoffId = `biography-${Date.now()}`;
    const logHandoff = (stage: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.log(`📖 [${handoffId}] BIOGRAPHY HANDOFF: ${stage} @ ${timestamp}`, data || '');
    };

    try {
      logHandoff('1️⃣ RECEIVED', { source: 'ElevenLabs voice agent', parameters });

      // Validate required fields
      const { topic_category, topic_title, content } = parameters;
      
      if (!topic_category || !topic_title || !content) {
        logHandoff('❌ VALIDATION FAILED', { 
          hasCategory: !!topic_category, 
          hasTitle: !!topic_title, 
          hasContent: !!content 
        });
        return 'Missing required fields. Please provide category, title, and content for the biographical topic.';
      }

      logHandoff('2️⃣ VALIDATED', { 
        category: topic_category, 
        title: topic_title, 
        contentLength: content.length 
      });

      // Use real authenticated user ID only
      if (!effectiveUser?.id) {
        logHandoff('❌ NO USER ID', { message: 'User must be logged in to save biography topics' });
        return 'You must be logged in to save biographical information. Please sign in and try again.';
      }

      const userId = effectiveUser.id;
      
      logHandoff('3️⃣ SUBMITTING TO DATABASE', { userId, category: topic_category, title: topic_title });

      const { data, error } = await supabase
        .from('biography_entries')
        .insert([{
          user_id: userId,
          topic_category: topic_category,
          topic_title: topic_title,
          content: content,
          context_notes: parameters.context_notes || null,
          source: 'solin_conversation'
        }])
        .select()
        .single();

      if (error) {
        logHandoff('❌ DATABASE ERROR', { error: error.message, code: error.code });
        throw error;
      }

      logHandoff('4️⃣ DATABASE COMMITTED', { entryId: data.id, title: data.topic_title });

      toast({
        title: 'Biography Topic Saved',
        description: `"${topic_title}" added to your biographical profile.`,
        duration: 5000,
      });

      logHandoff('✅ HANDOFF COMPLETE', {
        status: 'success',
        agentResponse: `Thank you for sharing about "${topic_title}". This biographical information enriches your life story beyond specific memories.`,
        note: 'Biography topic successfully saved'
      });

      return `Thank you for sharing about "${topic_title}". This biographical information has been saved and will help create a richer narrative of who you are as a person.`;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      logHandoff('❌ HANDOFF FAILED', { error: errorMsg });
      
      toast({
        title: 'Failed to save biography topic',
        description: errorMsg,
        variant: 'destructive',
      });
      
      return `Failed to save biographical information: ${errorMsg}. Please try again.`;
    }
  }, [effectiveUser?.id, toast]);

  // Background function to update persistent biography when new memories are added
  const tryUpdatePersistentBiography = useCallback(async (userId: string, newMemory: any) => {
    try {
      // This runs in background - don't block the conversation
      console.log('🧩 Attempting to update persistent biography with new memory:', newMemory.title);
      
      // Get current user profile and biography topics for context
      const [{ data: profile }, { data: topics }] = await Promise.all([
        supabase.from('users').select('*').eq('user_id', userId).single(),
        supabase.from('biography_entries').select('*').eq('user_id', userId)
      ]);

      // Get all memories for full context
      const { getGroupedMemories } = await import('@/utils/memoryGrouping');
      const allMemories = await getGroupedMemories(userId);
      
      const context: NarrativeGenerationContext = {
        user_profile: {
          name: profile?.name,
          birth_date: profile?.birth_date,
          birth_place: profile?.birth_place,
          current_location: profile?.current_location,
          age: profile?.birth_date ? new Date().getFullYear() - new Date(profile.birth_date).getFullYear() : undefined
        },
        memories: allMemories,
        biography_topics: (topics || []).map(t => ({
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

      // Try to insert the new memory into existing narrative
      await narrativeAI.insertMemoryIntoNarrative(userId, newMemory, context);
      
      console.log('✅ Persistent biography updated with new memory');
      
    } catch (error) {
      // Don't throw - this is background processing
      console.log('📝 Background biography update failed (this is OK):', error);
    }
  }, []);

  const saveMemoryTool = useCallback(async (parameters: { 
    title: string; 
    content: string; 
    tags?: string[];
    memory_date?: string;
    memory_location?: string;
  }) => {
    const handoffId = `handoff-${Date.now()}`;
    const logHandoff = (stage: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.log(`🔄 [${handoffId}] HANDOFF: ${stage} @ ${timestamp}`, data || '');
    };

    try {
      logHandoff('1️⃣ RECEIVED', { source: 'ElevenLabs voice agent', parameters });

      // Validate required fields from tool call
      const title = parameters?.title?.trim();
      const content = parameters?.content?.trim();
      const memoryDate = parameters?.memory_date?.trim();
      const memoryLocation = parameters?.memory_location?.trim();
      
      if (!title || !content) {
        logHandoff('❌ VALIDATION FAILED', { title, hasContent: !!content });
        return 'Missing required fields: title and content. Please ask the user to provide both before saving.';
      }
      
      // Check if we have date, place, and title for timeline eligibility
      const hasDatePlaceTitle = !!(memoryDate && memoryLocation && title);
      logHandoff('2️⃣ VALIDATED', { 
        title, 
        contentLength: content.length, 
        hasDate: !!memoryDate, 
        hasLocation: !!memoryLocation,
        timelineEligible: hasDatePlaceTitle
      });
      
      // Parse and format memory_date to handle various formats
      let formattedDate: string | null = null;
      if (parameters.memory_date) {
        const dateStr = parameters.memory_date.trim();
        // 1) YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          formattedDate = dateStr;
        }
        // 2) YYYY-MM
        else if (/^(\d{4})-(\d{1,2})$/.test(dateStr)) {
          const [, y, m] = dateStr.match(/^(\d{4})-(\d{1,2})$/)!;
          formattedDate = `${y}-${m.padStart(2, '0')}-01`;
        }
        // 3) YYYY
        else if (/^\d{4}$/.test(dateStr)) {
          formattedDate = `${dateStr}-01-01`;
        } 
        // 4) Any natural date string
        else {
          try {
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
              formattedDate = parsed.toISOString().split('T')[0];
            }
          } catch (_) { /* ignore */ }

          // 5) As a last resort, extract a 4-digit year inside the string
          if (!formattedDate) {
            const yr = dateStr.match(/\b(\d{4})\b/);
            if (yr) formattedDate = `${yr[1]}-01-01`;
          }
        }

        logHandoff('3️⃣ DATE PARSED', { input: dateStr, formatted: formattedDate });
      }
      
      // Use real authenticated user ID only
      if (!effectiveUser?.id) {
        logHandoff('❌ NO USER ID', { effectiveUser, message: 'User must be logged in to save memories' });
        return 'You must be logged in to save memories. Please sign in and try again.';
      }
      
      const userId = effectiveUser.id;
      
      logHandoff('4️⃣ CHUNKING CONTENT', { userId, title, contentLength: content.length });

      // Chunk the memory content if it's too long
      const chunks = chunkMemoryContent(content);
      
      logHandoff('5️⃣ SUBMITTING TO DATABASE', { 
        userId, 
        title, 
        hasDate: !!formattedDate,
        chunksCount: chunks.length,
        memoryGroupId: chunks[0].memoryGroupId
      });

      // Insert all chunks
      const memoryInserts = chunks.map(chunk => ({
        user_id: userId,
        title: chunks.length > 1 ? `${title} (Part ${chunk.chunkSequence}/${chunk.totalChunks})` : title,
        text: chunk.content,
        tags: Array.isArray(parameters.tags) && parameters.tags.length > 0 ? parameters.tags : null,
        memory_date: formattedDate,
        memory_location: parameters.memory_location?.trim?.() || null,
        memory_group_id: chunk.memoryGroupId,
        chunk_sequence: chunk.chunkSequence,
        total_chunks: chunk.totalChunks,
        image_urls: null,
      }));

      const { data, error } = await supabase
        .from('memories')
        .insert(memoryInserts)
        .select();

      if (error) {
        logHandoff('❌ DATABASE ERROR', { error: error.message, code: error.code });
        throw error;
      }

      logHandoff('6️⃣ DATABASE COMMITTED', { 
        chunksStored: data.length, 
        memoryGroupId: chunks[0].memoryGroupId,
        firstChunkId: data[0]?.id 
      });
      
      // Return success message with memory info
      const memoryGroupId = chunks[0].memoryGroupId;
      const memoryTitle = parameters.title; // Use original title without chunk numbering
      const primaryMemoryId = data[0]?.id; // First chunk ID for references
      
      logHandoff('7️⃣ SHOWING USER FEEDBACK', { 
        memoryGroupId, 
        memoryTitle, 
        timelineEligible: hasDatePlaceTitle,
        chunksCount: chunks.length 
      });
      
      // Different messaging based on whether memory will appear on timeline and chunking
      const chunkMessage = chunks.length > 1 ? ` (${chunks.length} parts)` : '';
      
      if (hasDatePlaceTitle) {
        toast({ 
          title: 'Memory saved to Timeline', 
          description: `"${memoryTitle}"${chunkMessage} has been preserved and will appear on your Timeline!`,
          duration: 5000,
        });
      } else {
        toast({ 
          title: 'Memory saved', 
          description: `"${memoryTitle}"${chunkMessage} has been preserved. Add date and location later to show on Timeline.`,
          duration: 5000,
        });
      }
      
      logHandoff('✅ HANDOFF COMPLETE', { 
        status: 'success',
        timelineEligible: hasDatePlaceTitle,
        chunksCount: chunks.length,
        memoryGroupId,
        agentResponse: hasDatePlaceTitle 
          ? `Memory "${memoryTitle}"${chunkMessage} saved successfully and will appear on your Timeline!` 
          : `Memory "${memoryTitle}"${chunkMessage} saved successfully. It won't appear on the Timeline without a date and location, but you can still query it later.`,
        note: 'No auto-navigation - user can continue conversation'
      });
      
      // Update conversation state safely (not passed to ElevenLabs)
      setConversationState(prev => ({
        ...prev,
        recentMemories: [
          { id: primaryMemoryId, title: memoryTitle, timestamp: new Date().toISOString() },
          ...prev.recentMemories.slice(0, 4) // Keep only 5 most recent
        ],
        totalMemoriesSaved: prev.totalMemoriesSaved + 1,
        recentTopics: [
          ...new Set([title, ...prev.recentTopics.slice(0, 9)]) // Keep unique topics, max 10
        ]
      }));

      // Trigger narrative AI integration for biography updates
      // This happens asynchronously in the background
      tryUpdatePersistentBiography(userId, {
        memory_group_id: chunks[0].memoryGroupId,
        id: primaryMemoryId,
        title: memoryTitle,
        text: content,
        memory_date: formattedDate,
        memory_location: parameters.memory_location?.trim?.() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Generate intelligent follow-up questions after saving memory
      generateIntelligentSuggestions({ id: primaryMemoryId, title: memoryTitle, text: content, created_at: new Date().toISOString() });
      
      // Return appropriate response based on timeline eligibility
      if (hasDatePlaceTitle) {
        return `Memory "${memoryTitle}"${chunkMessage} saved successfully and will appear on your Timeline! You can continue sharing stories or explore other memories.`;
      } else {
        return `Memory "${memoryTitle}"${chunkMessage} saved successfully! Since it doesn't have a specific date and location, it won't appear on the Timeline but you can still query it later. Would you like to add more details or continue with other stories?`;
      }
    } catch (error) {
      logHandoff('❌ HANDOFF FAILED', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      const errObj = (typeof error === 'object' && error) ? (error as any) : null;
      const errorMsg = errObj?.message || errObj?.error_description || errObj?.hint || JSON.stringify(errObj) || 'Unknown error';
      
      toast({
        title: 'Failed to save memory',
        description: errorMsg,
        variant: 'destructive',
      });
      
      return `Failed to save memory: ${errorMsg}. Please try again or ask the user to provide the date in a different format.`;
    }
  }, [effectiveUser?.id, toast]);

  const onConnectCb = useCallback(() => {
    const timestamp = new Date().toISOString();
    console.log(`🔌 CONNECTION HANDOFF: ✅ CONNECTED @ ${timestamp}`, {
      status: 'ElevenLabs voice agent connected',
      retryCount: retryCountRef.current
    });
    
    noEndBeforeRef.current = Date.now() + 2000;
    lastConnectedAtRef.current = Date.now();
    
    // Initialize conversation state for this session
    setConversationState(prev => ({
      ...prev,
      sessionStartTime: timestamp,
      // Keep existing data but mark new session
      recentTopics: [], // Reset for new session
      recentMemories: [], // Reset for new session
      totalMemoriesSaved: 0
    }));
    
    // Generate conversation starters based on user's memory history
    setTimeout(() => generateIntelligentSuggestions(), 1000);
    
    // Do not reset retryCountRef here; only reset after a stable connection duration
    // retryCountRef will be reset in onDisconnect if the session lasted long enough
    toast({ title: 'Connected', description: 'Start speaking naturally' });
  }, [toast]);

  const onDisconnectCb = useCallback(() => {
    const elapsed = Date.now() - lastConnectedAtRef.current;
    const timestamp = new Date().toISOString();
    
    console.log(`🔌 CONNECTION HANDOFF: 👋 DISCONNECTED @ ${timestamp}`, {
      status: 'ElevenLabs voice agent disconnected',
      sessionDuration: `${elapsed}ms`,
      retryCount: retryCountRef.current
    });
    
    const justConnected = elapsed < 3000;

    if (justConnected) {
      if (retryCountRef.current < 3) {
        retryCountRef.current += 1;
        const delay = 400 * retryCountRef.current;
        console.log(`⚠️ Early disconnect detected, retry #${retryCountRef.current} in ${delay}ms...`);
        setTimeout(() => startConversationRef.current?.(true), delay);
        return;
      } else {
        console.warn('⛔ Max early-disconnect retries reached. Not retrying automatically.');
        toast({
          title: 'Connection unstable',
          description: 'Auto-retry stopped after multiple attempts. Check mic permissions and try again.',
          variant: 'destructive',
        });
      }
    } else if (elapsed >= 8000) {
      // Stable session: reset retry counter
      retryCountRef.current = 0;
    }

    toast({ title: 'Disconnected', description: 'Voice session ended' });
  }, [toast]);

  const onErrorCb = useCallback((error: unknown) => {
    toast({
      title: 'Connection failed',
      description: typeof error === 'string' ? error : 'Please try again',
      variant: 'destructive',
    });
  }, [toast]);

  const [conversationMessages, setConversationMessages] = useState<Array<{role: string, text: string}>>([]);
  
  // Safe conversation state management - NOT passed to ElevenLabs to avoid crashes
  const [conversationState, setConversationState] = useState<{
    recentTopics: string[];
    recentMemories: Array<{id: string, title: string, timestamp: string}>;
    sessionStartTime: string;
    totalMemoriesSaved: number;
    userInteractionStyle: 'brief' | 'detailed';
    userMemoryProfile: any;
    suggestedQuestions: string[];
  }>({
    recentTopics: [],
    recentMemories: [],
    sessionStartTime: '',
    totalMemoriesSaved: 0,
    userInteractionStyle: 'detailed',
    userMemoryProfile: null,
    suggestedQuestions: []
  });

  const retrieveMemoryTool = useCallback(async (parameters: { query?: string; limit?: number }) => {
    try {
      const q = parameters?.query?.trim() ?? '';
      const maxResults = parameters?.limit ?? 5;
      console.log('🔍 Solin searching memories:', q, 'limit:', maxResults);
      if (!user?.id) return 'No user session; unable to access memories.';

      let query = supabase
        .from('memories')
        .select('id,title,created_at')
        .eq('user_id', effectiveUser.id)
        .order('created_at', { ascending: false })
        .limit(maxResults);

      // Only apply search filter if query is provided
      if (q) {
        const escaped = q.replace(/%/g, '%25').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const orFilter = `title.ilike.%${escaped}%,text.ilike.%${escaped}%`;
        query = query.or(orFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase retrieve error:', error);
        return 'Error retrieving memories.';
      }
      if (!data || data.length === 0) return 'No matching memories found.';

      // Return titles with IDs so agent can request details
      const result = data
        .map((m, i) => `${i + 1}. "${m.title}" (ID: ${m.id}, ${new Date(m.created_at as string).toLocaleDateString()})`)
        .join('\n');
      // Smart response based on conversation state
      let contextualNote = '';
      if (conversationState.recentMemories.length > 0) {
        const recentTitles = conversationState.recentMemories.map(m => m.title);
        const hasRecentMatch = data.some(m => recentTitles.includes(m.title));
        if (hasRecentMatch) {
          contextualNote = '\n\n💬 Note: Some of these were discussed recently in our conversation.';
        }
      }
      
      return `Found ${data.length} matching memories:\n${result}\n\nTo get full details, use get_memory_details with the ID.${contextualNote}`;
    } catch (error) {
      console.error('Error retrieving memory:', error);
      return 'Unable to retrieve memories at this time.';
    }
  }, [effectiveUser, conversationState.recentTopics, conversationState.recentMemories]);

  // Tool for Solin to get intelligent conversation suggestions
  const getConversationSuggestionsTool = useCallback(async (parameters: { context?: string; type?: 'followup' | 'starter' | 'reflection' }) => {
    try {
      const context = parameters?.context?.trim() || '';
      const type = parameters?.type || 'followup';
      
      console.log('🤖 Solin requesting conversation suggestions, type:', type, 'context:', context);
      
      if (!effectiveUser?.id) return 'No user session available for suggestions.';
      
      // Use existing suggestions if available and recent
      if (conversationState.suggestedQuestions.length > 0 && type === 'followup') {
        const suggestions = conversationState.suggestedQuestions.slice(0, 3);
        return `Here are some thoughtful questions you could ask:\n${suggestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nChoose one that feels most natural for the conversation flow.`;
      }
      
      // Generate new suggestions based on request type
      const profile = conversationState.userMemoryProfile;
      if (!profile) {
        // Fallback suggestions if no profile yet
        const fallbackQuestions = [
          "What's a moment from your past that always makes you smile?",
          "Tell me about a place that holds special meaning for you.",
          "What's something you've learned about yourself recently?"
        ];
        return `Here are some conversation starters:\n${fallbackQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
      }
      
      let suggestions: string[] = [];
      
      if (type === 'reflection') {
        suggestions = intelligentPrompting.generateReflectionPrompts(profile, context);
      } else if (type === 'starter') {
        suggestions = intelligentPrompting.generateConversationStarters(profile);
      } else {
        // Default to follow-up questions
        if (conversationState.recentMemories.length > 0) {
          const latestMemory = conversationState.recentMemories[0];
          suggestions = intelligentPrompting.generateFollowUpQuestions(
            { id: latestMemory.id, title: latestMemory.title, text: context, created_at: latestMemory.timestamp },
            profile,
            conversationState.recentTopics
          );
        } else {
          suggestions = intelligentPrompting.generateConversationStarters(profile);
        }
      }
      
      const response = `Based on your conversation patterns, here are some thoughtful questions:\n${suggestions.slice(0, 3).map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nPick one that resonates with the current conversation mood.`;
      
      console.log('💬 Generated suggestions for Solin:', suggestions.slice(0, 3));
      return response;
      
    } catch (error) {
      console.error('Error getting conversation suggestions:', error);
      return 'I\'m having trouble generating suggestions right now. Let\'s continue with what feels natural to ask.';
    }
  }, [effectiveUser, conversationState, intelligentPrompting]);

  const getMemoryDetailsTool = useCallback(async (parameters: { memory_id: string }) => {
    try {
      const memoryId = parameters?.memory_id?.trim();
      console.log('📖 Solin requesting details for memory:', memoryId);
      if (!user?.id) return 'No user session; unable to access memory details.';
      if (!memoryId) return 'Memory ID is required.';

      const { data, error } = await supabase
        .from('memories')
        .select('title,text,memory_date,memory_location,tags,created_at')
        .eq('id', memoryId)
        .eq('user_id', effectiveUser.id)
        .maybeSingle();

      if (error) {
        console.error('Supabase details error:', error);
        return 'Error retrieving memory details.';
      }
      if (!data) return 'Memory not found or access denied.';

      let details = `Title: ${data.title}\n\nContent: ${data.text}`;
      if (data.memory_date) details += `\n\nDate: ${new Date(data.memory_date).toLocaleDateString()}`;
      if (data.memory_location) details += `\nLocation: ${data.memory_location}`;
      if (data.tags && data.tags.length > 0) details += `\nTags: ${data.tags.join(', ')}`;
      
      // Add context if this memory was recently saved
      const isRecentlySaved = conversationState.recentMemories.some(m => m.id === memoryId);
      if (isRecentlySaved) {
        details += `\n\n🎆 Note: This memory was saved during our current conversation.`;
      }
      
      return details;
    } catch (error) {
      console.error('Error getting memory details:', error);
      return 'Unable to retrieve memory details at this time.';
    }
  }, [effectiveUser, conversationState.recentMemories]);

  // Biography editing tool for Solin integration
  const editBiographyTool = useCallback(async (parameters: {
    modification_request: string;
    focus_area?: string;
    tone_adjustment?: string;
  }) => {
    const handoffId = `biography-edit-${Date.now()}`;
    const logHandoff = (stage: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.log(`✍️ [${handoffId}] BIOGRAPHY EDIT: ${stage} @ ${timestamp}`, data || '');
    };

    try {
      logHandoff('1️⃣ RECEIVED', { source: 'Solin voice agent', parameters });

      const { modification_request } = parameters;
      
      if (!modification_request?.trim()) {
        logHandoff('❌ VALIDATION FAILED', { hasRequest: !!modification_request });
        return 'Please specify what changes you would like me to make to your biography.';
      }

      if (!effectiveUser?.id) {
        logHandoff('❌ NO USER ID', { message: 'User must be logged in to edit biography' });
        return 'You must be logged in to edit your biography. Please sign in and try again.';
      }

      const userId = effectiveUser.id;
      
      logHandoff('2️⃣ STARTING REGENERATION', { userId, request: modification_request });

      // Get current context for regeneration
      const [{ data: profile }, { data: topics }] = await Promise.all([
        supabase.from('users').select('*').eq('user_id', userId).single(),
        supabase.from('biography_entries').select('*').eq('user_id', userId)
      ]);

      const { getGroupedMemories } = await import('@/utils/memoryGrouping');
      const memories = await getGroupedMemories(userId);
      
      const context: NarrativeGenerationContext = {
        user_profile: {
          name: profile?.name,
          birth_date: profile?.birth_date,
          birth_place: profile?.birth_place,
          current_location: profile?.current_location,
          age: profile?.birth_date ? new Date().getFullYear() - new Date(profile.birth_date).getFullYear() : undefined
        },
        memories,
        biography_topics: (topics || []).map(t => ({
          topic_category: t.topic_category,
          topic_title: t.topic_title,
          content: t.content
        })),
        generation_preferences: {
          tone: parameters.tone_adjustment as any || 'reflective_optimistic',
          length: 'comprehensive',
          focus_themes: parameters.focus_area ? [parameters.focus_area] : ['growth', 'relationships', 'achievements']
        }
      };

      // Regenerate biography with user's modification request
      const updatedBiography = await narrativeAI.regenerateBiographyWithPrompt(
        userId,
        modification_request.trim(),
        context
      );

      logHandoff('3️⃣ BIOGRAPHY REGENERATED', { biographyId: updatedBiography.id });

      toast({
        title: 'Biography Updated',
        description: 'Your story has been regenerated based on your request',
        duration: 5000,
      });

      logHandoff('✅ HANDOFF COMPLETE', {
        status: 'success',
        biographyId: updatedBiography.id,
        chaptersCount: updatedBiography.chapters.length,
        agentResponse: `I've successfully updated your biography based on your request: "${modification_request}". The changes have been applied throughout your story.`
      });

      return `I've successfully updated your biography based on your request. Your story has been regenerated with the changes you requested: "${modification_request}". You can view the updated version on your Story page.`;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      logHandoff('❌ HANDOFF FAILED', { error: errorMsg });
      
      toast({
        title: 'Failed to update biography',
        description: errorMsg,
        variant: 'destructive',
      });
      
      return `I wasn't able to update your biography: ${errorMsg}. Please try again or let me know if you need help with a different approach.`;
    }
  }, [effectiveUser?.id, toast]);

  // Generate intelligent follow-up questions based on user's memory patterns
  const generateIntelligentSuggestions = useCallback(async (latestMemory?: any) => {
    try {
      if (!effectiveUser?.id) {
        console.log('🧠 No user ID, using fallback suggestions');
        // Provide fallback suggestions without user data
        const fallbackSuggestions = [
          "What's a moment from your past that always makes you smile?",
          "Tell me about a place that holds special meaning for you.",
          "What's something you've learned about yourself recently?"
        ];
        setConversationState(prev => ({
          ...prev,
          suggestedQuestions: fallbackSuggestions
        }));
        return;
      }
      
      // Fetch user's recent memories to analyze patterns
      console.log('🧠 Fetching memories for intelligent analysis...');
      const { data: memories, error } = await supabase
        .from('memories')
        .select('id,title,text,memory_date,memory_location,tags,created_at')
        .eq('user_id', effectiveUser.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.warn('⚠️ Could not fetch memories for analysis:', error);
        // Use basic suggestions if database fails
        const basicSuggestions = [
          "What's a childhood memory that shaped who you are?",
          "Tell me about someone who had a big impact on your life.",
          "What's a moment you'd want your family to remember?"
        ];
        setConversationState(prev => ({
          ...prev,
          suggestedQuestions: basicSuggestions
        }));
        return;
      }
      
      if (!memories || memories.length === 0) {
        console.log('🧠 No memories found, using starter suggestions');
        const starterSuggestions = [
          "What's your earliest childhood memory?",
          "Tell me about your hometown and what made it special.",
          "What's a family tradition that means a lot to you?"
        ];
        setConversationState(prev => ({
          ...prev,
          suggestedQuestions: starterSuggestions
        }));
        return;
      }
      
      // Analyze user's memory profile
      console.log(`🧠 Analyzing ${memories.length} memories for patterns...`);
      const profile = intelligentPrompting.analyzeMemoryProfile(memories);
      
      let suggestions: string[] = [];
      
      if (latestMemory) {
        // Generate follow-up questions for the just-saved memory
        suggestions = intelligentPrompting.generateFollowUpQuestions(
          latestMemory,
          profile,
          conversationState.recentTopics
        );
      } else {
        // Generate conversation starters
        suggestions = intelligentPrompting.generateConversationStarters(profile);
      }
      
      // Update state with profile and suggestions
      setConversationState(prev => ({
        ...prev,
        userMemoryProfile: profile,
        suggestedQuestions: suggestions
      }));
      
      console.log(`🧠 Generated ${suggestions.length} intelligent suggestions:`, suggestions);
      
    } catch (error) {
      console.error('❌ Error generating intelligent suggestions:', error);
      // Always provide fallback suggestions
      const fallbackSuggestions = [
        "What's something that happened recently that you'd like to remember?",
        "Tell me about a person who influenced your life.",
        "What's a decision you made that you're proud of?"
      ];
      setConversationState(prev => ({
        ...prev,
        suggestedQuestions: fallbackSuggestions
      }));
    }
  }, [effectiveUser, conversationState.recentTopics, supabase]);

  // Static agent instructions - no memory context to avoid filling context window
  const agentInstructions = `You are Solin, a warm AI voice companion helping users preserve their life stories. You have access to these powerful tools:

1. save_memory: Save new memories when users share stories. IMPORTANT: For memories to appear on the Timeline, they need title, content, date (memory_date), and location (memory_location). Without date and location, memories are still saved but won't show on Timeline.
2. retrieve_memory: Search through existing memories when users ask about past conversations.
3. get_memory_details: Get full details of a specific memory by ID.
4. get_conversation_suggestions: Get intelligent, personalized follow-up questions based on the user's memory patterns and conversation history.
5. close_conversation: Use this when the user wants to end the conversation. This properly communicates the closure and saves the session.

CONVERSATION CLOSURE:
- When user indicates they want to end the conversation ("I'm done", "let's stop", "save and end", etc.), use close_conversation tool
- This ensures proper handoff and session closure communication
- The tool handles the technical aspects of closing the ElevenLabs session

IMPORTANT CONVERSATION FLOW:
- After a user shares a memory, use get_conversation_suggestions with type="followup" to get personalized follow-up questions
- If conversation stalls, use get_conversation_suggestions with type="reflection" to get thoughtful prompts
- For new conversations, use get_conversation_suggestions with type="starter" to get personalized conversation starters
- When saving memories, gently prompt for date and location if missing: "When did this happen?" and "Where were you?"

The suggestions are tailored to each user's memory patterns, preferred topics, and conversation style. Always choose the most natural question from the suggestions rather than creating generic ones.

Keep responses brief and conversational. Focus on helping users explore meaningful moments through intelligent, personalized questioning.`;

  // Enhanced conversation closing tool for ElevenLabs agent communication
  const closeConversationTool = useCallback(async (parameters: {
    summary?: string;
    memory_count?: number;
    final_message?: string;
  }) => {
    const handoffId = `close-${Date.now()}`;
    const logHandoff = (stage: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.log(`🔚 [${handoffId}] CLOSE HANDOFF: ${stage} @ ${timestamp}`, data || '');
    };

    try {
      logHandoff('1️⃣ RECEIVED CLOSE REQUEST', { 
        source: 'ElevenLabs voice agent', 
        parameters,
        sessionMemories: conversationState.totalMemoriesSaved
      });

      const summary = parameters?.summary || 'User requested to end conversation';
      const memoryCount = parameters?.memory_count || conversationState.totalMemoriesSaved;
      const finalMessage = parameters?.final_message || 'Thank you for sharing your memories!';

      logHandoff('2️⃣ PREPARED CLOSURE', { summary, memoryCount, finalMessage });

      // Show user feedback about conversation closure
      toast({ 
        title: 'Conversation Saved', 
        description: `Session ended. ${memoryCount} memories preserved.`,
        duration: 5000,
      });

      logHandoff('3️⃣ USER NOTIFIED', { status: 'toast_shown' });

      // Allow agent to send final message before closing
      // Note: We can't access conversation directly here due to hook dependencies
      // The actual session closure will be handled by the endConversation function
      logHandoff('⏳ SCHEDULING CLOSURE', { delay: '1000ms' });
      
      setTimeout(() => {
        setConversationMessages([]);
        logHandoff('✅ MESSAGES CLEARED', { method: 'programmatic' });
      }, 1000);

      logHandoff('🎯 HANDOFF COMPLETE', { 
        status: 'success',
        agentResponse: 'Conversation will be closed in 1 second. Thank you for using Solin!',
        note: 'ElevenLabs agent informed about conversation closure'
      });

      return `${finalMessage} Your conversation has been saved and will be closed shortly. You can always start a new conversation anytime.`;
    } catch (error) {
      logHandoff('❌ CLOSE HANDOFF FAILED', { error: error instanceof Error ? error.message : 'Unknown error' });
      return 'Error closing conversation. Please try again or close manually.';
    }
  }, [toast, conversationState.totalMemoriesSaved]);

  const conversationOptionsRef = useRef({
    clientTools: { 
      save_memory: saveMemoryTool,
      save_biography_topic: saveBiographyTopicTool,
      retrieve_memory: retrieveMemoryTool,
      get_memory_details: getMemoryDetailsTool,
      get_conversation_suggestions: getConversationSuggestionsTool,
      close_conversation: closeConversationTool,
      edit_biography: editBiographyTool
    },
    onConnect: onConnectCb,
    onDisconnect: onDisconnectCb,
    onError: onErrorCb,
    onMessage: (message: unknown) => {
      console.log('🗣️ ElevenLabs message:', message);
      if (typeof message === 'object' && message !== null) {
        const msg = message as any;
        if (msg.type === 'response.audio_transcript.delta' && msg.delta) {
          setConversationMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'ai') {
              return [...prev.slice(0, -1), { role: 'ai', text: last.text + msg.delta }];
            }
            return [...prev, { role: 'ai', text: msg.delta }];
          });
        } else if (msg.source === 'user' && msg.message) {
          const userMessage = msg.message;
          setConversationMessages(prev => [...prev, { role: 'user', text: userMessage }]);
          
          // Extract topics from user messages for smarter context
          const topics = userMessage.toLowerCase().match(/\b(family|childhood|school|work|travel|memory|remember|story|time|years?|ago)\b/g) || [];
          if (topics.length > 0) {
            setConversationState(prev => ({
              ...prev,
              recentTopics: [...new Set([...topics, ...prev.recentTopics])].slice(0, 10)
            }));
          }
        } else if (msg.source === 'ai' && msg.message) {
          setConversationMessages(prev => [...prev, { role: 'ai', text: msg.message }]);
        }
      }
    },
  });

  const conversation = useConversation(conversationOptionsRef.current);

  // Removed agentId fallback; we only use signedUrl sessions to match SDK types.


  useEffect(() => {
    console.log('🛰️ Conversation status:', conversation.status, 'speaking:', conversation.isSpeaking);
  }, [conversation.status, conversation.isSpeaking]);

  const startConversation = useCallback(async () => {
    console.log('🚀 START CONVERSATION: Function called');
    
    // Define sessionHandoffId at function scope so it's available in catch block
    const sessionHandoffId = `session-${Date.now()}`;
    
    try {
      console.log('🚀 START CONVERSATION: Setting isConnecting to true');
      setIsConnecting(true);
      
      // Check authentication status first
      console.log(`🔌 [${sessionHandoffId}] CONNECTION HANDOFF: 🔍 CHECKING AUTH STATUS`);
      
      console.log('🚀 START CONVERSATION: About to call supabase.auth.getSession()');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🚀 START CONVERSATION: Got session response:', { session: !!session, error: !!sessionError });
      
      if (sessionError) {
        console.log(`🔌 [${sessionHandoffId}] CONNECTION HANDOFF: ⚠️ SESSION CHECK ERROR:`, sessionError);
      }
      
      const isAuthenticated = !!(session?.user);
      console.log(`🔌 [${sessionHandoffId}] CONNECTION HANDOFF: 🔐 AUTH STATUS:`, {
        hasSession: !!session,
        hasUser: !!session?.user,
        userEmail: session?.user?.email || 'none',
        isAuthenticated,
        hasEffectiveUser: !!effectiveUser
      });
      
      // Require real authentication for voice agent
      const finalUserId = session?.user?.id;
      
      if (!finalUserId) {
        console.log(`🔌 [${sessionHandoffId}] CONNECTION HANDOFF: ❌ AUTH REQUIRED`);
        throw new Error('Authentication system not available. Please refresh and try again.');
      }
      
      console.log(`🔌 [${sessionHandoffId}] CONNECTION HANDOFF: 🔐 USING USER:`, {
        isAuthenticated,
        userId: finalUserId
      });
      
      // Check microphone permissions
      console.log(`🔌 [${sessionHandoffId}] CONNECTION HANDOFF: 🎤 REQUESTING MIC ACCESS`);
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log(`🔌 [${sessionHandoffId}] CONNECTION HANDOFF: ✅ MIC ACCESS GRANTED`);

      // Proactively unlock audio on mobile/desktop to avoid autoplay policies blocking TTS
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          await ctx.resume();
          await new Promise(r => setTimeout(r, 10));
          await ctx.close();
        }
      } catch (e) {
        console.warn('⚠️ AudioContext unlock failed (safe to ignore):', e);
      }

      let data, error;
      
      // Require real authentication for voice agent
      if (!session) {
        console.log(`🔌 [${sessionHandoffId}] AUTH REQUIRED: No session`);
        console.log('🚀 START CONVERSATION: EARLY RETURN - Authentication required');
        toast({
          title: "Authentication Required", 
          description: "Please sign in to use the voice agent.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('🚀 START CONVERSATION: Passed authentication check, proceeding...');

      // Get signed URL from elevenlabs-agent-token function
      console.log(`🔌 [${sessionHandoffId}] EDGE FUNCTION HANDOFF: ➡️ CALLING elevenlabs-agent-token`);
      
      const response = await supabase.functions.invoke('elevenlabs-agent-token', {
        body: { 
          agentId: 'agent_3201k6n4rrz8e2wrkf9tv372y0w4'
        }
      });
      
      console.log(`🔌 [${sessionHandoffId}] EDGE FUNCTION HANDOFF: 📦 RAW RESPONSE:`, response);
      
      data = response.data;
      error = response.error;
      
      console.log(`🔌 [${sessionHandoffId}] EDGE FUNCTION HANDOFF: 👀 RESPONSE RECEIVED:`, {
        hasData: !!data,
        hasError: !!error,
        dataContent: data,
        errorContent: error,
        errorType: error?.message ? 'message' : error?.code ? 'code' : 'none',
        errorDetails: error?.message || error?.code || 'none'
      });

      if (error) {
        console.error(`🔌 [${sessionHandoffId}] EDGE FUNCTION HANDOFF: ❌ FAILED - Edge function error:`, error);
        console.log(`🚀 EXPLICIT ERROR CHECK: Error detected, about to throw`);
        
        // This throw should be caught by the outer catch block
        
        // Check if it's an auth error, network error, or function error
        if (error.message?.includes('Unauthorized')) {
          throw new Error('Authentication failed - please check if you are logged in');
        } else if (error.message?.includes('network')) {
          throw new Error('Network error - please check your connection');
        } else if (error.message?.includes('ElevenLabs API key not configured')) {
          throw new Error('ElevenLabs API key is not configured. Please add ELEVENLABS_API_KEY to your Supabase project settings.');
        } else {
          throw new Error(`Edge function failed: ${error.message || 'Unknown error'}`);
        }
      }
      
      if (!data?.signed_url) {
        console.error(`🔌 [${sessionHandoffId}] EDGE FUNCTION HANDOFF: ❌ INVALID RESPONSE - No signed URL:`, data);
        throw new Error('Failed to get signed URL from elevenlabs-agent-token function');
      }
      
      console.log(`🔌 [${sessionHandoffId}] EDGE FUNCTION HANDOFF: ✅ SUCCESS - Got signed URL`);

      console.log('Starting session with memory context...');
      
      // Use a cancellable timeout to avoid unhandled rejection after connect
      let timeoutId: number | undefined;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('Connection timed out')), 20000);
      });

      const startPromise = conversation.startSession({
        signedUrl: data.signed_url,
      });

      await Promise.race([startPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);
      
      // Set volume after session starts
      console.log('✅ Session started successfully, setting volume...');
      try { 
        await conversation.setVolume({ volume: 1 }); 
        console.log('✅ Volume set to 1');
      } catch (e) { 
        console.warn('⚠️ setVolume failed (safe to ignore):', e);
      }
      
    } catch (error) {
      console.log('🚀 CATCH BLOCK: Error caught in try-catch');
      const errorMsg = error instanceof Error ? error.message : 'Could not start';
      
      // Enhanced diagnostic logging
      console.error('❌ FULL ERROR DETAILS:', {
        error,
        message: errorMsg,
        stack: error instanceof Error ? error.stack : 'No stack trace',
        type: typeof error,
        sessionHandoffId
      });
      
      // Provide specific guidance based on error type
      let userMessage = errorMsg;
      let diagnosticHint = '';
      
      if (errorMsg.includes('Authentication failed') || errorMsg.includes('Unauthorized')) {
        userMessage = 'Authentication issue - please check your login status.';
        diagnosticHint = 'Check: User authentication, Supabase session, JWT token validity';
      } else if (errorMsg.includes('Network error') || errorMsg.includes('fetch')) {
        userMessage = 'Connection issue. Please check your internet and try again.';
        diagnosticHint = 'Check: Internet connection, Supabase availability, CORS settings';
      } else if (errorMsg.includes('Edge function failed') || errorMsg.includes('ElevenLabs')) {
        userMessage = 'Service temporarily unavailable. Please try again in a moment.';
        diagnosticHint = 'Check: ElevenLabs API key, Supabase Edge function, API rate limits';
      } else if (errorMsg.includes('Connection timed out')) {
        userMessage = 'Connection timed out. The service might be slow or unavailable.';
        diagnosticHint = 'Check: ElevenLabs service status, network latency, WebSocket connectivity';
      } else {
        userMessage = `Connection failed: ${errorMsg}`;
        diagnosticHint = 'Check console for detailed error information';
      }
      
      console.log(`🔍 DIAGNOSTIC HINT: ${diagnosticHint}`);
      
      toast({
        title: "Failed to connect",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      console.log('🚀 START CONVERSATION: Finally block - setting isConnecting to false');
      setIsConnecting(false);
    }
  }, [conversation, toast, agentInstructions]);

  // Keep a stable ref to startConversation so callbacks can call it without re-creating deps
  useEffect(() => {
    startConversationRef.current = startConversation;
    return () => { startConversationRef.current = undefined; };
  }, [startConversation]);

  const endConversation = useCallback(async () => {
    try {
      console.log('👋 Manual conversation end requested...');
      
      // First, notify the ElevenLabs agent about the closure
      await closeConversationTool({
        summary: 'User manually ended conversation',
        memory_count: conversationState.totalMemoriesSaved,
        final_message: 'Thanks for sharing your memories with Solin!'
      });
      
      // End the actual conversation session
      await conversation.endSession();
      setConversationMessages([]);
      toast({ title: 'Conversation ended', description: 'Your session has been saved and ended' });
      
    } catch (error) {
      console.error('Error ending conversation:', error);
      // Fallback: direct session end if tool fails
      await conversation.endSession();
      setConversationMessages([]);
      toast({ title: 'Conversation ended', description: 'Your session has ended' });
    }
  }, [conversation, toast, closeConversationTool, conversationState.totalMemoriesSaved]);

  useEffect(() => {
    startConversationRef.current = startConversation;
    return () => { startConversationRef.current = undefined; };
  }, [startConversation]);

  const isConnected = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  const lastClickRef = useRef(0);
  const handleOrbPress = useCallback(async () => {
    const now = Date.now();

    if (isTogglingRef.current) {
      console.log('⏳ Toggle in progress, ignoring press');
      return;
    }

    if (now - lastClickRef.current < 700) {
      console.log('⏱️ Ignored rapid orb tap');
      return;
    }

    // Orb now only STARTS the session. It will not end it.
    if (isConnected) {
      console.log('ℹ️ Orb press ignored while connected (use End button)');
      return;
    }

    lastClickRef.current = now;
    isTogglingRef.current = true;
    try {
      console.log('🔺 Starting session by orb press');
      await startConversation();
    } finally {
      setTimeout(() => { isTogglingRef.current = false; }, 400);
    }
  }, [isConnected, startConversation]);

  const features = [
    {
      icon: Heart,
      title: 'Preserve Your Voice',
      description: 'Record memories in your own words, capturing your essence.',
    },
    {
      icon: Clock,
      title: 'Timeline of Life',
      description: 'Organize memories chronologically to see your story unfold.',
    },
    {
      icon: Users,
      title: 'Share Selectively',
      description: 'Control who accesses different memories—family, friends, or private.',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Encrypted storage in your personal sanctuary.',
    },
    {
      icon: Lock,
      title: 'Your Legacy',
      description: 'Create a lasting digital legacy for future generations.',
    },
    {
      icon: Sparkles,
      title: 'AI Companion',
      description: 'Solin helps reflect on memories and guide conversations.',
    }
  ];

  // Always show Solin interface for real authenticated users
  const shouldShowSolinInterface = true;

  if (shouldShowSolinInterface) {
    return (
      <div className="min-h-screen bg-background overflow-hidden relative">
        

        <div className="relative min-h-screen flex flex-col lg:flex-row items-start justify-center px-6 lg:px-12 py-10 gap-8 lg:gap-10">
          {/* Left Side - Solin Agent - Matched size with transcript */}
          <div 
            className="flex-1 max-w-xl w-full h-[75vh] lg:h-[80vh] bg-white rounded-lg border-[1.5px] shadow-elevated p-8 flex flex-col justify-center animate-fade-in"
            style={{ 
              borderColor: 'hsl(var(--section-border))'
            }}
          >
            
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                {isConnecting ? (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <Sparkles className="h-16 w-16 text-primary animate-pulse" />
                  </div>
                ) : (
                  <ModernVoiceAgent 
                    isActive={isConnected} 
                    isSpeaking={isSpeaking}
                    onClick={handleOrbPress}
                  />
                )}
              </div>

              <div className="text-center space-y-3">
                {/* Personalized welcome message */}
                {user && (
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-foreground mb-1">
                      Welcome, {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Friend'}!
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Ready to continue your memory journey with Solin?
                    </p>
                  </div>
                )}
                
                <p className="text-base font-semibold text-foreground">
                  {isConnecting ? 'Connecting to Solin...' : isConnected ? (isSpeaking ? 'Solin is speaking' : 'Listening to you...') : 'Ready to preserve your memories'}
                </p>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground max-w-md">
                    {!isConnected && 'Click the microphone to start a natural conversation with Solin'}
                  </p>
                  {!isConnected && (
                    <p className="text-xs text-muted-foreground/70 max-w-md">
                      Share as much or as little as you'd like — you can save and stop anytime
                    </p>
                  )}
                </div>
                
                {/* User authentication indicator */}
                {user && (
                  <div className="text-xs bg-green-100 text-green-800 px-3 py-2 rounded-full border border-green-200">
                    ✅ Signed in as {user.email}
                  </div>
                )}
                
                {/* Smart conversation state indicator */}
                {isConnected && (
                  <div className="space-y-2">
                    {conversationState.totalMemoriesSaved > 0 && (
                      <div className="text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full inline-block">
                        🧠 {conversationState.totalMemoriesSaved} memories saved • {conversationState.recentTopics.length} topics discussed
                      </div>
                    )}
                    {conversationState.userMemoryProfile && (
                      <div className="text-xs text-accent bg-accent/10 px-3 py-1.5 rounded-full inline-block">
                        🎯 Intelligent prompting active • {conversationState.userMemoryProfile.totalMemories} total memories analyzed
                      </div>
                    )}
                  </div>
                )}
                
                {isConnected ? (
                  <div className="space-y-3">
                    {/* Save Conversation Anytime - Reassuring message */}
                    <div className="text-xs text-muted-foreground bg-muted/30 px-4 py-2 rounded-full border border-border/30">
                      💬 You can end our conversation anytime — no pressure to keep going
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="lg" 
                      onClick={endConversation} 
                      className="rounded-full border-2 hover:bg-destructive hover:text-white hover:border-destructive transition-all hover:scale-105 font-semibold"
                    >
                      Save & End Conversation
                    </Button>
                  </div>
                ) : (
                  <Button 
                    size="lg" 
                    onClick={startConversation} 
                    disabled={isConnecting} 
                    className="rounded-full bg-primary hover:bg-primary/90 text-white px-10 py-5 text-base font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  >
                    {isConnecting ? 'Connecting...' : 'Start Conversation'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Live Conversation Transcript - Bordered with modern chat */}
          <div 
            className="flex-1 max-w-xl w-full h-[75vh] lg:h-[80vh] bg-white rounded-lg border-[1.5px] shadow-elevated p-5 flex flex-col overflow-hidden"
            style={{ borderColor: 'hsl(var(--section-border))' }}
          >
            <div className="mb-3 pb-2 border-b" style={{ borderColor: 'hsl(var(--section-border))' }}>
              <h2 className="text-base font-bold text-foreground">
                Live Transcript
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time conversation with Solin</p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {conversationMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground text-sm text-center">
                    Your conversation will appear here...
                  </p>
                </div>
              ) : (
                conversationMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-1.5 transition-all hover:scale-[1.02] ${
                        msg.role === 'user'
                          ? 'bg-primary text-white rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}
                    >
                      <div className={`text-xs font-medium mb-0.5 ${
                        msg.role === 'user' ? 'text-white/70' : 'opacity-70'
                      }`}>
                        {msg.role === 'user' ? 'You' : 'Solin'}
                      </div>
                      <div className="text-xs leading-snug whitespace-pre-wrap break-words">
                        {msg.text}
                        {idx === conversationMessages.length - 1 && msg.role === 'ai' && (
                          <span className="inline-block w-1 h-3 bg-primary ml-1 animate-pulse rounded-sm" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Intelligent Prompting Debug Panel */}
          {conversationState.suggestedQuestions.length > 0 && (
            <div 
              className="flex-1 max-w-xl bg-accent/5 rounded-lg border-[1.5px] p-4 max-h-64 overflow-y-auto"
              style={{ borderColor: 'hsl(var(--section-border))' }}
            >
              <div className="mb-3 pb-2 border-b" style={{ borderColor: 'hsl(var(--section-border))' }}>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  🧠 Intelligent Suggestions
                  <span className="text-xs bg-accent/20 px-2 py-0.5 rounded-full">Debug Mode</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Solin can use these personalized questions</p>
              </div>
              <div className="space-y-2">
                {conversationState.suggestedQuestions.slice(0, 4).map((question, idx) => (
                  <div key={idx} className="text-xs bg-white/50 rounded p-2 border" style={{ borderColor: 'hsl(var(--section-border))' }}>
                    <span className="font-medium text-accent">{idx + 1}.</span> {question}
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden">

      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-40 bg-transparent border-b-[1.5px]" style={{ borderColor: 'hsl(var(--section-border))' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold">You, Remembered</div>
          <div className="flex gap-4 items-center">
            <Button variant="ghost" asChild>
              <Link to="/about">About</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/how-it-works">How It Works</Link>
            </Button>
            {!effectiveUser && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Single Screen Hero */}
      <div className="h-full flex items-center justify-center px-6">
        <div className="max-w-5xl w-full text-center space-y-6 animate-fade-in">
          <div className="space-y-4">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              Digital Memory Sanctuary
            </div>
            
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight text-foreground">
            Replicate your presence
            <br />
            Make your story
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              last forever
            </span>
          </h1>
            
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              {effectiveUser ? `Welcome back, ${effectiveUser.email}! Ready to continue your memory journey?` : 'Preserve your voice, stories, and values. Create a lasting legacy.'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {effectiveUser ? (
              // Authenticated user - show voice agent button
              <Button 
                size="lg" 
                onClick={startConversation}
                disabled={isConnecting || isConnected}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-5 rounded-full font-semibold hover:scale-105 transition-all"
              >
                {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Start Conversation'}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            ) : (
              // Unauthenticated user - show sign up options
              <>
                <Button 
                  size="lg" 
                  asChild
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-5 rounded-full font-semibold hover:scale-105 transition-all"
                >
                  <Link to="/auth">
                    Create Account
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  asChild
                  className="px-8 py-5 rounded-full font-semibold hover:scale-105 transition-all border-2"
                >
                  <Link to="/auth">
                    Sign In
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2 justify-center pt-3">
            {features.slice(0, 4).map((feature, index) => (
              <div 
                key={index} 
                className="px-4 py-2 rounded-full bg-card text-sm text-muted-foreground flex items-center gap-2 border-[1.5px]"
                style={{ borderColor: 'hsl(var(--section-border))' }}
              >
                <feature.icon className="h-4 w-4" />
                {feature.title}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
