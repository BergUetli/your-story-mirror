import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useConversation } from '@11labs/react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ModernVoiceAgent } from '@/components/ModernVoiceAgent';
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
          tags: Array.isArray(parameters.tags) && parameters.tags.length > 0 ? parameters.tags : null,
          memory_date: formattedDate,
          memory_location: parameters.memory_location?.trim?.() || null,
          image_urls: null,
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
        duration: 5000,
      });
      
      logHandoff('✅ HANDOFF COMPLETE', { 
        status: 'success',
        agentResponse: `Memory "${memoryTitle}" saved successfully`,
        note: 'No auto-navigation - user can continue conversation'
      });
      
      return `Memory "${memoryTitle}" saved successfully! You can continue sharing stories, or the user can visit their Timeline to see it.`;
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
      <div className="min-h-screen bg-background overflow-hidden relative">
        
        <div className="relative min-h-screen flex flex-col lg:flex-row items-center justify-center px-6 lg:px-12 py-10 gap-8 lg:gap-10">
          {/* Left Side - Solon Orb - Framed with gradient panel */}
          <div 
            className="flex-1 max-w-xl flex flex-col items-center justify-center space-y-6 animate-fade-in p-8 rounded-lg border-[1.5px]"
            style={{ 
              borderColor: 'hsl(var(--section-border))',
              background: 'var(--gradient-panel)'
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
                <p className="text-base font-semibold text-foreground">
                  {isConnecting ? 'Connecting to Solon...' : isConnected ? (isSpeaking ? 'Solon is speaking' : 'Listening to you...') : 'Ready to preserve your memories'}
                </p>
                <p className="text-sm text-muted-foreground max-w-md">
                  {!isConnected && 'Click the microphone to start a natural conversation with Solon'}
                </p>
                {isConnected ? (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={endConversation} 
                    className="rounded-full border-2 hover:bg-destructive hover:text-white hover:border-destructive transition-all hover:scale-105 font-semibold"
                  >
                    End Conversation
                  </Button>
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
            <div className="mb-4 pb-3 border-b" style={{ borderColor: 'hsl(var(--section-border))' }}>
              <h2 className="text-lg font-bold text-foreground">
                Live Transcript
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Real-time conversation with Solon</p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
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
                      className={`max-w-[85%] rounded-lg px-4 py-2.5 transition-all hover:scale-[1.02] ${
                        msg.role === 'user'
                          ? 'bg-primary text-white rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}
                    >
                      <div className={`text-xs font-bold mb-1 ${
                        msg.role === 'user' ? 'text-white/70' : 'opacity-70'
                      }`}>
                        {msg.role === 'user' ? 'You' : 'Solon'}
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {msg.text}
                        {idx === conversationMessages.length - 1 && msg.role === 'ai' && (
                          <span className="inline-block w-1.5 h-4 bg-primary ml-1 animate-pulse rounded-sm" />
                        )}
                      </div>
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
    <div className="h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 bg-transparent border-b-[1.5px]" style={{ borderColor: 'hsl(var(--section-border))' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
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
      <div className="h-full flex items-center justify-center px-6">
        <div className="max-w-5xl w-full text-center space-y-6 animate-fade-in">
          <div className="space-y-4">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              Digital Memory Sanctuary
            </div>
            
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight text-foreground">
            Life is short.
            <br />
            Make your story
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              last forever
            </span>
          </h1>
            
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Preserve your voice, stories, and values. Create a lasting legacy.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={startConversation}
              disabled={isConnecting || isConnected}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-5 rounded-full font-semibold hover:scale-105 transition-all"
            >
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Start for free'}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
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
