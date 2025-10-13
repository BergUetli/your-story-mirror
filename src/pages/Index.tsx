import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useConversation } from '@11labs/react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedOrb } from '@/components/AnimatedOrb';
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
  const [isConnecting, setIsConnecting] = useState(false);
  const noEndBeforeRef = useRef(0);
  const isTogglingRef = useRef(false);
  const lastConnectedAtRef = useRef(0);
  const retryCountRef = useRef(0);
  const startConversationRef = useRef<(isRetry?: boolean) => Promise<void>>();

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
      if (!title || !content) {
        logHandoff('❌ VALIDATION FAILED', { title, hasContent: !!content });
        return 'Missing required fields: title and content. Please ask the user to provide both before saving.';
      }
      
      logHandoff('2️⃣ VALIDATED', { title, contentLength: content.length });
      
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
      
      // Use placeholder UUID for testing without auth
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';
      
      logHandoff('4️⃣ SUBMITTING TO DATABASE', { userId, title, hasDate: !!formattedDate });

      const { data, error } = await supabase
        .from('memories')
        .insert([{ 
          user_id: userId,
          title,
          text: content,
          tags: parameters.tags ?? [],
          memory_date: formattedDate,
          memory_location: parameters.memory_location || null,
          image_urls: [], // No images from voice conversation
        }])
        .select()
        .single();

      if (error) {
        logHandoff('❌ DATABASE ERROR', { error: error.message, code: error.code });
        throw error;
      }

      logHandoff('5️⃣ DATABASE COMMITTED', { memoryId: data.id, title: data.title });
      
      // Return success message with memory ID so agent can confirm
      const memoryId = data?.id;
      const memoryTitle = data?.title || parameters.title;
      
      logHandoff('6️⃣ SHOWING USER FEEDBACK', { memoryId, memoryTitle });
      
      toast({ 
        title: 'Memory saved', 
        description: `"${memoryTitle}" has been preserved. View it on your Timeline!`,
      });
      
      // Navigate to timeline with animation after a short delay
      logHandoff('7️⃣ SCHEDULING NAVIGATION', { 
        target: '/timeline', 
        memoryId, 
        delay: '2000ms' 
      });
      
      setTimeout(() => {
        logHandoff('8️⃣ EXECUTING NAVIGATION', { 
          url: `/timeline?newMemory=${memoryId}&animate=true` 
        });
        window.location.href = `/timeline?newMemory=${memoryId}&animate=true&summary=${encodeURIComponent(memoryTitle)}`;
      }, 2000);
      
      logHandoff('✅ HANDOFF COMPLETE', { 
        status: 'success',
        agentResponse: `Memory "${memoryTitle}" saved successfully` 
      });
      
      return `Memory "${memoryTitle}" saved successfully. The user will be redirected to their Timeline to see it.`;
    } catch (error) {
      logHandoff('❌ HANDOFF FAILED', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      toast({
        title: 'Failed to save memory',
        description: errorMsg,
        variant: 'destructive',
      });
      
      return `Failed to save memory: ${errorMsg}. Please try again or ask the user to provide the date in a different format.`;
    }
  }, [user?.id, toast]);

  const onConnectCb = useCallback(() => {
    const timestamp = new Date().toISOString();
    console.log(`🔌 CONNECTION HANDOFF: ✅ CONNECTED @ ${timestamp}`, {
      status: 'ElevenLabs voice agent connected',
      retryCount: retryCountRef.current
    });
    
    noEndBeforeRef.current = Date.now() + 2000;
    lastConnectedAtRef.current = Date.now();
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

  const retrieveMemoryTool = useCallback(async (parameters: { query?: string; limit?: number }) => {
    try {
      const q = parameters?.query?.trim() ?? '';
      const maxResults = parameters?.limit ?? 5;
      console.log('🔍 Solon searching memories:', q, 'limit:', maxResults);
      if (!user?.id) return 'No user session; unable to access memories.';

      let query = supabase
        .from('memories')
        .select('id,title,created_at')
        .eq('user_id', user.id)
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
      return `Found ${data.length} matching memories:\n${result}\n\nTo get full details, use get_memory_details with the ID.`;
    } catch (error) {
      console.error('Error retrieving memory:', error);
      return 'Unable to retrieve memories at this time.';
    }
  }, [user]);

  const getMemoryDetailsTool = useCallback(async (parameters: { memory_id: string }) => {
    try {
      const memoryId = parameters?.memory_id?.trim();
      console.log('📖 Solon requesting details for memory:', memoryId);
      if (!user?.id) return 'No user session; unable to access memory details.';
      if (!memoryId) return 'Memory ID is required.';

      const { data, error } = await supabase
        .from('memories')
        .select('title,text,memory_date,memory_location,tags,created_at')
        .eq('id', memoryId)
        .eq('user_id', user.id)
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
      
      return details;
    } catch (error) {
      console.error('Error getting memory details:', error);
      return 'Unable to retrieve memory details at this time.';
    }
  }, [user]);

  // Static agent instructions - no memory context to avoid filling context window
  const agentInstructions = `You are Solon, a warm AI voice companion helping users preserve their life stories. You have access to two important tools:

1. save_memory: Use this to save new memories when users share stories. Include title, content, and optionally tags, date, and location.
2. retrieve_memory: Use this to search through the user's existing memories when they ask about past conversations or want to recall something.

IMPORTANT: When users ask about memories, use retrieve_memory - it returns only titles. If the user wants details about a specific memory, tell them you'll add a detail retrieval feature soon, but for now you can help them create new memories.

Keep responses brief and conversational. Ask one thoughtful, open-ended question at a time to help them explore meaningful moments.`;

  const conversationOptionsRef = useRef({
    clientTools: { 
      save_memory: saveMemoryTool,
      retrieve_memory: retrieveMemoryTool,
      get_memory_details: getMemoryDetailsTool
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
          setConversationMessages(prev => [...prev, { role: 'user', text: msg.message }]);
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
    try {
      setIsConnecting(true);
      
      await navigator.mediaDevices.getUserMedia({ audio: true });

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

      // Use orchestrator to manage ElevenLabs session
      console.log('🎙️ Requesting ElevenLabs session via Orchestrator...');
      const { data, error } = await supabase.functions.invoke('orchestrator', {
        body: { 
          userId: user?.id || '00000000-0000-0000-0000-000000000000',
          action: 'manage_elevenlabs_session',
          sessionParams: {
            agentId: 'agent_3201k6n4rrz8e2wrkf9tv372y0w4',
            action: 'start'
          }
        }
      });

      if (error) throw error;
      if (!data?.signed_url) throw new Error('Failed to get signed URL from Orchestrator');

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
      console.error('Failed to start:', error);
      toast({
        title: "Failed to connect",
        description: error instanceof Error ? error.message : "Could not start",
        variant: "destructive",
      });
    } finally {
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
      console.log('👋 Ending conversation...');
      await conversation.endSession();
      setConversationMessages([]);
      toast({ title: 'Conversation ended', description: 'Your session has ended' });
    } catch (error) {
      console.error('Error ending conversation:', error);
    }
  }, [conversation, toast]);

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
      description: 'Solon helps reflect on memories and guide conversations.',
    }
  ];

  // Always show Solon interface (auth disabled)
  const shouldShowSolonInterface = true;

  if (shouldShowSolonInterface) {
    return (
      <div className="min-h-screen bg-white overflow-hidden relative">
        
        <div className="relative min-h-screen flex flex-col lg:flex-row items-center justify-center px-8 lg:px-16 py-16 gap-12 lg:gap-16">
          {/* Left Side - Solon Orb */}
          <div className="flex-1 max-w-xl flex flex-col items-center justify-center space-y-8 animate-fade-in">
            
            <div className="flex flex-col items-center gap-8">
              <div className="relative">
                {isConnecting ? (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <Sparkles className="h-16 w-16 text-primary animate-pulse" />
                  </div>
                ) : (
                  <AnimatedOrb isActive={isConnected} isSpeaking={isSpeaking} size={200} />
                )}
              </div>

              <div className="text-center space-y-4">
                <p className="text-base text-muted-foreground font-light">
                  {isConnecting ? 'Connecting...' : isConnected ? (isSpeaking ? 'Solon is speaking' : 'Listening...') : 'Start a conversation'}
                </p>
                {isConnected ? (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={endConversation} 
                    className="rounded-full border-2 hover:bg-destructive hover:text-white hover:border-destructive transition-all"
                  >
                    End Conversation
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    onClick={startConversation} 
                    disabled={isConnecting} 
                    className="rounded-full bg-primary hover:bg-primary/90 text-white px-8 shadow-soft"
                  >
                    {isConnecting ? 'Connecting...' : 'Start'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Live Conversation Transcript - Matrix Terminal Style */}
          <div className="flex-1 max-w-xl w-full h-[75vh] lg:h-[80vh] bg-black rounded-xl border-2 border-green-500/40 shadow-2xl shadow-green-500/20 p-6 flex flex-col overflow-hidden font-mono">
            <div className="mb-4 border-b border-green-500/30 pb-3">
              <h2 className="text-base font-bold text-green-400 tracking-wider">
                &gt; LIVE_TRANSCRIPT
              </h2>
              <p className="text-xs text-green-500/60 mt-1">Real-time conversation with Solon</p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-green-500/30 scrollbar-track-transparent">
              {conversationMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-green-500/50 text-sm text-center animate-pulse">
                    &gt; awaiting_input..._
                  </p>
                </div>
              ) : (
                conversationMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'text-green-300 pl-3 border-l-2 border-green-400/60'
                        : 'text-green-400 pl-3 border-l-2 border-green-500/40'
                    }`}
                  >
                    <div className="text-green-500/70 mb-1.5 text-[11px] uppercase tracking-wide font-semibold">
                      {msg.role === 'user' ? '> user:' : '> solon:'}
                    </div>
                    <div className="whitespace-pre-wrap break-words">
                      {msg.text}
                      {idx === conversationMessages.length - 1 && (
                        <span className="inline-block w-2 h-3.5 bg-green-400 ml-1 animate-pulse" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white overflow-hidden">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
          <div className="text-2xl font-bold">You, Remembered</div>
          <div className="flex gap-4">
            <Button variant="ghost" asChild>
              <Link to="/about">About</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/how-it-works">How It Works</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Single Screen Hero */}
      <div className="h-full flex items-center justify-center px-8">
        <div className="max-w-5xl w-full text-center space-y-8 animate-fade-in">
          <div className="space-y-6">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Digital Memory Sanctuary
            </div>
            
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-tight">
            Life is short.
            <br />
            Make your story
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              last forever
            </span>
          </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Preserve your voice, stories, and values. Create a lasting legacy.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={startConversation}
              disabled={isConnecting || isConnected}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-6 rounded-full"
            >
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Start for free'}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3 justify-center pt-4">
            {features.slice(0, 4).map((feature, index) => (
              <div key={index} className="px-4 py-2 rounded-full bg-card border border-border/50 text-sm text-muted-foreground flex items-center gap-2">
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
