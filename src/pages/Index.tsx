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
      <div className="min-h-screen bg-background">
        {/* Hero Section for Authenticated Users */}
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
          <div className="max-w-4xl w-full space-y-16 animate-fade-in">
            <div className="text-center space-y-6">
              <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
                Your Memories
                <br />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Await You
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Continue building your digital legacy and preserving the moments that matter most.
              </p>
            </div>
            
            <div className="flex justify-center">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white text-lg px-8 py-6 rounded-full">
                <Link to="/dashboard">
                  <Heart className="h-5 w-5 mr-2" />
                  View My Memories
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
            </div>
            
            {/* ElevenLabs Voice Agent - Main Memory Creation Interface */}
            <div className="max-w-2xl mx-auto">
              <Card className="modern-card border-border/50">
                <CardContent className="p-8">
                  <div className="text-center space-y-4 mb-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold">Talk with Solon</h2>
                    <p className="text-muted-foreground text-lg">
                      Start a conversation with your AI memory companion. Solon will help you preserve your stories through natural conversation.
                    </p>
                  </div>
                  
                  <ElevenLabsVoiceAgent 
                    agentId="agent_3201k6n4rrz8e2wrkf9tv372y0w4"
                    onSpeakingChange={setAgentSpeaking}
                  />
                  
                  {agentSpeaking && (
                    <div className="mt-6 text-center">
                      <p className="text-sm text-primary animate-pulse flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        Solon is speaking...
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
          <div className="text-2xl font-bold">You, Remembered</div>
          <div className="flex gap-4">
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

      {/* Hero Section */}
      <div className="min-h-screen flex items-center justify-center px-8 pt-24">
        <div className="max-w-5xl w-full text-center space-y-12 animate-fade-in">
          <div className="space-y-8">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Digital Memory Sanctuary
            </div>
            
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight leading-none">
              Build better
              <br />
              memories, faster
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Preserve your voice, stories, and values in a beautiful digital sanctuary. 
              Create a lasting legacy for those who matter most.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-white text-lg px-8 py-6 rounded-full"
            >
              <Link to="/auth">
                Start for free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button 
              asChild
              variant="outline" 
              size="lg" 
              className="border-border hover:bg-card text-lg px-8 py-6 rounded-full"
            >
              <Link to="/auth">
                <Heart className="h-5 w-5 mr-2" />
                Start Your Sanctuary
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-8 py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="modern-card border-border/50">
              <CardContent className="p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-5xl mx-auto px-8 py-32 text-center space-y-12">
        <div className="space-y-6">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight">
            Ready to Begin?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands preserving their most precious memories.
          </p>
        </div>
        
        <Button 
          asChild
          size="lg" 
          className="bg-primary hover:bg-primary/90 text-white text-lg px-12 py-6 rounded-full"
        >
          <Link to="/auth">
            Create Your Sanctuary
            <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
        </Button>
        
        <p className="text-sm text-muted-foreground">
          Free to start. Your memories are always yours.
        </p>
      </div>
    </div>
  );
};

export default Index;
