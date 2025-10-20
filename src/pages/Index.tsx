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
import { voiceRecordingService, testGuestRecording, testAuthenticatedRecording, checkDatabaseRecordings, checkGuestRecordings } from '@/services/voiceRecording';
import { conversationRecordingService } from '@/services/conversationRecording';
import { soundEffects } from '@/services/soundEffects';
import { FirstConversationDialog } from '@/components/FirstConversationDialog';
import { userProfileService } from '@/services/userProfileService';
import { configurationService } from '@/services/configurationService';
// Dummy mode removed - always use real authentication
import { 
  Heart, 
  Clock, 
  Shield, 
  ArrowRight,
  Users,
  Lock,
  Sparkles,
  Music
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Always use real user - no dummy mode in production
  const effectiveUser = user;
  
  const [isConnecting, setIsConnecting] = useState(false);
  const noEndBeforeRef = useRef(0);
  const isTogglingRef = useRef(false);
  const lastConnectedAtRef = useRef(0);
  const retryCountRef = useRef(0);
  const startConversationRef = useRef<(isRetry?: boolean) => Promise<void>>();
  
  // Voice recording state
  const [recordingSessionId, setRecordingSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // Store authenticated user ID for voice recording
  const authenticatedUserIdRef = useRef<string | null>(null);
  
  // Enhanced conversation flow state
  const [isEndingConversation, setIsEndingConversation] = useState(false);
  const [pendingMemoryData, setPendingMemoryData] = useState<{
    title?: string;
    content?: string;
    needsCollection: boolean;
  } | null>(null);
  const [lastSavedMemoryId, setLastSavedMemoryId] = useState<string | null>(null);
  
  // First Conversation state
  const [needsFirstConversation, setNeedsFirstConversation] = useState(false);
  const [showFirstConversation, setShowFirstConversation] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

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

      // Add memory ID to voice recording if active
      if (isRecording && recordingSessionId) {
        try {
          voiceRecordingService.addMemoryId(primaryMemoryId);
          console.log('📝 Added memory ID to voice recording:', primaryMemoryId);
        } catch (error) {
          console.error('⚠️ Failed to add memory ID to recording:', error);
        }
      }

      // Play success chime for memory save
      try {
        await soundEffects.playMemorySaveChime();
      } catch (error) {
        console.warn('Sound effect failed:', error);
      }

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
      
      // Store last saved memory ID for potential Timeline redirect
      setLastSavedMemoryId(primaryMemoryId);
      
      // Check if this is part of ending conversation flow
      if (isEndingConversation && hasDatePlaceTitle) {
        // Auto-redirect to Timeline page with memory highlighting
        setTimeout(() => {
          navigate(`/timeline?highlight=${primaryMemoryId}&new=true`);
        }, 2000);
        
        return `Perfect! Memory "${memoryTitle}"${chunkMessage} saved successfully! I'm taking you to your Timeline now where you'll see it appear. Thank you for sharing your memories with me!`;
      }
      
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

  const onConnectCb = useCallback(async () => {
    const timestamp = new Date().toISOString();
    console.log(`🔌 CONNECTION HANDOFF: ✅ CONNECTED @ ${timestamp}`, {
      status: 'ElevenLabs voice agent connected',
      retryCount: retryCountRef.current
    });
    
    noEndBeforeRef.current = Date.now() + 2000;
    lastConnectedAtRef.current = Date.now();
    
    // Initialize conversation state for this session with greeting phase
    setConversationState(prev => ({
      ...prev,
      sessionStartTime: timestamp,
      // Reset for new session
      recentTopics: [],
      recentMemories: [],
      totalMemoriesSaved: 0,
      sessionMode: 'unset',
      conversationPhase: 'greeting'
    }));
    
    // Clear any previous memory ID from last session
    setLastSavedMemoryId(null);
    
    // Start voice recording if user is authenticated
    try {
      console.log('🎤🔍 DEBUG: Checking user context for voice recording...');
      console.log('👤 effectiveUser:', effectiveUser);
      console.log('👤 user from useAuth:', user);
      console.log('👤 authenticatedUserIdRef.current:', authenticatedUserIdRef.current);
      console.log('👤 effectiveUser?.id:', effectiveUser?.id);
      console.log('👤 user?.id:', user?.id);
      
      // Use the authenticated user ID from the ref (set during startConversation)
      // This is more reliable than React state during the callback
      const recordingUserId = authenticatedUserIdRef.current || user?.id || effectiveUser?.id;
      
      if (recordingUserId) {
        console.log('🎤 Starting conversation recording for authenticated user:', recordingUserId);
        const sessionId = await conversationRecordingService.startConversationRecording(recordingUserId, 'elevenlabs_conversation');
        setRecordingSessionId(sessionId);
        setIsRecording(true);
        console.log('✅ Conversation recording started successfully:', sessionId);
        
        // Add periodic status logging
        const statusInterval = setInterval(() => {
          const status = conversationRecordingService.getRecordingStatus();
          console.log('🎬 Recording Status:', status);
        }, 10000); // Log every 10 seconds
        
        // Clean up interval when conversation ends
        setTimeout(() => clearInterval(statusInterval), 300000); // Max 5 minutes
      } else {
        console.warn('⚠️ No authenticated user found - voice recording skipped');
        console.log('🔍 Auth debug:', { 
          refUserId: authenticatedUserIdRef.current,
          user, 
          effectiveUser, 
          hasUser: !!user, 
          hasEffectiveUser: !!effectiveUser,
          userType: typeof user,
          effectiveUserType: typeof effectiveUser
        });
      }
    } catch (error) {
      console.error('⚠️ Failed to start voice recording (continuing without):', error);
      // Continue without recording - not critical
    }
    
    // Generate conversation starters based on user's memory history
    setTimeout(() => generateIntelligentSuggestions(), 1000);
    
    // Do not reset retryCountRef here; only reset after a stable connection duration
    // retryCountRef will be reset in onDisconnect if the session lasted long enough
    toast({ 
      title: 'Connected to Solin', 
      description: isRecording 
        ? 'Recording started - Solin will ask what type of conversation you\'d like'
        : 'Solin will ask what type of conversation you\'d like to have'
    });
  }, [toast, effectiveUser?.id, user?.id, isRecording]);

  const onDisconnectCb = useCallback(async () => {
    const elapsed = Date.now() - lastConnectedAtRef.current;
    const timestamp = new Date().toISOString();
    
    console.log(`🔌 CONNECTION HANDOFF: 👋 DISCONNECTED @ ${timestamp}`, {
      status: 'ElevenLabs voice agent disconnected',
      sessionDuration: `${elapsed}ms`,
      retryCount: retryCountRef.current,
      wasRecording: isRecording
    });
    
    // Stop voice recording if active
    if (isRecording && recordingSessionId) {
      try {
        console.log('🛑 Stopping conversation recording due to disconnect...');
        await conversationRecordingService.stopConversationRecording();
        setIsRecording(false);
        setRecordingSessionId(null);
        console.log('✅ Conversation recording stopped and saved');
      } catch (error) {
        console.error('⚠️ Failed to stop voice recording:', error);
        setIsRecording(false);
        setRecordingSessionId(null);
      }
    }
    
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

    toast({ 
      title: 'Disconnected', 
      description: isRecording 
        ? 'Voice session ended and recording saved'
        : 'Voice session ended' 
    });
  }, [toast, isRecording, recordingSessionId]);

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
    sessionMode: 'unset' | 'daily_journal' | 'memory_creation' | 'memory_browsing' | 'general_chat';
    conversationPhase: 'greeting' | 'mode_selection' | 'active_conversation' | 'wrap_up';
    activeMemoryId?: string; // Currently selected memory for editing
  }>({
    recentTopics: [],
    recentMemories: [],
    sessionStartTime: '',
    totalMemoriesSaved: 0,
    userInteractionStyle: 'detailed',
    userMemoryProfile: null,
    suggestedQuestions: [],
    sessionMode: 'unset',
    conversationPhase: 'greeting'
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

1. initialize_session: IMPORTANT - Use this FIRST when starting a conversation to offer upfront options (daily_journal, memory_creation, memory_browsing, or general_chat).
2. save_memory: Save new memories when users share stories. For Timeline appearance: needs title, content, date (memory_date), and location (memory_location).
3. save_biography_topic: Save general biographical information about the user (personality, background, beliefs, etc.).
4. browse_memories: Search and browse existing memories conversationally. Use for memory exploration and finding specific memories.
5. get_memory_details: Get full details of a specific memory by ID.
6. edit_memory: Modify existing memories verbally. Can add content, replace sections, or completely update memories.
7. voice_search: NEW - Find and replay past conversations by searching voice recordings. Users can search for "conversations about family" or "when I talked about vacation".
8. play_voice_recording: NEW - Play back specific voice recordings, show transcripts, or provide summaries of past conversations.
9. retrieve_memory: Basic memory search (use browse_memories for better experience).
10. get_conversation_suggestions: Get intelligent, personalized questions based on session mode and user's patterns.
11. close_conversation: Use when user wants to end the conversation. Handles proper session closure.
12. edit_biography: Help users modify their AI-generated life story.

VOICE RECORDING & SEARCH (NEW):
- All conversations are automatically recorded and stored with transcripts
- Users can search their voice history: "Find conversations about my mom" or "When did I talk about travel?"
- Use voice_search to find relevant conversations, then play_voice_recording to access them
- Offer transcript reading, conversation summaries, or audio playback
- Voice recordings are linked to memories created during those conversations

CONVERSATION INITIALIZATION (CRITICAL):
- At the start of EVERY conversation, use initialize_session tool to offer upfront options
- Present 4 choices: "daily journal entry", "new memory preservation", "browse/edit existing memories", or "general conversation"
- Based on their choice, tailor all subsequent interactions to that mode

SESSION MODES:
- daily_journal: Focus on today's events, reflections, current thoughts, what stood out from their day
- memory_creation: Focus on specific past experiences, stories worth preserving, detailed memories  
- memory_browsing: Browse, search, and edit existing memories. Use browse_memories and edit_memory tools actively.
- general_chat: Open exploration of life experiences, can mix daily reflections with memories

MEMORY & VOICE INTERACTION FLOW:
When users want to work with existing content:
1. Use browse_memories to find text-based memories
2. Use voice_search to find past conversations
3. Offer to read transcripts, play recordings, or show memory details
4. Suggest adding to memories with edit_memory (edit_type: "add_to")
5. Help modify memories with edit_memory (edit_type: "modify" or "replace_section")
6. Connect voice recordings to related memories when relevant

CONVERSATION FLOW:
1. ALWAYS start with initialize_session to get user's preference
2. Use get_conversation_suggestions with type="starter" after mode selection
3. In memory_browsing mode: actively use browse_memories, voice_search, and suggest interactions
4. After memories/topics are shared, use get_conversation_suggestions with type="followup"
5. If conversation stalls, use get_conversation_suggestions with type="reflection"
6. When saving memories, gently ask for date/location if missing

VOICE SEARCH EXAMPLES:
- "Find conversations where I talked about my mother"
- "When did I discuss my vacation plans?"
- "Show me recordings from last week"
- "What did I say about work stress?"

Keep responses brief and conversational. Make memory and voice interaction feel natural and powerful.`;

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

  // Session initialization tool for conversation mode selection
  const initializeSessionTool = useCallback(async (parameters: {
    session_mode: 'daily_journal' | 'memory_creation' | 'memory_browsing' | 'general_chat';
    user_preference?: string;
  }) => {
    const handoffId = `init-${Date.now()}`;
    const logHandoff = (stage: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.log(`🚀 [${handoffId}] SESSION INIT: ${stage} @ ${timestamp}`, data || '');
    };

    try {
      logHandoff('1️⃣ RECEIVED', { source: 'ElevenLabs voice agent', parameters });

      const { session_mode } = parameters;
      
      if (!['daily_journal', 'memory_creation', 'memory_browsing', 'general_chat'].includes(session_mode)) {
        logHandoff('❌ VALIDATION FAILED', { invalidMode: session_mode });
        return 'Invalid session mode. Please choose: daily_journal, memory_creation, memory_browsing, or general_chat.';
      }

      logHandoff('2️⃣ VALIDATED', { mode: session_mode });

      // Update conversation state with selected mode
      setConversationState(prev => ({
        ...prev,
        sessionMode: session_mode,
        conversationPhase: 'active_conversation'
      }));

      logHandoff('3️⃣ STATE UPDATED', { newMode: session_mode, phase: 'active_conversation' });

      // Generate mode-specific follow-up response
      const responses = {
        daily_journal: "Perfect! I'm here to help you create your daily journal entry. Let's start with what happened today - what stands out to you from your day? It could be something big or small, meaningful or routine. I'll help you capture it as a personal reflection.",
        memory_creation: "Wonderful! I'm ready to help you preserve a meaningful memory. Think of a specific moment, experience, or story from your life that you'd like to save. It could be from any time period - recent or long ago. What memory would you like to share with me?",
        memory_browsing: "Excellent! I'll help you explore and work with your existing memories. You can ask me to find specific memories, browse by topics or time periods, and even add to or modify memories you've already saved. What would you like to do? Search for something specific, or shall I show you some recent memories?",
        general_chat: "Great choice! I'm here for an open conversation about your life experiences. We can explore memories, talk about current reflections, or discuss whatever feels meaningful to you right now. What's on your mind today?"
      };

      const response = responses[session_mode];
      
      logHandoff('✅ HANDOFF COMPLETE', { 
        status: 'success',
        mode: session_mode,
        agentResponse: `Mode set to ${session_mode}. Ready for specialized conversation.`
      });

      return response;
    } catch (error) {
      logHandoff('❌ HANDOFF FAILED', { error: error instanceof Error ? error.message : 'Unknown error' });
      return 'Error initializing session. Please try again or proceed with general conversation.';
    }
  }, []);

  // Memory editing tool for verbal modifications through Solin
  const editMemoryTool = useCallback(async (parameters: {
    memory_id: string;
    edit_type: 'modify' | 'add_to' | 'replace_section';
    new_content: string;
    section_description?: string; // For replace_section: describes what part to replace
  }) => {
    const handoffId = `edit-${Date.now()}`;
    const logHandoff = (stage: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.log(`✏️ [${handoffId}] MEMORY EDIT: ${stage} @ ${timestamp}`, data || '');
    };

    try {
      logHandoff('1️⃣ RECEIVED', { source: 'ElevenLabs voice agent', parameters });

      const { memory_id, edit_type, new_content, section_description } = parameters;
      
      if (!memory_id?.trim() || !edit_type || !new_content?.trim()) {
        logHandoff('❌ VALIDATION FAILED', { 
          hasMemoryId: !!memory_id, 
          hasEditType: !!edit_type, 
          hasContent: !!new_content 
        });
        return 'Missing required information. Please provide memory ID, edit type, and new content.';
      }

      if (!effectiveUser?.id) {
        logHandoff('❌ NO USER ID', { message: 'User must be logged in to edit memories' });
        return 'You must be logged in to edit memories. Please sign in and try again.';
      }

      const userId = effectiveUser.id;
      
      logHandoff('2️⃣ FETCHING EXISTING MEMORY', { userId, memoryId: memory_id });

      // First, get the existing memory (handle chunked memories)
      const { data: memoryChunks, error: fetchError } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId)
        .or(`id.eq.${memory_id},memory_group_id.eq.(SELECT memory_group_id FROM memories WHERE id = '${memory_id}' AND user_id = '${userId}')`)
        .order('chunk_sequence');

      if (fetchError) {
        logHandoff('❌ FETCH ERROR', { error: fetchError.message });
        return `Error retrieving memory: ${fetchError.message}`;
      }

      if (!memoryChunks || memoryChunks.length === 0) {
        logHandoff('❌ MEMORY NOT FOUND', { memoryId: memory_id });
        return 'Memory not found or you do not have permission to edit it.';
      }

      // Reconstruct full memory content if chunked
      const { reconstructMemoryFromChunks } = await import('@/utils/memoryChunking');
      const originalContent = memoryChunks.length > 1 
        ? reconstructMemoryFromChunks(memoryChunks.map(chunk => ({
            content: chunk.text,
            chunkSequence: chunk.chunk_sequence || 1,
            totalChunks: chunk.total_chunks || 1,
            memoryGroupId: chunk.memory_group_id
          })))
        : memoryChunks[0].text;

      const originalMemory = memoryChunks[0];
      
      logHandoff('3️⃣ PROCESSING EDIT', { 
        editType: edit_type, 
        originalLength: originalContent.length,
        newContentLength: new_content.length 
      });

      let updatedContent = '';

      switch (edit_type) {
        case 'add_to':
          // Append new content to existing memory
          updatedContent = originalContent + '\n\n--- Added ---\n\n' + new_content.trim();
          break;
        
        case 'replace_section':
          // Replace a specific section (simple approach - could be enhanced with AI)
          if (section_description) {
            // For now, simple replacement - could use AI to identify sections later
            updatedContent = originalContent + '\n\n--- Updated Section ---\n\n' + new_content.trim();
          } else {
            updatedContent = new_content.trim(); // Replace entire content if no section specified
          }
          break;
        
        case 'modify':
        default:
          // Complete replacement of memory content
          updatedContent = new_content.trim();
          break;
      }

      logHandoff('4️⃣ CHUNKING UPDATED CONTENT', { 
        editType: edit_type,
        finalLength: updatedContent.length 
      });

      // Re-chunk the updated content
      const { chunkMemoryContent } = await import('@/utils/memoryChunking');
      const newChunks = chunkMemoryContent(updatedContent, originalMemory.memory_group_id);

      // Delete old chunks and insert new ones (atomic operation)
      logHandoff('5️⃣ UPDATING DATABASE', { 
        oldChunks: memoryChunks.length, 
        newChunks: newChunks.length 
      });

      // Start transaction-like operations
      const { error: deleteError } = await supabase
        .from('memories')
        .delete()
        .eq('memory_group_id', originalMemory.memory_group_id)
        .eq('user_id', userId);

      if (deleteError) {
        logHandoff('❌ DELETE ERROR', { error: deleteError.message });
        return `Error updating memory: ${deleteError.message}`;
      }

      // Insert updated chunks
      const memoryInserts = newChunks.map(chunk => ({
        user_id: userId,
        title: newChunks.length > 1 ? `${originalMemory.title} (Part ${chunk.chunkSequence}/${chunk.totalChunks})` : originalMemory.title,
        text: chunk.content,
        tags: originalMemory.tags,
        memory_date: originalMemory.memory_date,
        memory_location: originalMemory.memory_location,
        memory_group_id: chunk.memoryGroupId,
        chunk_sequence: chunk.chunkSequence,
        total_chunks: chunk.totalChunks,
        image_urls: originalMemory.image_urls,
      }));

      const { data: updatedMemory, error: insertError } = await supabase
        .from('memories')
        .insert(memoryInserts)
        .select();

      if (insertError) {
        logHandoff('❌ INSERT ERROR', { error: insertError.message });
        return `Error saving updated memory: ${insertError.message}`;
      }

      logHandoff('6️⃣ UPDATE COMPLETE', { 
        memoryTitle: originalMemory.title,
        chunksCreated: updatedMemory.length 
      });

      // Update conversation state to track the active memory
      setConversationState(prev => ({
        ...prev,
        activeMemoryId: memory_id
      }));

      toast({
        title: 'Memory Updated',
        description: `"${originalMemory.title}" has been successfully modified.`,
        duration: 5000,
      });

      logHandoff('✅ EDIT COMPLETE', {
        status: 'success',
        editType: edit_type,
        memoryTitle: originalMemory.title
      });

      const editTypeDescriptions = {
        add_to: 'added new content to',
        modify: 'updated',
        replace_section: 'modified a section of'
      };

      return `I've successfully ${editTypeDescriptions[edit_type]} your memory "${originalMemory.title}". The changes have been saved. Would you like to make any other modifications or work with a different memory?`;

    } catch (error) {
      logHandoff('❌ EDIT FAILED', { error: error instanceof Error ? error.message : 'Unknown error' });
      return `Failed to edit memory: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
    }
  }, [effectiveUser?.id, toast, supabase]);

  // Enhanced memory retrieval tool with conversational presentation
  const browseMemoriesTool = useCallback(async (parameters: {
    search_query?: string;
    time_period?: 'recent' | 'this_year' | 'last_year' | 'older';
    limit?: number;
    action?: 'search' | 'browse_recent' | 'browse_by_topic';
  }) => {
    const handoffId = `browse-${Date.now()}`;
    const logHandoff = (stage: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.log(`🔍 [${handoffId}] MEMORY BROWSE: ${stage} @ ${timestamp}`, data || '');
    };

    try {
      logHandoff('1️⃣ RECEIVED', { source: 'ElevenLabs voice agent', parameters });

      if (!effectiveUser?.id) {
        return 'You must be logged in to browse your memories.';
      }

      const { search_query, time_period, limit = 8, action = 'browse_recent' } = parameters;
      const userId = effectiveUser.id;

      let query = supabase
        .from('memories')
        .select('id, title, text, memory_date, memory_location, created_at, chunk_sequence, memory_group_id')
        .eq('user_id', userId);

      // Apply time period filter
      if (time_period) {
        const now = new Date();
        let startDate;
        
        switch (time_period) {
          case 'recent':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
            break;
          case 'this_year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          case 'last_year':
            startDate = new Date(now.getFullYear() - 1, 0, 1);
            query = query.lt('created_at', new Date(now.getFullYear(), 0, 1).toISOString());
            break;
          case 'older':
            startDate = new Date(now.getFullYear() - 2, 0, 1);
            query = query.lt('created_at', startDate.toISOString());
            break;
        }
        
        if (time_period !== 'older' && time_period !== 'last_year') {
          query = query.gte('created_at', startDate!.toISOString());
        }
      }

      // Apply search filter
      if (search_query?.trim()) {
        const escaped = search_query.trim().replace(/%/g, '%25').replace(/\\/g, '\\\\');
        query = query.or(`title.ilike.%${escaped}%,text.ilike.%${escaped}%`);
      }

      // Only get first chunk of each memory group to avoid duplicates
      query = query.eq('chunk_sequence', 1);
      query = query.order('created_at', { ascending: false }).limit(limit);

      const { data: memories, error } = await query;

      logHandoff('2️⃣ QUERY EXECUTED', { 
        memoriesFound: memories?.length || 0, 
        searchQuery: search_query,
        timePeriod: time_period 
      });

      if (error) {
        logHandoff('❌ QUERY ERROR', { error: error.message });
        return `Error retrieving memories: ${error.message}`;
      }

      if (!memories || memories.length === 0) {
        const noResultsMessages = {
          search: search_query ? `No memories found matching "${search_query}".` : 'No memories found.',
          browse_recent: 'You don\'t have any recent memories saved yet.',
          browse_by_topic: 'No memories found for that topic.'
        };
        return noResultsMessages[action] + ' Would you like to create a new memory or try a different search?';
      }

      // Format results conversationally
      let response = '';
      
      if (search_query) {
        response += `I found ${memories.length} memor${memories.length === 1 ? 'y' : 'ies'} matching "${search_query}":\n\n`;
      } else if (time_period) {
        const periodNames = {
          recent: 'recent memories',
          this_year: 'memories from this year',
          last_year: 'memories from last year',
          older: 'older memories'
        };
        response += `Here are your ${periodNames[time_period]}:\n\n`;
      } else {
        response += `Here are your recent memories:\n\n`;
      }

      memories.forEach((memory, index) => {
        const date = memory.memory_date 
          ? new Date(memory.memory_date).toLocaleDateString()
          : new Date(memory.created_at).toLocaleDateString();
        
        const location = memory.memory_location ? ` in ${memory.memory_location}` : '';
        const preview = memory.text.length > 100 
          ? memory.text.substring(0, 100) + '...'
          : memory.text;
        
        response += `${index + 1}. **${memory.title}** (${date}${location})\n`;
        response += `   ${preview}\n`;
        response += `   [Memory ID: ${memory.id}]\n\n`;
      });

      response += `\nTo work with any memory, just tell me the number or title, and I can:\n`;
      response += `• Read the full memory to you\n`;
      response += `• Add new details to it\n`;
      response += `• Modify or update parts of it\n`;
      response += `• Help you expand on the story\n\n`;
      response += `What would you like to do?`;

      logHandoff('✅ BROWSE COMPLETE', { 
        memoriesReturned: memories.length,
        responseLength: response.length 
      });

      return response;

    } catch (error) {
      logHandoff('❌ BROWSE FAILED', { error: error instanceof Error ? error.message : 'Unknown error' });
      return `Error browsing memories: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
    }
  }, [effectiveUser?.id, supabase]);

  // Voice search tool for finding and playing back conversations
  const voiceSearchTool = useCallback(async (parameters: {
    search_query: string;
    search_type?: 'transcript' | 'summary' | 'topics';
    limit?: number;
  }) => {
    const handoffId = `voice-search-${Date.now()}`;
    const logHandoff = (stage: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.log(`🎵 [${handoffId}] VOICE SEARCH: ${stage} @ ${timestamp}`, data || '');
    };

    try {
      logHandoff('1️⃣ RECEIVED', { source: 'ElevenLabs voice agent', parameters });

      if (!effectiveUser?.id) {
        return 'You must be logged in to search your voice recordings.';
      }

      const { search_query, limit = 5 } = parameters;
      
      if (!search_query?.trim()) {
        return 'Please provide a search term to find your voice recordings.';
      }

      const userId = effectiveUser.id;
      
      logHandoff('2️⃣ SEARCHING RECORDINGS', { query: search_query, limit });

      // Search voice recordings
      const recordings = await voiceRecordingService.searchRecordings(userId, search_query.trim(), limit);

      if (recordings.length === 0) {
        logHandoff('3️⃣ NO RESULTS', { query: search_query });
        return `I didn't find any voice recordings matching "${search_query}". Try different keywords or create some memories first to build up your voice history.`;
      }

      logHandoff('4️⃣ FORMATTING RESULTS', { recordingsFound: recordings.length });

      // Format results conversationally
      let response = `I found ${recordings.length} voice recording${recordings.length === 1 ? '' : 's'} matching "${search_query}":\n\n`;

      recordings.forEach((recording, index) => {
        const date = new Date(recording.created_at).toLocaleDateString();
        const duration = Math.round(recording.duration_seconds);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        
        const sessionModeText = recording.session_mode || 'conversation';
        const memoryCount = recording.memory_ids?.length || 0;
        const memoryText = memoryCount > 0 ? ` (${memoryCount} memories created)` : '';
        
        response += `${index + 1}. **${sessionModeText.replace('_', ' ')}** - ${date} (${durationText}${memoryText})\n`;
        response += `   ${recording.conversation_summary || 'Conversation recording'}\n`;
        
        if (recording.topics && recording.topics.length > 0) {
          response += `   Topics: ${recording.topics.slice(0, 3).join(', ')}\n`;
        }
        
        response += `   [Recording ID: ${recording.id}]\n\n`;
      });

      response += `To listen to any recording, just tell me the number or say "play recording [number]". I can also:\n`;
      response += `• Read you the transcript of what was said\n`;
      response += `• Find specific moments within a recording\n`;
      response += `• Show you memories created during that conversation\n\n`;
      response += `What would you like to do with these recordings?`;

      logHandoff('✅ SEARCH COMPLETE', { 
        recordingsReturned: recordings.length,
        responseLength: response.length 
      });

      return response;

    } catch (error) {
      logHandoff('❌ SEARCH FAILED', { error: error instanceof Error ? error.message : 'Unknown error' });
      return `Error searching voice recordings: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
    }
  }, [effectiveUser?.id]);

  // Play voice recording tool
  const playVoiceRecordingTool = useCallback(async (parameters: {
    recording_id?: string;
    recording_number?: number;
    action?: 'play' | 'transcript' | 'summary';
  }) => {
    const handoffId = `voice-play-${Date.now()}`;
    const logHandoff = (stage: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.log(`🎵 [${handoffId}] VOICE PLAY: ${stage} @ ${timestamp}`, data || '');
    };

    try {
      logHandoff('1️⃣ RECEIVED', { source: 'ElevenLabs voice agent', parameters });

      if (!effectiveUser?.id) {
        return 'You must be logged in to access your voice recordings.';
      }

      const { recording_id, recording_number, action = 'play' } = parameters;
      
      if (!recording_id && !recording_number) {
        return 'Please specify which recording you want to access by ID or number from the search results.';
      }

      const userId = effectiveUser.id;
      
      logHandoff('2️⃣ FETCHING RECORDING', { recordingId: recording_id, recordingNumber: recording_number });

      // Get recording details
      let query = supabase
        .from('voice_recordings')
        .select('*')
        .eq('user_id', userId);

      if (recording_id) {
        query = query.eq('id', recording_id);
      }
      
      const { data: recordings, error } = await query
        .order('created_at', { ascending: false })
        .limit(recording_number ? recording_number : 1);

      if (error) {
        logHandoff('❌ FETCH ERROR', { error: error.message });
        return `Error retrieving recording: ${error.message}`;
      }

      let recording;
      if (recording_number && recordings) {
        recording = recordings[recording_number - 1]; // Convert to 0-based index
      } else if (recordings && recordings.length > 0) {
        recording = recordings[0];
      }

      if (!recording) {
        logHandoff('❌ RECORDING NOT FOUND', { recordingId: recording_id, recordingNumber: recording_number });
        return 'Recording not found. Please check the ID or number and try again.';
      }

      logHandoff('3️⃣ PROCESSING REQUEST', { 
        action, 
        recordingId: recording.id,
        duration: recording.duration_seconds 
      });

      if (action === 'transcript') {
        if (!recording.transcript_text) {
          return 'No transcript is available for this recording.';
        }
        
        const date = new Date(recording.created_at).toLocaleDateString();
        const duration = Math.round(recording.duration_seconds);
        const durationText = duration > 60 ? `${Math.floor(duration/60)}m ${duration%60}s` : `${duration}s`;
        
        return `Here's the transcript from your ${recording.session_mode?.replace('_', ' ')} session on ${date} (${durationText}):\n\n"${recording.transcript_text}"\n\nWould you like me to play the audio, or is there anything specific you want to know about this conversation?`;
      }

      if (action === 'summary') {
        const date = new Date(recording.created_at).toLocaleDateString();
        const memoryCount = recording.memory_ids?.length || 0;
        const topicsText = recording.topics?.length > 0 ? `\nTopics discussed: ${recording.topics.join(', ')}` : '';
        
        return `Summary of your ${recording.session_mode?.replace('_', ' ')} session from ${date}:\n\n${recording.conversation_summary || 'No summary available'}${topicsText}\n\n${memoryCount > 0 ? `${memoryCount} memories were created during this conversation.\n\n` : ''}Would you like to hear the full recording or see the transcript?`;
      }

      // Default action: play
      logHandoff('4️⃣ GENERATING PLAY URL', { storagePath: recording.storage_path });
      
      try {
        const audioUrl = await voiceRecordingService.getAudioUrl(recording.storage_path);
        
        const date = new Date(recording.created_at).toLocaleDateString();
        const duration = Math.round(recording.duration_seconds);
        const durationText = duration > 60 ? `${Math.floor(duration/60)}m ${duration%60}s` : `${duration}s`;
        
        // Note: In a real implementation, you'd need a way to trigger audio playback in the browser
        // For now, we'll provide instructions to the user
        logHandoff('✅ PLAY REQUEST COMPLETE', { audioUrl: 'generated', duration: recording.duration_seconds });
        
        return `I've prepared your ${recording.session_mode?.replace('_', ' ')} recording from ${date} (${durationText}) for playback. Unfortunately, I can't directly play audio through voice conversation yet, but I can:\n\n1. Read you the transcript of what was said\n2. Give you a summary of the conversation\n3. Show you any memories that were created\n\nWhich would you prefer? Or would you like to search for a different recording?`;
        
      } catch (audioError) {
        logHandoff('❌ AUDIO URL ERROR', { error: audioError });
        return 'I found the recording but had trouble preparing it for playback. Would you like me to read the transcript instead?';
      }

    } catch (error) {
      logHandoff('❌ PLAY FAILED', { error: error instanceof Error ? error.message : 'Unknown error' });
      return `Error accessing voice recording: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
    }
  }, [effectiveUser?.id, supabase]);

  // Enhanced conversation suggestions tool that considers session mode
  const getConversationSuggestionsTool = useCallback(async (parameters: {
    type: 'starter' | 'followup' | 'reflection';
    context?: string;
    recent_memory_id?: string;
  }) => {
    const handoffId = `suggestions-${Date.now()}`;
    const logHandoff = (stage: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.log(`💭 [${handoffId}] SUGGESTIONS: ${stage} @ ${timestamp}`, data || '');
    };

    try {
      logHandoff('1️⃣ RECEIVED', { source: 'ElevenLabs voice agent', parameters });

      const { type } = parameters;
      let suggestions: string[] = [];

      // For greeting phase, provide mode selection questions
      if (conversationState.conversationPhase === 'greeting' || conversationState.sessionMode === 'unset') {
        logHandoff('2️⃣ GREETING PHASE', { phase: conversationState.conversationPhase });
        
        const greetingOptions = [
          "Hi! I'm Solin, your memory companion. Would you like to create a daily journal entry, preserve a new memory, browse and edit existing memories, or just have an open conversation?",
          "Hello! I can help you in a few ways today: daily reflection, capture new memories, explore and modify existing memories, or general conversation. What interests you?",
          "Welcome! I'm here to help with your life stories. Are you looking to journal about today, share a new memory, work with memories you've already saved, or have a general chat?"
        ];

        // Return one random greeting option
        suggestions = [greetingOptions[Math.floor(Math.random() * greetingOptions.length)]];
        
        logHandoff('✅ GREETING SUGGESTIONS', { count: suggestions.length });
        return suggestions.join('\n\n');
      }

      // Generate suggestions based on session mode and conversation phase
      const { sessionMode } = conversationState;
      
      if (sessionMode === 'daily_journal') {
        if (type === 'starter') {
          suggestions = [
            "What was the highlight of your day today?",
            "How are you feeling as you reflect on today?",
            "What's one thing that happened today that you want to remember?",
            "Tell me about a moment from today that stood out to you."
          ];
        } else if (type === 'followup') {
          suggestions = [
            "How did that make you feel in the moment?",
            "What did you learn about yourself from that experience?",
            "Is this something you'd like to do more often?",
            "What would you tell someone else who experienced something similar?"
          ];
        }
      } else if (sessionMode === 'memory_creation') {
        if (type === 'starter') {
          suggestions = [
            "What's a memory that always brings a smile to your face?",
            "Tell me about a moment that changed your perspective on something.",
            "What's a story from your past that you'd want future generations to know?",
            "Share a memory of someone who made a significant impact on your life."
          ];
        } else if (type === 'followup') {
          suggestions = [
            "What details about that day do you remember most vividly?",
            "Who else was there, and what were they like?",
            "How did that experience shape who you are today?",
            "What emotions come up when you think about that time?"
          ];
        }
      } else if (sessionMode === 'memory_browsing') {
        if (type === 'starter') {
          suggestions = [
            "Would you like me to show you your recent memories, or are you looking for something specific?",
            "I can help you find memories by topic, time period, or search terms. What are you interested in exploring?",
            "What memories would you like to revisit today? I can browse by theme, date, or help you search for specific experiences.",
            "Are you looking to find a particular memory, or would you like me to show you what you've saved recently?"
          ];
        } else if (type === 'followup') {
          suggestions = [
            "Would you like me to read the full memory to you?",
            "Is there anything you'd like to add to this memory?",
            "Would you like to modify or update any part of this memory?",
            "Does this memory remind you of other related experiences you'd like to explore?"
          ];
        }
      } else {
        // General chat mode - use existing intelligent prompting
        if (!effectiveUser?.id) {
          suggestions = [
            "What's something meaningful that's happened in your life recently?",
            "Tell me about a person who has influenced you.",
            "What's a decision you've made that you're proud of?"
          ];
        } else {
          // Use existing intelligent prompting system
          const memoryProfile = conversationState.userMemoryProfile;
          if (memoryProfile && type === 'starter') {
            suggestions = intelligentPrompting.generateConversationStarters(memoryProfile);
          } else if (type === 'reflection') {
            const lastTopic = conversationState.recentTopics[0];
            suggestions = intelligentPrompting.generateReflectionPrompts(memoryProfile, lastTopic);
          }
        }
      }

      logHandoff('3️⃣ GENERATED', { 
        sessionMode, 
        type, 
        suggestionCount: suggestions.length,
        phase: conversationState.conversationPhase 
      });

      // Fallback suggestions if none generated
      if (suggestions.length === 0) {
        suggestions = [
          "What's on your mind right now?",
          "Tell me about something that's been important to you lately.",
          "What would you like to explore or remember today?"
        ];
        logHandoff('4️⃣ FALLBACK USED', { count: suggestions.length });
      }

      logHandoff('✅ SUGGESTIONS COMPLETE', { finalCount: suggestions.length });

      // Return top 3 suggestions, separated by newlines
      return suggestions.slice(0, 3).join('\n\n');
    } catch (error) {
      logHandoff('❌ SUGGESTIONS FAILED', { error: error instanceof Error ? error.message : 'Unknown error' });
      return "What would you like to talk about today?";
    }
  }, [effectiveUser, conversationState, intelligentPrompting]);

  const conversationOptionsRef = useRef({
    clientTools: { 
      save_memory: saveMemoryTool,
      save_biography_topic: saveBiographyTopicTool,
      retrieve_memory: retrieveMemoryTool,
      get_memory_details: getMemoryDetailsTool,
      browse_memories: browseMemoriesTool,
      edit_memory: editMemoryTool,
      voice_search: voiceSearchTool,
      play_voice_recording: playVoiceRecordingTool,
      get_conversation_suggestions: getConversationSuggestionsTool,
      initialize_session: initializeSessionTool,
      close_conversation: closeConversationTool,
      edit_biography: editBiographyTool
    },
    onConnect: onConnectCb,
    onDisconnect: onDisconnectCb,
    onError: onErrorCb,
    onMessage: (message: unknown) => {
      console.log('🗣️ ElevenLabs message:', message);
      
      // Enhanced debugging for transcript capture
      if (typeof message === 'object' && message !== null) {
        const msg = message as any;
        console.log('📝 Message analysis:', {
          type: msg.type,
          source: msg.source,
          hasMessage: !!msg.message,
          hasDelta: !!msg.delta,
          isRecording,
          messageKeys: Object.keys(msg),
          fullMessage: msg
        });
        
        // Handle different message types for transcript capture
        let transcriptText = '';
        let speaker: 'user' | 'ai' | null = null;
        
        if (msg.type === 'response.audio_transcript.delta' && msg.delta) {
          transcriptText = msg.delta;
          speaker = 'ai';
          console.log('📝 AI transcript delta captured:', transcriptText);
          
          setConversationMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'ai') {
              return [...prev.slice(0, -1), { role: 'ai', text: last.text + msg.delta }];
            }
            return [...prev, { role: 'ai', text: msg.delta }];
          });
        } else if (msg.type === 'response.audio_transcript.done' && msg.transcript) {
          transcriptText = msg.transcript;
          speaker = 'ai';
          console.log('📝 AI transcript complete captured:', transcriptText);
        } else if (msg.source === 'user' && msg.message) {
          transcriptText = msg.message;
          speaker = 'user';
          console.log('📝 User message captured:', transcriptText);
          
          setConversationMessages(prev => [...prev, { role: 'user', text: msg.message }]);
          
          // Extract topics from user messages for smarter context
          const topics = msg.message.toLowerCase().match(/\b(family|childhood|school|work|travel|memory|remember|story|time|years?|ago)\b/g) || [];
          if (topics.length > 0) {
            setConversationState(prev => ({
              ...prev,
              recentTopics: [...new Set([...topics, ...prev.recentTopics])].slice(0, 10)
            }));
          }
        } else if (msg.source === 'ai' && msg.message) {
          transcriptText = msg.message;
          speaker = 'ai';
          console.log('📝 AI message captured:', transcriptText);
          
          setConversationMessages(prev => [...prev, { role: 'ai', text: msg.message }]);
        } else if (msg.type === 'user_transcript' && msg.transcript) {
          transcriptText = msg.transcript;
          speaker = 'user';
          console.log('📝 User transcript captured:', transcriptText);
        }
        
        // Add to conversation recording transcript if we have valid content
        if (transcriptText && speaker && isRecording) {
          console.log('📝 Adding to conversation transcript:', { speaker, text: transcriptText.substring(0, 50) + '...' });
          conversationRecordingService.addTranscriptEntry(speaker, transcriptText);
        } else if (isRecording) {
          console.log('📝 Transcript not added - missing data:', { hasText: !!transcriptText, hasSpeaker: !!speaker, isRecording });
        }
      }
    },
  });

  const conversation = useConversation(conversationOptionsRef.current);

  // Removed agentId fallback; we only use signedUrl sessions to match SDK types.


  useEffect(() => {
    console.log('🛰️ Conversation status:', conversation.status, 'speaking:', conversation.isSpeaking);
  }, [conversation.status, conversation.isSpeaking]);

  // ===== DEBUG: Expose voice recording test functions globally =====
  useEffect(() => {
    (window as any).testGuestRecording = testGuestRecording;
    (window as any).testAuthenticatedRecording = testAuthenticatedRecording;
    (window as any).checkDatabaseRecordings = checkDatabaseRecordings;
    (window as any).checkGuestRecordings = checkGuestRecordings;
    (window as any).voiceRecordingService = voiceRecordingService;
    console.log('🔧 DEBUG: Voice recording test functions exposed to window object');
  }, []);

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
      
      // Store user ID in ref for voice recording callback
      authenticatedUserIdRef.current = finalUserId;
      
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
      setIsEndingConversation(true);
      
      // Show immediate feedback
      const timeoutSeconds = Math.round(configurationService.getConversationEndTimeout() / 1000);
      toast({ 
        title: 'Ending conversation...', 
        description: `Solin will say goodbye and wrap up naturally. The session will end automatically when Solin finishes speaking (max ${timeoutSeconds}s).`,
        duration: 6000
      });
      
      // Set up timeout and speaking monitoring for graceful conversation end
      let hasEnded = false;
      const endTimeout = setTimeout(async () => {
        if (hasEnded) return;
        hasEnded = true;
        try {
          console.log('🛑 Timeout reached (2 minutes) - forcefully ending ElevenLabs session...');
          
          // More aggressive session termination
          if (conversation.status === 'connected') {
            await conversation.endSession();
          }
          
          // Force disconnect if still connected
          if (conversation.status !== 'disconnected') {
            console.log('🔄 Force disconnecting...');
            conversation.disconnect();
          }
          
          // Stop voice recording if active
          if (isRecording && recordingSessionId) {
            try {
              console.log('🛑 Stopping voice recording due to conversation end...');
              await voiceRecordingService.stopRecording();
              setIsRecording(false);
              setRecordingSessionId(null);
              console.log('✅ Voice recording stopped and saved');
            } catch (error) {
              console.error('⚠️ Failed to stop voice recording:', error);
            }
          }
          
          // Clear all conversation state
          setConversationMessages([]);
          setIsEndingConversation(false);
          setIsConnected(false);
          
          console.log('✅ Session ended successfully');
          
          // Navigate to timeline with memory highlighting if we saved a memory during this session
          if (lastSavedMemoryId) {
            console.log(`🎯 Redirecting to Timeline with memory highlight: ${lastSavedMemoryId}`);
            navigate(`/timeline?highlight=${lastSavedMemoryId}&new=true`);
            toast({ 
              title: 'Conversation ended', 
              description: 'Session saved. Your new memory is highlighted on the Timeline!' 
            });
          } else {
            // No memory saved during this session, just go to timeline
            navigate('/timeline');
            toast({ 
              title: 'Conversation ended', 
              description: 'Session saved. Check your Timeline for memories!' 
            });
          }
        } catch (endError) {
          console.error('Error in forced session end:', endError);
          setIsEndingConversation(false);
        }
      }, configurationService.getConversationEndTimeout()); // Use configurable timeout
      
      // Also monitor for when Solin finishes speaking naturally
      const checkSpeakingStatus = () => {
        if (hasEnded) return;
        
        // If Solin has stopped speaking, wait a bit longer then end gracefully
        if (!conversation.isSpeaking && conversation.status === 'connected') {
          console.log('🎯 Solin finished speaking - ending conversation gracefully...');
          
          // Wait configured grace period after Solin stops speaking to ensure natural completion
          setTimeout(() => {
            if (hasEnded) return;
            hasEnded = true;
            clearTimeout(endTimeout);
            
            // End the conversation naturally since Solin finished speaking
            console.log('✅ Natural conversation end - Solin finished speaking');
            
            // Force end session
            if (conversation.status === 'connected') {
              conversation.endSession().catch(console.error);
            }
            if (conversation.status !== 'disconnected') {
              conversation.disconnect();
            }
            
            // Stop voice recording if active
            if (isRecording && recordingSessionId) {
              voiceRecordingService.stopRecording().catch(console.error);
              setIsRecording(false);
              setRecordingSessionId(null);
            }
            
            // Clear state and navigate
            setConversationMessages([]);
            setIsEndingConversation(false);
            setIsConnected(false);
            
            if (lastSavedMemoryId) {
              navigate(`/timeline?highlight=${lastSavedMemoryId}&new=true`);
              toast({ 
                title: 'Conversation ended naturally', 
                description: 'Session saved. Your new memory is highlighted on the Timeline!' 
              });
            } else {
              navigate('/timeline');
              toast({ 
                title: 'Conversation ended', 
                description: 'Session saved. Check your Timeline for memories!' 
              });
            }
          }, configurationService.getNaturalEndGracePeriod()); // Use configurable grace period
        } else {
          // Check again at configured interval
          setTimeout(checkSpeakingStatus, configurationService.getSpeakingCheckInterval());
        }
      };
      
      // Start monitoring Solin's speaking status
      setTimeout(checkSpeakingStatus, configurationService.getSpeakingCheckInterval()); // Start checking at configured interval
      
    } catch (error) {
      console.error('Error ending conversation:', error);
      setIsEndingConversation(false);
      
      // Fallback: direct session end if initial attempt fails
      try {
        await conversation.endSession();
        setConversationMessages([]);
        toast({ title: 'Conversation ended', description: 'Your session has ended' });
      } catch (fallbackError) {
        console.error('Fallback end session failed:', fallbackError);
        toast({ title: 'Session end error', description: 'Please refresh the page', variant: 'destructive' });
      }
    }
  }, [conversation, toast, navigate]);

  useEffect(() => {
    startConversationRef.current = startConversation;
    return () => { startConversationRef.current = undefined; };
  }, [startConversation]);

  // Check if user needs first conversation
  useEffect(() => {
    const checkFirstConversationStatus = async () => {
      if (!effectiveUser?.id) {
        setCheckingProfile(false);
        return;
      }

      try {
        console.log('🔍 Checking first conversation status...');
        const needsFirstConv = await userProfileService.needsFirstConversation(effectiveUser.id);
        
        console.log(`👤 User needs first conversation: ${needsFirstConv}`);
        setNeedsFirstConversation(needsFirstConv);
        
        if (needsFirstConv) {
          setShowFirstConversation(true);
        }
      } catch (error) {
        console.error('❌ Error checking first conversation status:', error);
        // Default to showing first conversation on error for safety
        setNeedsFirstConversation(true);
        setShowFirstConversation(true);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkFirstConversationStatus();
  }, [effectiveUser?.id]);

  // Handle first conversation completion
  const handleFirstConversationComplete = useCallback(() => {
    console.log('✅ First conversation completed');
    setNeedsFirstConversation(false);
    setShowFirstConversation(false);
    
    toast({
      title: 'Welcome to Solin!',
      description: 'Your profile has been created. Let\'s start capturing your memories!',
    });
  }, [toast]);

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

    // Prevent interaction if first conversation is needed
    if (needsFirstConversation) {
      toast({
        title: 'Complete your profile first',
        description: 'Please finish the welcome conversation to get started with Solin.',
      });
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
            className="flex-1 max-w-xl w-full h-[75vh] lg:h-[85vh] bg-white rounded-lg border-[1.5px] shadow-elevated p-8 flex flex-col justify-center animate-fade-in"
            style={{ 
              borderColor: 'hsl(var(--section-border))'
            }}
          >
            
            <div className="flex flex-col items-center gap-6">
              <div className="relative mt-12">
                {isConnecting ? (
                  <div className="w-40 h-40 flex items-center justify-center">
                    <Sparkles className="h-14 w-14 text-primary animate-pulse" />
                  </div>
                ) : (
                  <ModernVoiceAgent 
                    isActive={isConnected} 
                    isSpeaking={isSpeaking}
                    onClick={handleOrbPress}
                  />
                )}
              </div>

              <div className="text-center space-y-3 mt-8">
                {/* Personalized welcome message */}
                {user && (
                  <div className="mb-6">
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

                </div>
                
                {/* User authentication indicator */}
                {user && (
                  <div className="space-y-2">
                    <div className="text-xs bg-green-100 text-green-800 px-3 py-2 rounded-full border border-green-200">
                      ✅ Signed in as {user.email}
                    </div>
                    {/* Debug button for testing database access */}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={async () => {
                        console.log('🧪 Testing memory database access...');
                        toast({
                          title: 'Testing Database',
                          description: 'Check browser console for results...',
                        });
                        
                        try {
                          // Test memory insertion with current user
                          const testMemory = {
                            user_id: user.id,
                            title: 'Database Test Memory',
                            text: 'This is a test memory to verify database access and RLS policies.',
                            tags: ['test', 'debug'],
                            memory_date: '2025-10-20',
                            memory_location: 'Debug Environment'
                          };
                          
                          console.log('🧪 Attempting to insert test memory...', testMemory);
                          
                          const { data: newMemory, error: insertError } = await supabase
                            .from('memories')
                            .insert(testMemory)
                            .select();
                            
                          if (insertError) {
                            console.error('❌ Memory insert failed:', insertError);
                            toast({
                              title: 'Database Test Failed',
                              description: `Error: ${insertError.message}`,
                              variant: 'destructive'
                            });
                          } else {
                            console.log('✅ Memory insert succeeded!', newMemory);
                            toast({
                              title: 'Database Test Passed!',
                              description: 'Memory creation works - voice recording should work too!',
                            });
                            
                            // Clean up test memory
                            const { error: deleteError } = await supabase
                              .from('memories')
                              .delete()
                              .eq('id', newMemory[0].id);
                              
                            if (deleteError) {
                              console.warn('⚠️ Failed to clean up test memory:', deleteError);
                            } else {
                              console.log('🧹 Test memory cleaned up successfully');
                            }
                          }
                        } catch (error) {
                          console.error('💥 Unexpected error:', error);
                          toast({
                            title: 'Database Test Error',
                            description: 'Check console for details',
                            variant: 'destructive'
                          });
                        }
                      }}
                      className="text-xs"
                    >
                      🧪 Test Database Access
                    </Button>
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
                    {/* Conversation active indicator */}
                    <div className="text-xs text-muted-foreground bg-green-50 px-4 py-2 rounded-full border border-green-200">
                      🎙️ Conversation active — Use the transcript box to save and end
                    </div>
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

          {/* Right Side - Live Conversation Transcript - Enhanced with golden clouds background */}
          <div 
            className="flex-1 max-w-xl w-full h-[75vh] lg:h-[80vh] rounded-lg border-[1.5px] shadow-elevated p-5 flex flex-col overflow-hidden relative"
            style={{ 
              borderColor: 'hsl(var(--section-border))',
              backgroundImage: 'url(https://page.gensparksite.com/v1/base64_upload/5c053105de9ee6c4ead70f426c7dff6d)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* Overlay to ensure text readability */}
            <div className="absolute inset-0 bg-white/85 backdrop-blur-[1px] rounded-lg"></div>
            
            {/* Content container with relative positioning */}
            <div className="relative z-10 flex flex-col h-full">
              {/* Header with enhanced styling for visibility over background */}
              <div className="mb-3 pb-3 border-b" style={{ borderColor: 'hsl(var(--section-border))' }}>
                <h2 className="text-base font-bold text-foreground drop-shadow-sm">
                  Live Transcript
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 drop-shadow-sm">Real-time conversation with Solin</p>
                {!isConnected && (
                  <p className="text-xs text-muted-foreground/80 mt-2 bg-white/60 px-3 py-1.5 rounded-full border border-gray-200 inline-block drop-shadow-sm">
                    💬 Share as much or as little as you'd like — you can save and stop anytime
                  </p>
                )}
              </div>
              
              {/* Messages container */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 mb-4">
                {conversationMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-muted-foreground text-sm text-center drop-shadow-sm">
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
                        className={`max-w-[85%] rounded-lg px-3 py-1.5 transition-all hover:scale-[1.02] shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-white rounded-br-md'
                            : 'bg-white/90 text-foreground rounded-bl-md border border-gray-200'
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
              
              {/* Save and End Button - Prominently placed in transcript box */}
              {isConnected && (
                <div className="border-t pt-4 space-y-3" style={{ borderColor: 'hsl(var(--section-border))' }}>
                  {/* Helpful message */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground bg-white/60 px-3 py-2 rounded-full border border-gray-200 inline-block drop-shadow-sm">
                      💬 Click below anytime to save and end your conversation
                    </p>
                  </div>
                  
                  {/* Prominent Save & End Button */}
                  <Button 
                    onClick={endConversation} 
                    size="lg"
                    disabled={isEndingConversation}
                    className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] border-2 border-white/20 disabled:opacity-70 disabled:hover:scale-100"
                  >
                    {isEndingConversation ? (
                      <>⏳ Waiting for Solin to finish speaking...</>
                    ) : (
                      <>✨ Save & End Conversation ✨</>
                    )}
                  </Button>
                  
                  {/* Session info */}
                  {conversationState.totalMemoriesSaved > 0 && (
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground bg-white/60 px-3 py-1.5 rounded-full inline-block border border-gray-200 drop-shadow-sm">
                        🧠 {conversationState.totalMemoriesSaved} memories saved • {conversationState.recentTopics.length} topics discussed
                      </div>
                    </div>
                  )}
                </div>
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
      
      {/* First Conversation Dialog */}
      <FirstConversationDialog 
        isOpen={showFirstConversation}
        onComplete={handleFirstConversationComplete}
      />
    </div>
  );
};

export default Index;
