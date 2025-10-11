import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useConversation } from '@11labs/react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sparkles, 
  Heart, 
  Clock, 
  Shield, 
  ArrowRight,
  Users,
  Lock,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Connected to ElevenLabs');
      toast({
        title: "Connected",
        description: "Start speaking naturally",
      });
    },
    onDisconnect: () => {
      console.log('👋 Disconnected');
    },
    onError: (error) => {
      console.error('❌ Error:', error);
      toast({
        title: "Connection failed",
        description: typeof error === 'string' ? error : "Please try again",
        variant: "destructive",
      });
    },
  });

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
        conversation.startSession({ signedUrl: data.signed_url }),
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
      <div className="h-screen bg-background overflow-hidden">
        {/* Single Screen Layout for Authenticated Users */}
        <div className="h-full flex flex-col items-center justify-center p-8">
          <div className="max-w-3xl w-full space-y-12 animate-fade-in">
            
            {/* Interactive Solon Orb */}
            <div className="flex flex-col items-center gap-8">
              <button
                onClick={isConnected ? endConversation : startConversation}
                disabled={isConnecting}
                className="relative group cursor-pointer focus:outline-none"
                aria-label={isConnected ? "End conversation" : "Start conversation"}
              >
                {/* Main orb */}
                <div className={`w-40 h-40 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center transition-all duration-500 ${
                  isSpeaking ? 'scale-110 shadow-[0_0_60px_rgba(168,85,247,0.6)]' : isConnected ? 'shadow-[0_0_40px_rgba(168,85,247,0.4)]' : 'group-hover:scale-105 shadow-[0_0_30px_rgba(168,85,247,0.3)]'
                }`}>
                  {isConnecting ? (
                    <Loader2 className="h-16 w-16 text-white animate-spin" />
                  ) : (
                    <Sparkles className="h-16 w-16 text-white" />
                  )}
                </div>
                
                {/* Animated glowing rings when active */}
                {isConnected && (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" />
                    <div className="absolute -inset-4 rounded-full border border-primary/30 animate-ping" style={{ animationDelay: '150ms' }} />
                    <div className="absolute -inset-8 rounded-full border border-primary/20 animate-ping" style={{ animationDelay: '300ms' }} />
                  </>
                )}
              </button>

              {/* Status text */}
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">
                  {isConnecting ? 'Connecting...' : isConnected ? (isSpeaking ? 'Listening...' : 'Connected') : 'Click to begin'}
                </p>
                {isConnected && (
                  <p className="text-xs text-muted-foreground/60">
                    Click orb to end
                  </p>
                )}
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="flex justify-center">
              <Button asChild size="lg" variant="ghost" className="text-muted-foreground hover:text-foreground rounded-full">
                <Link to="/dashboard">
                  View Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
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
