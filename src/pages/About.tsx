import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Shield, Globe, Clock, Users, Sparkles, Mountain, Lock, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';

const About = () => {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Cosmic Background */}
      <div 
        className="relative overflow-hidden"
        style={{
          backgroundImage: 'url(/cosmic-background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        <div className="relative max-w-5xl mx-auto px-8 py-24 text-center space-y-8 animate-fade-in text-white">
          <div className="inline-block px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium backdrop-blur-sm border border-white/30">
            Our Mission
          </div>
          
          <h1 className="font-manrope text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
            <span className="text-white">
              Your wisdom, accessible across generations.
            </span>
          </h1>
          
          <p className="font-manrope text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
            Solin is an AI companion that preserves your memories, voice, and wisdom—creating a living archive that your loved ones can interact with for centuries to come.
          </p>
          
          {/* CTA moved to top - right after hero text */}
          <div className="pt-8">
          {!user ? (
              <div className="space-y-4">
                <p className="text-lg text-white/80">
                  Create your account to start preserving memories and having conversations with Solin.
                </p>
                <Button 
                  size="lg" 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 hover:border-white/50 backdrop-blur-sm px-12 py-6 rounded-full text-lg font-semibold transition-all hover:scale-105 shadow-lg"
                >
                  Create Your Sanctuary
                </Button>
              </div>
            ) : (
              <Button 
                asChild
                size="lg" 
                className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 hover:border-white/50 backdrop-blur-sm px-12 py-6 rounded-full text-lg font-semibold transition-all hover:scale-105 shadow-lg"
              >
                <Link to="/sanctuary">
                  Start Your Sanctuary
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* The Vision */}
      <div className="max-w-7xl mx-auto px-8 py-24">
        <Card className="modern-card border-border/50">
          <CardContent className="p-12 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-manrope text-4xl font-bold">The Vision</h2>
            </div>
            
            <p className="font-manrope text-xl text-muted-foreground leading-relaxed">
              We believe your voice deserves to outlive you. Built on Swiss principles of permanence and privacy, Solin preserves not just memories, but the essence of who you are—your values, your stories, your guidance—accessible to those you love, whenever they need you most.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Why It Matters */}
      <div className="max-w-5xl mx-auto px-8 py-12">
        <div className="text-center space-y-6 mb-16">
          <h2 className="font-manrope text-5xl font-bold">Why It Matters</h2>
          <p className="font-manrope text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            When someone passes, families don&apos;t just lose their presence—they lose their voice, their guidance, their stories. Today&apos;s platforms weren&apos;t built for legacy. They&apos;re temporary, fragile, designed for short-term engagement—not for preserving what truly matters across lifetimes.
          </p>
        </div>

        <Card className="modern-card border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-10">
            <blockquote className="font-manrope text-2xl italic text-center leading-relaxed">
              &quot;For the first time in history, technology allows us to preserve not just memories, but presence—enabling conversations across time with the people we love most.&quot;
            </blockquote>
          </CardContent>
        </Card>
      </div>


      {/* Swiss Memory Vault - Privacy First */}
      <div className="max-w-7xl mx-auto px-8 py-24">
        <div className="text-center space-y-6 mb-16">
          <div className="inline-block px-6 py-3 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
            🇨🇭 Your Swiss Memory Vault
          </div>
          <h2 className="font-manrope text-5xl font-bold">Built on Swiss Principles</h2>
          <p className="font-manrope text-xl text-muted-foreground max-w-3xl mx-auto">
            Your memories are stored on dedicated servers in Switzerland—protected by the world&apos;s strongest privacy laws, designed to last for generations
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="modern-card border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-manrope text-2xl font-semibold">Swiss Data Sovereignty</h3>
              </div>
              <p className="font-manrope text-muted-foreground leading-relaxed">
                Every memory lives on dedicated servers in Switzerland, governed by the world&apos;s strongest privacy laws. Your data never leaves Swiss jurisdiction—immune to foreign subpoenas or political interference.
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-manrope text-2xl font-semibold">Military-Grade Encryption</h3>
              </div>
              <p className="font-manrope text-muted-foreground leading-relaxed">
                Every memory, voice recording, and conversation is protected with military-grade encryption—both at rest and in transit. Only you and those you explicitly authorize can access your digital legacy.
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mountain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-manrope text-2xl font-semibold">Never Sold, Never Shared</h3>
              </div>
              <p className="font-manrope text-muted-foreground leading-relaxed">
                Your memories are yours alone. We will never sell your data, share it with advertisers, or hand it to third parties without your explicit consent. Your legacy belongs to you and those you choose.
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-manrope text-2xl font-semibold">Offline Redundancy</h3>
              </div>
              <p className="font-manrope text-muted-foreground leading-relaxed">
                Encrypted cloud infrastructure backed by secure offline vaults. If platforms fail, technologies shift, or companies disappear—your memories persist, protected across multiple layers of redundancy.
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-manrope text-2xl font-semibold">Built for Centuries</h3>
              </div>
              <p className="font-manrope text-muted-foreground leading-relaxed">
                Designed with Swiss principles of permanence and stability. Regular technology audits ensure your memories remain accessible and compatible as platforms evolve—extending your legacy across generations.
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-manrope text-2xl font-semibold">Geopolitical Neutrality</h3>
              </div>
              <p className="font-manrope text-muted-foreground leading-relaxed">
                Switzerland&apos;s centuries-old tradition of neutrality shields your legacy from political turbulence, trade wars, and shifting regulations—ensuring your memories remain accessible no matter what happens in the world.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Why Now */}
      <div className="max-w-5xl mx-auto px-8 py-24">
        <Card className="modern-card border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-12 space-y-8">
            <div className="text-center space-y-4">
              <h2 className="font-manrope text-4xl font-bold">Why Now</h2>
              <p className="font-manrope text-xl text-muted-foreground">
                A perfect intersection of timeless values and breakthrough technology
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-primary" />
                  <h3 className="font-manrope text-xl font-semibold">The AI Revolution</h3>
                </div>
                <p className="font-manrope text-muted-foreground leading-relaxed">
                  For the first time, conversational AI can capture not just words, but personality—making preserved memories feel alive, natural, and deeply personal.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mountain className="w-6 h-6 text-primary" />
                  <h3 className="font-manrope text-xl font-semibold">Swiss Permanence Meets AI</h3>
                </div>
                <p className="font-manrope text-muted-foreground leading-relaxed">
                  Centuries-old Swiss values of privacy, neutrality, and permanence combined with cutting-edge AI—finally enabling what humanity has always dreamed of: speaking across time with those we love.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* What Makes Us Different */}
      <div className="max-w-7xl mx-auto px-8 py-24">
        <div className="text-center space-y-6 mb-16">
          <h2 className="font-manrope text-5xl font-bold">What Makes Solin Different</h2>
          <p className="font-manrope text-xl text-muted-foreground max-w-3xl mx-auto">
            We&apos;re not a cloud storage service—we&apos;re building living archives that last for generations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <Shield className="w-10 h-10 text-primary" />
              <h3 className="font-manrope text-xl font-semibold">Grounded in Truth</h3>
              <p className="font-manrope text-muted-foreground leading-relaxed">
                Solin speaks only from your recorded memories—no fabricated stories, no hallucinated details. Every conversation is rooted in what you actually shared.
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <Users className="w-10 h-10 text-primary" />
              <h3 className="font-manrope text-xl font-semibold">Living Family Archive</h3>
              <p className="font-manrope text-muted-foreground leading-relaxed">
                Multiple family members can add memories, creating a shared, evolving history—not a static time capsule, but a living, breathing family legacy.
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <Heart className="w-10 h-10 text-primary" />
              <h3 className="font-manrope text-xl font-semibold">Designed with Sensitivity</h3>
              <p className="font-manrope text-muted-foreground leading-relaxed">
                Built for moments of grief, reflection, and celebration—Solin provides comfort when you need guidance, and connection when you miss someone&apos;s voice.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Secondary CTA - Keep this but make it shorter since primary CTA is now at top */}
      <div className="max-w-5xl mx-auto px-8 py-16 text-center space-y-6">
        <h2 className="font-manrope text-3xl md:text-4xl font-bold">
          Ready to preserve your legacy?
        </h2>
        
        {!user ? (
          <div className="space-y-4">
            <Button 
              size="lg" 
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-full"
            >
              Get Started Today
            </Button>
          </div>
        ) : (
          <Button 
            asChild
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-full"
          >
            <Link to="/sanctuary">
              Continue Your Journey
            </Link>
          </Button>
        )}
      </div>
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

export default About;
