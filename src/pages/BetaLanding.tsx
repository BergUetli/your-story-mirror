import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Shield, Clock } from 'lucide-react';

const BetaLanding = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Store beta signup in a waitlist table (you'll need to create this)
      // For now, we'll just show success
      toast.success('Thank you! We\'ll be in touch soon.');
      setEmail('');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5" />
      
      <div className="relative z-10 w-full max-w-2xl mx-auto text-center space-y-8">
        {/* Logo/Brand */}
        <div className="space-y-2">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-memory via-accent to-primary bg-clip-text text-transparent">
            1000years.ai
          </h1>
          <p className="text-xl text-muted-foreground">
            Your memories. For a thousand years.
          </p>
        </div>

        {/* Main message */}
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            We're building something special
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            A sanctuary for your life's most precious moments. 
            Preserved with Swiss precision. Protected by uncompromising privacy.
          </p>
        </div>

        {/* Feature hints */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-8">
          <Card className="border-accent/20 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6 space-y-2">
              <Shield className="w-8 h-8 mx-auto text-accent" />
              <h3 className="font-semibold">Swiss Privacy</h3>
              <p className="text-sm text-muted-foreground">Your data, your rules</p>
            </CardContent>
          </Card>
          <Card className="border-memory/20 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-memory" />
              <h3 className="font-semibold">AI Companion</h3>
              <p className="text-sm text-muted-foreground">Helps you remember</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-primary" />
              <h3 className="font-semibold">Built to Last</h3>
              <p className="text-sm text-muted-foreground">Memories for generations</p>
            </CardContent>
          </Card>
        </div>

        {/* Signup form */}
        <Card className="max-w-md mx-auto border-accent/30 bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Join the beta</h3>
                <p className="text-sm text-muted-foreground">
                  Be among the first to experience the future of memory preservation
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  disabled={isSubmitting}
                />
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-accent to-primary hover:opacity-90"
                >
                  {isSubmitting ? 'Joining...' : 'Join Waitlist'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Already have access */}
        <div className="pt-4">
          <button
            onClick={() => navigate('/auth')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Already have access? Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetaLanding;
