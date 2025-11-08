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
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
            Replicate your presence.
            <br />
            <span className="bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
              Take the journey to make your story last forever.
            </span>
          </h1>
          
          <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
            Solin One is building the world&apos;s first resilient digital memory platform — preserving voices, stories, and guidance so loved ones can interact with them not just for years, but for generations.
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
              <h2 className="text-4xl font-bold">The Vision</h2>
            </div>
            
            <p className="text-xl text-muted-foreground leading-relaxed">
              Anchored in principles of Swiss permanence, our mission is to ensure memories remain alive, trusted, and accessible over the long arc of time. We&apos;re not just storing data—we&apos;re preserving presence, wisdom, and the irreplaceable essence of who you are.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Why It Matters */}
      <div className="max-w-5xl mx-auto px-8 py-12">
        <div className="text-center space-y-6 mb-16">
          <h2 className="text-5xl font-bold">Why It Matters</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            When someone passes, families lose not just their presence but their voice, perspective, and wisdom. Social media and cloud storage are fragile, built for short-term use—not family legacies.
          </p>
        </div>

        <Card className="modern-card border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-10">
            <blockquote className="text-2xl italic text-center leading-relaxed">
              &quot;Humanity has always dreamed of speaking across time. We&apos;re making it real, safe, and enduring.&quot;
            </blockquote>
          </CardContent>
        </Card>
      </div>

      {/* Cultural Lineage */}
      <div className="max-w-7xl mx-auto px-8 py-24">
        <div className="text-center space-y-6 mb-16">
          <h2 className="text-5xl font-bold">Cultural Lineage</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We stand on the shoulders of visionaries who imagined speaking across time
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <h3 className="text-2xl font-semibold">The Time Machine (2002)</h3>
              <p className="text-muted-foreground leading-relaxed">
                Vox 114, the AI guide that carries knowledge forward through the ages, preserving wisdom for future generations.
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <h3 className="text-2xl font-semibold">Superman (1978)</h3>
              <p className="text-muted-foreground leading-relaxed">
                Jor-El guiding his son through holographic memory, a father&apos;s presence transcending time and space.
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <h3 className="text-2xl font-semibold">Asimov&apos;s Foundation</h3>
              <p className="text-muted-foreground leading-relaxed">
                Hari Seldon&apos;s preserved messages shaping future generations through calculated guidance.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-xl text-primary font-semibold">
            Solin One is the real-world continuation of these visions—not fiction, but technology with purpose.
          </p>
        </div>
      </div>

      {/* Swiss Memory Vault - Privacy First */}
      <div className="max-w-7xl mx-auto px-8 py-24">
        <div className="text-center space-y-6 mb-16">
          <div className="inline-block px-6 py-3 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
            🇨🇭 Your Swiss Memory Vault
          </div>
          <h2 className="text-5xl font-bold">Uncompromising Privacy & Security</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your memories are stored on dedicated servers in Switzerland, protected by the world&apos;s strongest privacy laws
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="modern-card border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">Swiss Data Sovereignty</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                All your memories are stored on dedicated servers located in Switzerland, governed by Swiss privacy laws—among the strongest in the world. Your data never leaves Swiss jurisdiction.
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">End-to-End Encryption</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Military-grade encryption protects every memory, voice recording, and conversation. Your data is encrypted at rest and in transit—only you and those you authorize can access it.
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mountain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">Never Sold, Never Shared</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Your memories belong to you. We will never sell your data to third parties or share it without your express approval. Your legacy is yours alone.
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">Offline Redundancy</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Memories stored in encrypted cloud infrastructure plus secure offline vaults, ensuring resilience against technological shifts and corporate failures.
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">Century-Scale Preservation</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Built on principles of Swiss permanence and neutrality. Annual technology reviews ensure independence from shifting platforms, extending your legacy indefinitely.
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">Geopolitical Neutrality</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Switzerland&apos;s long tradition of neutrality and stability protects your legacy from geopolitical uncertainty, ensuring access across generations.
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
              <h2 className="text-4xl font-bold">Why Now</h2>
              <p className="text-xl text-muted-foreground">
                A perfect intersection of timeless values and breakthrough technology
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">The AI Revolution</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Advances in conversational AI and voice synthesis make memory preservation feel natural and personal for the first time in human history.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mountain className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Timeless Meets Innovation</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Swiss permanence meets real-time AI breakthroughs—enabling what humanity has always wanted: preserving and reliving memory with dignity, truth, and endurance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* What Makes Us Different */}
      <div className="max-w-7xl mx-auto px-8 py-24">
        <div className="text-center space-y-6 mb-16">
          <h2 className="text-5xl font-bold">What Makes Us Different</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We&apos;re not another cloud storage service—we&apos;re building for generations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <Shield className="w-10 h-10 text-primary" />
              <h3 className="text-xl font-semibold">No Hallucinations</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our AI companion answers only with recorded truths, values, and guidance. No made-up stories, just authentic presence.
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <Users className="w-10 h-10 text-primary" />
              <h3 className="text-xl font-semibold">Living Archive</h3>
              <p className="text-muted-foreground leading-relaxed">
                Multiple family members can contribute, creating a dynamic family history rather than a static time capsule.
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <Heart className="w-10 h-10 text-primary" />
              <h3 className="text-xl font-semibold">Built for Grief</h3>
              <p className="text-muted-foreground leading-relaxed">
                Companion conversations designed with sensitivity, allowing loved ones to engage with preserved wisdom whenever they need it.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Secondary CTA - Keep this but make it shorter since primary CTA is now at top */}
      <div className="max-w-5xl mx-auto px-8 py-16 text-center space-y-6">
        <h2 className="text-3xl md:text-4xl font-bold">
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
