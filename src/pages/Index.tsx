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
  const didRetryRef = useRef(false);
  const startConversationRef = useRef<(isRetry?: boolean) => Promise<void>>();

  const saveMemoryTool = useCallback(async (parameters: { title: string; content: string; tags?: string[] }) => {
    try {
      console.log('💾 Saving memory:', parameters);
      
      // Use placeholder UUID for testing without auth
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase
        .from('memories')
        .insert([{
          user_id: userId,
          title: parameters.title,
          text: parameters.content,
          tags: parameters.tags ?? [],
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Memory saved to database:', data);
      toast({ title: 'Memory saved', description: parameters.title });
      return 'Memory saved successfully';
    } catch (error) {
      console.error('❌ Failed to save memory:', error);
      toast({
        title: 'Failed to save memory',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return 'Failed to save memory';
    }
  }, [user?.id, toast]);

  const onConnectCb = useCallback(() => {
    console.log('✅ Connected to ElevenLabs');
    noEndBeforeRef.current = Date.now() + 2000;
    lastConnectedAtRef.current = Date.now();
    // Do NOT reset didRetryRef here to avoid reconnect loops
    toast({ title: 'Connected', description: 'Start speaking naturally' });
  }, [toast]);

  const onDisconnectCb = useCallback(() => {
    const elapsed = Date.now() - lastConnectedAtRef.current;
    console.log('👋 Disconnected after', elapsed, 'ms');
    
    const justConnected = elapsed < 3000;
    if (justConnected && !didRetryRef.current) {
      console.log('⚠️ Early disconnect detected, retrying with fresh signed URL...');
      didRetryRef.current = true;
      setTimeout(() => {
        startConversationRef.current?.(true);
      }, 500);
      return;
    }
    toast({ title: 'Disconnected', description: 'Voice session ended' });
  }, [toast]);

  const onErrorCb = useCallback((error: unknown) => {
    console.error('❌ Error:', error);
    toast({
      title: 'Connection failed',
      description: typeof error === 'string' ? error : 'Please try again',
      variant: 'destructive',
    });
  }, [toast]);

  const [conversationMessages, setConversationMessages] = useState<Array<{role: string, text: string}>>([]);

  const retrieveMemoryTool = useCallback(async (parameters: { query: string }) => {
    try {
      const q = parameters?.query?.trim() ?? '';
      console.log('🔍 Solon requesting memory:', q);
      if (!user?.id) return 'No user session; unable to access memories.';

      // Simple keyword search across title and text; optimized by recent indexes
      const escaped = q.replace(/%/g, '%25').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const orFilter = `title.ilike.%${escaped}%,text.ilike.%${escaped}%`;
      const { data, error } = await supabase
        .from('memories')
        .select('id,title,text,created_at')
        .eq('user_id', user.id)
        .or(orFilter)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Supabase retrieve error:', error);
        return 'Error retrieving memories.';
      }
      if (!data || data.length === 0) return 'No matching memories found.';

      const summarize = (s: string) => (s || '').replace(/\s+/g, ' ').slice(0, 160);
      const result = data
        .map((m, i) => `${i + 1}. ${m.title} — ${summarize(m.text)} (${new Date(m.created_at as string).toLocaleDateString()})`)
        .join(' | ');
      return `Matches: ${result}`;
    } catch (error) {
      console.error('Error retrieving memory:', error);
      return 'Unable to retrieve memories at this time.';
    }
  }, [user]);

  const conversationOptionsRef = useRef({
    clientTools: { 
      save_memory: saveMemoryTool,
      retrieve_memory: retrieveMemoryTool 
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


      const { data, error } = await supabase.functions.invoke('elevenlabs-agent-token', {
        body: { agentId: 'agent_3201k6n4rrz8e2wrkf9tv372y0w4' }
      });

      if (error) throw error;
      if (!data?.signed_url) throw new Error('Failed to get signed URL');

      console.log('Starting session...');
      // Prepare compact memory context to avoid large payload timeouts
      const basePrompt = `You are Solon, a warm AI voice companion helping users preserve their life stories. Ask thoughtful, open-ended questions to help them explore meaningful moments. Use the save_memory tool to save new memories when users share stories.`;
      let finalPrompt = basePrompt;
      try {
        if (user?.id) {
          const { data: mems, error: memErr } = await supabase
            .from('memories')
            .select('title,text,created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);
          if (!memErr && mems && mems.length) {
            const clip = (s: string) => (s || '').replace(/\s+/g, ' ').slice(0, 120);
            const ctxItems = mems.map(m => `${m.title} — ${clip(m.text)}`).join(' | ');
            const memoryContext = ctxItems.slice(0, 1000);
            finalPrompt = `${basePrompt}\nContext (recent user memories): ${memoryContext}`;
          }
        }
      } catch (e) {
        console.warn('⚠️ Failed to build memory context, proceeding without it:', e);
      }

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
  }, [conversation, toast, user?.id]);

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
        <div className="absolute inset-0 bg-gradient-to-br from-background via-slate-900/50 to-background" />
        
        <div className="relative h-screen flex items-center justify-center p-8 gap-8">
          {/* Left Side - Solon Orb */}
          <div className="flex-1 max-w-2xl space-y-12 animate-fade-in">
            
            <div className="flex flex-col items-center gap-8">
              <div className="relative">
                <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-500 rounded-full transform scale-150" />
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-blue-400/20 via-blue-600/30 to-blue-400/20 blur-sm" />
                  {isConnecting ? (
                    <div className="w-40 h-40 flex items-center justify-center">
                      <Sparkles className="h-16 w-16 text-blue-400 animate-pulse" />
                    </div>
                  ) : (
                    <AnimatedOrb isActive={isConnected} isSpeaking={isSpeaking} size={160} />
                  )}
                </div>
              </div>

              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  {isConnecting ? 'Connecting...' : isConnected ? (isSpeaking ? 'Solon is speaking' : 'Listening') : 'Start a conversation'}
                </p>
                {isConnected ? (
                  <Button variant="destructive" size="sm" onClick={endConversation} className="rounded-full">
                    End Conversation
                  </Button>
                ) : (
                  <Button size="sm" onClick={startConversation} disabled={isConnecting} className="rounded-full">
                    {isConnecting ? 'Connecting...' : 'Start'}
                  </Button>
                )}
              </div>
            </div>

            <Button asChild size="lg" className="rounded-full">
              <Link to="/dashboard">
                View Dashboard
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>

          {/* Right Side - Live Conversation Transcript - Matrix Terminal Style */}
          <div className="flex-1 max-w-2xl h-[80vh] bg-black rounded-2xl border-2 border-green-500/30 shadow-2xl shadow-green-500/20 p-6 flex flex-col overflow-hidden font-mono">
            <div className="mb-4 border-b border-green-500/30 pb-3">
              <h2 className="text-lg font-bold text-green-400 tracking-wider animate-pulse">
                &gt; LIVE TRANSCRIPT_
              </h2>
              <p className="text-xs text-green-500/70 mt-1">Real-time stream with Solon</p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-green-500/30 scrollbar-track-transparent">
              {conversationMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-green-500/50 text-sm text-center animate-pulse">
                    &gt; Awaiting input..._
                  </p>
                </div>
              ) : (
                conversationMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'text-green-300 pl-4 border-l-2 border-green-400/50'
                        : 'text-green-400 pl-4 border-l-2 border-green-500/30'
                    }`}
                  >
                    <div className="text-green-500/70 mb-1 text-[10px] uppercase tracking-wide">
                      {msg.role === 'user' ? '> USER:' : '> SOLON:'}
                    </div>
                    <div className="whitespace-pre-wrap break-words">
                      {msg.text}
                      {idx === conversationMessages.length - 1 && (
                        <span className="inline-block w-2 h-3 bg-green-400 ml-1 animate-pulse" />
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
    <div className="h-screen bg-background overflow-hidden">
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
