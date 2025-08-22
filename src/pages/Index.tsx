import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

const Index = () => {
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
      <div className="min-h-screen bg-white font-metropolitan">
        {/* Hero Section for Authenticated Users */}
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-8 max-w-2xl">
            <div className="space-y-4">
              <Badge className="bg-gray-100 text-gray-800 border-gray-200 px-4 py-2">
                <Sparkles className="h-4 w-4 mr-2" />
                Welcome Back to Your Sanctuary
              </Badge>
              
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
                Your Memories
                <br />
                Await You
              </h1>
              
              <p className="text-xl text-gray-600">
                Continue building your digital legacy and preserving the moments that matter most.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-gray-900 hover:bg-gray-800 text-white">
                <Link to="/dashboard">
                  <Heart className="h-5 w-5 mr-2" />
                  View My Memories
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="border-gray-300 hover:border-gray-400 hover:bg-gray-50">
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
    <div className="min-h-screen bg-white font-metropolitan">
      {/* Hero Section */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-8 max-w-4xl">
          <div className="space-y-4">
            <Badge className="bg-gray-100 text-gray-800 border-gray-200 px-4 py-2">
              <Sparkles className="h-4 w-4 mr-2" />
              Digital Memory Sanctuary
            </Badge>
            
            <h1 className="text-4xl md:text-7xl font-bold leading-tight text-gray-900">
              You,
              <br />
              Remembered
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto">
              Preserve your voice, stories, and values in a beautiful digital sanctuary. 
              Create a lasting legacy for those who matter most.
            </p>
          </div>
          
            <div className="flex justify-center">
            <Button 
              asChild
              size="lg" 
              className="bg-gray-900 hover:bg-gray-800 text-white text-lg px-8 py-6"
            >
              <Link to="/auth">
                <Heart className="h-5 w-5 mr-2" />
                Start Your Sanctuary
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900">
              Your Digital Legacy
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              More than just storage - a meaningful way to preserve and share the stories that define you.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900">
              Ready to Begin Your Journey?
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands who have already started preserving their most precious memories.
            </p>
          </div>
          
          <Button 
            asChild
            size="lg" 
            className="bg-gray-900 hover:bg-gray-800 text-white text-lg px-12 py-6"
          >
            <Link to="/auth">
              <Heart className="h-5 w-5 mr-2" />
              Create Your Sanctuary
            </Link>
          </Button>
          
          <p className="text-sm text-gray-500">
            Free to start. Your memories are always yours.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
