import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ElevenLabsVoiceAgent } from '@/components/ElevenLabsVoiceAgent';
import { 
  Sparkles, 
  Heart, 
  Clock, 
  Shield, 
  ArrowRight,
  Users,
  Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const { user } = useAuth();
  const [agentSpeaking, setAgentSpeaking] = useState(false);

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
            
            {/* Glowing Solon Orb */}
            <div className="flex justify-center">
              <div className="relative">
                {/* Main orb */}
                <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center transition-all duration-300 ${
                  agentSpeaking ? 'scale-110' : ''
                }`}>
                  <Sparkles className="h-12 w-12 text-white" />
                </div>
                
                {/* Glowing rings */}
                <div className={`absolute inset-0 rounded-full border-2 border-primary/50 ${
                  agentSpeaking ? 'animate-ping' : ''
                }`} />
                <div className={`absolute -inset-4 rounded-full border border-primary/30 ${
                  agentSpeaking ? 'animate-ping animation-delay-150' : ''
                }`} />
                <div className={`absolute -inset-8 rounded-full border border-primary/20 ${
                  agentSpeaking ? 'animate-ping animation-delay-300' : ''
                }`} />
              </div>
            </div>
            
            {/* Voice Agent Interface */}
            <Card className="modern-card border-border/50">
              <CardContent className="p-8">
                <ElevenLabsVoiceAgent 
                  agentId="agent_3201k6n4rrz8e2wrkf9tv372y0w4"
                  onSpeakingChange={setAgentSpeaking}
                />
              </CardContent>
            </Card>

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
