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

  const saveMemoryTool = useCallback(async (parameters: { title: string; content: string; tags?: string[] }) => {
    try {
      console.log('💾 Saving memory:', parameters);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('memories').insert({
        user_id: user.id,
        title: parameters.title,
        text: parameters.content,
        tags: parameters.tags || []
      });
      if (error) throw error;
      toast({ title: 'Memory saved', description: parameters.title });
      return 'Memory saved successfully';
    } catch (error) {
      console.error('Failed to save memory:', error);
      toast({
        title: 'Failed to save memory',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return 'Failed to save memory';
    }
  }, [toast]);

  const onConnectCb = useCallback(() => {
    console.log('✅ Connected to ElevenLabs');
    noEndBeforeRef.current = Date.now() + 2000;
    toast({ title: 'Connected', description: 'Start speaking naturally' });
  }, [toast]);

  const onDisconnectCb = useCallback(() => {
    console.log('👋 Disconnected');
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
      console.log('🔍 Solin0 requesting memory:', parameters.query);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'Not authenticated';
      
      const { data: memories } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', user.id)
        .or(`title.ilike.%${parameters.query}%,text.ilike.%${parameters.query}%`)
        .order('created_at', { ascending: false })
        .limit(3);

      if (memories && memories.length > 0) {
        const result = memories.map(m => 
          `Memory from ${new Date(m.created_at).toLocaleDateString()}: ${m.title || ''} - ${m.text || ''}`
        ).join('\n\n');
        console.log('✅ Found memories:', result);
        return result;
      }
      
      return 'No specific memories found for that query.';
    } catch (error) {
      console.error('Error retrieving memory:', error);
      return 'Unable to retrieve memories at this time.';
    }
  }, []);

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

  useEffect(() => {
    console.log('🛰️ Conversation status:', conversation.status, 'speaking:', conversation.isSpeaking);
  }, [conversation.status, conversation.isSpeaking]);

  const startConversation = useCallback(async () => {
    try {
      setIsConnecting(true);
      
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Fetch user memories for context
      const { data: memoriesData } = await supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Create a summary of key facts instead of all memories
      const memoryContext = memoriesData && memoriesData.length > 0
        ? `You have access to ${memoriesData.length} saved memories. Key themes include topics like: ${
            [...new Set(memoriesData.flatMap(m => m.tags || []))].slice(0, 5).join(', ') || 'various life experiences'
          }. Use the retrieve_memory tool to search for specific memories when the user mentions topics or asks questions about their past.`
        : 'No memories yet. Help the user create their first memory.';

      const { data, error } = await supabase.functions.invoke('elevenlabs-agent-token', {
        body: { agentId: 'agent_3201k6n4rrz8e2wrkf9tv372y0w4' }
      });

      if (error) throw error;
      if (!data?.signed_url) throw new Error('Failed to get signed URL');

      console.log('Starting session with memory context...');
      await Promise.race([
        conversation.startSession({
          signedUrl: data.signed_url,
          overrides: {
            agent: {
              prompt: {
                prompt: `You are Solin0, a warm AI voice companion helping users preserve their life stories. ${memoryContext}\n\nWhen users mention specific topics, events, or ask about their past, use the retrieve_memory tool to search for relevant memories (e.g., retrieve_memory with query "vacation" or "2020"). Use the save_memory tool to save new memories when users share stories. Ask thoughtful, open-ended questions to help them explore meaningful moments.`
              }
            }
          }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), 12000))
      ]);
      
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
  }, [conversation, toast]);

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

  if (user) {
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

          {/* Right Side - Live Conversation Transcript */}
          <div className="flex-1 max-w-2xl h-[80vh] bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-xl rounded-2xl border border-primary/20 shadow-2xl p-8 flex flex-col overflow-hidden">
            <div className="mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent animate-pulse">
                Live Conversation
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Real-time transcript with Solin0</p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {conversationMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground text-lg text-center">
                    Start a conversation to see the live transcript appear here...
                  </p>
                </div>
              ) : (
                conversationMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-6 rounded-2xl transform transition-all duration-300 hover:scale-[1.02] ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-primary/30 to-primary/10 border-l-4 border-primary shadow-lg ml-8'
                        : 'bg-gradient-to-br from-blue-500/20 to-blue-400/10 border-l-4 border-blue-400 shadow-lg mr-8'
                    }`}
                  >
                    <p className="text-base font-bold mb-2 flex items-center gap-2">
                      {msg.role === 'user' ? '🎤 You' : '🤖 Solin0'}
                    </p>
                    <p className="text-lg leading-relaxed text-foreground">{msg.text}</p>
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
            <Button variant="ghost" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 rounded-full">
              <Link to="/auth">
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
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
              asChild
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-white px-8 py-6 rounded-full"
            >
              <Link to="/auth">
                Start for free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
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
