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

  const conversationOptionsRef = useRef({
    onConnect: onConnectCb,
    onDisconnect: onDisconnectCb,
    onError: onErrorCb,
    onMessage: (message: unknown) => console.log('🗣️ ElevenLabs message:', message),
  });

  const conversation = useConversation(conversationOptionsRef.current);

  useEffect(() => {
    console.log('🛰️ Conversation status:', conversation.status, 'speaking:', conversation.isSpeaking);
  }, [conversation.status, conversation.isSpeaking]);

  const startConversation = useCallback(async () => {
    try {
      setIsConnecting(true);
      
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke('elevenlabs-agent-token', {
        body: { agentId: 'agent_3201k6n4rrz8e2wrkf9tv372y0w4' }
      });

      if (error) throw error;
      if (!data?.signed_url) throw new Error('Failed to get signed URL');

      console.log('Starting session...');
      await Promise.race([
        conversation.startSession({
          signedUrl: data.signed_url
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
    await conversation.endSession();
  }, [conversation]);

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
        {/* Metallic background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-slate-900/50 to-background" />
        
        {/* Single Screen Layout for Authenticated Users */}
        <div className="relative h-screen flex flex-col items-center justify-center p-8">
          <div className="max-w-4xl w-full space-y-16 animate-fade-in">
            
            {/* Interactive Solon Orb with Metallic Container */}
            <div className="flex flex-col items-center gap-10">
              <div className="relative">
                {/* Metallic glow backdrop */}
                <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-500 rounded-full transform scale-150" />
                
                  <div
                    className="relative group cursor-default focus:outline-none transition-all duration-300 hover:scale-105"
                    style={{
                      filter: 'drop-shadow(0 0 40px rgba(59, 130, 246, 0.4))'
                    }}
                    aria-hidden="true"
                  >
                  {/* Metallic ring around orb */}
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-blue-400/20 via-blue-600/30 to-blue-400/20 blur-sm pointer-events-none" 
                       style={{
                         boxShadow: '0 0 80px rgba(59, 130, 246, 0.3), inset 0 0 40px rgba(255, 255, 255, 0.05)'
                       }} />
                  
                  {isConnecting ? (
                    <div className="w-48 h-48 flex items-center justify-center relative">
                      <Sparkles className="h-20 w-20 text-blue-400 animate-pulse" 
                                 style={{ filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.8))' }} />
                    </div>
                  ) : (
                    <AnimatedOrb 
                      isActive={isConnected}
                      isSpeaking={isSpeaking}
                      size={192}
                    />
                  )}
                </div>
              </div>

              {/* Status text with metallic effect */}
              <div className="text-center space-y-2 relative">
                <div className="inline-block px-6 py-2 rounded-full bg-gradient-to-r from-blue-950/50 via-blue-900/50 to-blue-950/50 border border-blue-500/20"
                     style={{
                       boxShadow: '0 4px 24px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                     }}>
                  <p className="text-base font-medium text-blue-200">
                    {isConnecting ? 'Connecting to Solon...' : isConnected ? (isSpeaking ? 'Solon is listening...' : 'Connected') : 'Click to begin your memory journey'}
                  </p>
                </div>
                {isConnected ? (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-blue-300/60">Connected</p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => endConversation()}
                      className="rounded-full"
                    >
                      End Conversation
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center pt-2">
                    <Button
                      size="sm"
                      onClick={() => startConversation()}
                      disabled={isConnecting}
                      className="rounded-full"
                    >
                      {isConnecting ? 'Connecting…' : 'Start Conversation'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Button with metallic style */}
            <div className="flex justify-center">
              <Button asChild size="lg" 
                      className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-blue-500 hover:via-blue-400 hover:to-blue-500 text-white rounded-full px-8 py-6 font-medium transition-all duration-300"
                      style={{
                        boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      }}>
                <Link to="/dashboard">
                  View Dashboard
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
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
