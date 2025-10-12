import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Shield, Globe, Clock, Users, Sparkles, Mountain, Lock, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-8 py-24 text-center space-y-8 animate-fade-in">
        <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          Our Mission
        </div>
        
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
          Life is short.
          <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Make your story
            <br />
            last forever.
          </span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Solon One is building the world&apos;s first resilient digital memory platform — preserving voices, stories, and guidance so loved ones can interact with them not just for years, but for generations.
        </p>
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
            Solon One is the real-world continuation of these visions—not fiction, but technology with purpose.
          </p>
        </div>
      </div>

      {/* Century-Scale Preservation */}
      <div className="max-w-7xl mx-auto px-8 py-24">
        <div className="text-center space-y-6 mb-16">
          <h2 className="text-5xl font-bold">Century-Scale Preservation</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Designed for families, generations, and beyond
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mountain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">Swiss Permanence</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Built on principles of Swiss stability and neutrality, ensuring your memories are safeguarded with the same care as the world&apos;s most trusted archives.
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
                <h3 className="text-2xl font-semibold">Future-Resilient Technology</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Annual technology reviews ensure independence from shifting platforms. Preparing for quantum durability and advances in storage to extend permanence indefinitely.
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
                Built in jurisdictions known for stability and neutrality, protecting your legacy from geopolitical uncertainty and ensuring access across generations.
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

      {/* CTA */}
      <div className="max-w-5xl mx-auto px-8 py-32 text-center space-y-8">
        <h2 className="text-5xl md:text-6xl font-bold">
          Ready to preserve
          <br />
          your legacy?
        </h2>
        
        <Button 
          asChild
          size="lg" 
          className="bg-primary hover:bg-primary/90 text-white px-12 py-6 rounded-full text-lg"
        >
          <Link to="/">
            Start Your Sanctuary
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default About;
