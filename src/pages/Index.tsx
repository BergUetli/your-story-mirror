import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Sparkles, 
  Heart, 
  Clock, 
  Shield, 
  MessageCircle,
  ArrowRight,
  Users,
  Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '@/assets/memory-hero-backdrop.jpg';

const Index = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();

  const features = [
    {
      icon: Heart,
      title: 'Preserve Your Voice',
      description: 'Record memories in your own words, capturing the essence of who you are.',
      color: 'text-love'
    },
    {
      icon: MessageCircle,
      title: 'Chat with Solon',
      description: 'Your AI companion helps reflect on memories and guides meaningful conversations.',
      color: 'text-accent'
    },
    {
      icon: Clock,
      title: 'Timeline of Life',
      description: 'Organize memories chronologically to see the beautiful story of your journey.',
      color: 'text-memory'
    },
    {
      icon: Users,
      title: 'Share Selectively',
      description: 'Choose who can access different memories - family, friends, or keep them private.',
      color: 'text-primary'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your memories are encrypted and stored securely in your personal sanctuary.',
      color: 'text-secondary'
    },
    {
      icon: Lock,
      title: 'Your Legacy',
      description: 'Create a lasting digital legacy that preserves your stories for future generations.',
      color: 'text-foreground'
    }
  ];

  if (user) {
    return (
      <div className="min-h-screen">
        {/* Hero Section for Authenticated Users */}
        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-sanctuary/60 to-background/80" />
          
          <div className="relative text-center space-y-8 max-w-2xl">
            <div className="space-y-4">
              <Badge className="bg-memory/20 text-memory border-memory/30 px-4 py-2">
                <Sparkles className="h-4 w-4 mr-2" />
                Welcome Back to Your Sanctuary
              </Badge>
              
              <h1 className="text-4xl md:text-6xl font-bold">
                <span className="bg-gradient-to-r from-memory via-accent to-love bg-clip-text text-transparent">
                  Your Memories
                </span>
                <br />
                <span className="text-foreground">Await You</span>
              </h1>
              
              <p className="text-xl text-muted-foreground">
                Continue building your digital legacy and preserving the moments that matter most.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-accent to-primary hover:opacity-90">
                <Link to="/dashboard">
                  <Heart className="h-5 w-5 mr-2" />
                  View My Memories
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="border-memory/30 hover:border-memory hover:bg-memory/10">
                <Link to="/add-memory">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Add New Memory
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-sanctuary/60 to-background/80" />
        
        <div className="relative text-center space-y-8 max-w-4xl">
          <div className="space-y-4">
            <Badge className="bg-memory/20 text-memory border-memory/30 px-4 py-2">
              <Sparkles className="h-4 w-4 mr-2" />
              Digital Memory Sanctuary
            </Badge>
            
            <h1 className="text-4xl md:text-7xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-memory via-accent to-love bg-clip-text text-transparent">
                You,
              </span>
              <br />
              <span className="text-foreground">Remembered</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Preserve your voice, stories, and values in a beautiful digital sanctuary. 
              Create a lasting legacy for those who matter most.
            </p>
          </div>
          
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => setShowAuthModal(true)}
                size="lg" 
                className="bg-gradient-to-r from-accent to-primary hover:opacity-90 text-lg px-8 py-6"
              >
                <Heart className="h-5 w-5 mr-2" />
                Start Your Sanctuary
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              
              <Button 
                asChild
                variant="outline" 
                size="lg"
                className="border-memory/30 hover:border-memory hover:bg-memory/10 text-lg px-8 py-6"
              >
                <Link to="/dashboard">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Try Demo Mode
                </Link>
              </Button>
            </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold">
              Your <span className="bg-gradient-to-r from-memory to-accent bg-clip-text text-transparent">Digital Legacy</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              More than just storage - a meaningful way to preserve and share the stories that define you.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="memory-card bg-card/50 backdrop-blur-sm border-memory/20 hover:border-memory/40">
                <CardContent className="p-6 space-y-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center ${feature.color}`}>
                    <feature.icon className="h-6 w-6" />
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
      </div>

      {/* CTA Section */}
      <div className="py-24 px-4 bg-gradient-to-br from-sanctuary to-background">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold">
              Ready to Begin Your 
              <span className="bg-gradient-to-r from-memory to-love bg-clip-text text-transparent ml-3">
                Journey?
              </span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands who have already started preserving their most precious memories.
            </p>
          </div>
          
          <Button 
            onClick={() => setShowAuthModal(true)}
            size="lg" 
            className="bg-gradient-to-r from-memory to-love hover:opacity-90 text-lg px-12 py-6"
          >
            <Heart className="h-5 w-5 mr-2" />
            Create Your Sanctuary
          </Button>
          
          <p className="text-sm text-muted-foreground">
            Free to start. Your memories are always yours.
          </p>
        </div>
      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};

export default Index;
