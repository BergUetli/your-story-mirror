import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MessageCircle, Clock, Shield, Users, Calendar, ArrowRight, Sparkles, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-8 py-24 text-center space-y-8 animate-fade-in">
        <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          Simple, Powerful, Timeless
        </div>
        
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
          How It Works
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Preserving your legacy is as simple as having a conversation. Here&apos;s how we turn your voice into a timeless digital companion.
        </p>
      </div>

      {/* The Process - Step by Step */}
      <div className="max-w-5xl mx-auto px-8 py-16 space-y-32">
        
        {/* Step 1 */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Step 1
            </div>
            <h2 className="text-5xl font-bold">Talk to Solin</h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Start a natural conversation with Solin, your AI companion. Share stories, memories, life lessons, and wisdom. No forms, no typing—just speak naturally as if talking to a trusted friend.
            </p>
            <div className="pt-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card/50">
                <Mic className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Voice-First Experience</h4>
                  <p className="text-sm text-muted-foreground">
                    Solin listens and responds in real-time, guiding you through meaningful conversations that capture your authentic voice and personality.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <Card className="modern-card border-border/50">
            <CardContent className="p-12 flex items-center justify-center">
              <div className="relative">
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse">
                  <Sparkles className="w-24 h-24 text-white" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" />
                <div className="absolute -inset-8 rounded-full border border-primary/30 animate-ping animation-delay-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step 2 */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <Card className="modern-card border-border/50 md:order-1">
            <CardContent className="p-12">
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">Voice Cloning & Story Capture</h3>
                <p className="text-muted-foreground leading-relaxed">
                  As you speak, we capture your unique voice patterns, speech rhythms, and personality. Your stories are organized automatically into a beautiful timeline.
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <span>Simple onboarding, capture once</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <span>Preserved for life and beyond</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <span>Add memories anytime</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-6 md:order-2">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Step 2
            </div>
            <h2 className="text-5xl font-bold">We Preserve Your Voice</h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Advanced AI captures not just what you say, but how you say it. Your tone, your humor, your wisdom—all preserved in your authentic voice.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Step 3
            </div>
            <h2 className="text-5xl font-bold">Your Timeline Grows</h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Watch as your memories are automatically organized into a beautiful, scrollable timeline spanning decades. Each conversation adds richness to your digital legacy.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-xl bg-card/50 space-y-2">
                <Clock className="w-6 h-6 text-primary" />
                <h4 className="font-semibold text-sm">Chronological</h4>
                <p className="text-xs text-muted-foreground">Stories organized across your life</p>
              </div>
              <div className="p-4 rounded-xl bg-card/50 space-y-2">
                <Users className="w-6 h-6 text-primary" />
                <h4 className="font-semibold text-sm">Collaborative</h4>
                <p className="text-xs text-muted-foreground">Family members can add too</p>
              </div>
            </div>
          </div>
          <Card className="modern-card border-border/50">
            <CardContent className="p-12">
              <div className="relative space-y-4">
                <div className="absolute left-6 top-0 w-0.5 bg-primary/30 h-full" />
                {[2024, 2010, 1995, 1980].map((year, i) => (
                  <div key={year} className="relative flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold flex-shrink-0">
                      {year}
                    </div>
                    <div className="flex-1 p-4 rounded-lg bg-card/50">
                      <div className="h-2 bg-primary/20 rounded w-full" style={{ opacity: 1 - i * 0.2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step 4 */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <Card className="modern-card border-border/50 md:order-1">
            <CardContent className="p-12 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Time-Released Messages</h3>
                </div>
                <p className="text-muted-foreground">
                  Schedule messages for birthdays, weddings, graduations—moments when your words will matter most.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Companion Conversations</h3>
                </div>
                <p className="text-muted-foreground">
                  Loved ones can ask questions and receive responses in your voice, drawn from your recorded stories and wisdom.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Privacy Control</h3>
                </div>
                <p className="text-muted-foreground">
                  Choose who can access different memories—family, friends, or keep them private.
                </p>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-6 md:order-2">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Step 4
            </div>
            <h2 className="text-5xl font-bold">Your Voice Lives On</h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Your loved ones can interact with your preserved wisdom whenever they need guidance, comfort, or simply want to hear your voice again.
            </p>
          </div>
        </div>

      </div>

      {/* Key Features */}
      <div className="max-w-7xl mx-auto px-8 py-24 bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl my-24">
        <div className="text-center space-y-6 mb-16">
          <h2 className="text-5xl font-bold">Everything You Need</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            A complete memory preservation platform built for generations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                <Mic className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Voice First</h3>
              <p className="text-muted-foreground">
                Natural conversation interface makes capturing memories effortless
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Century-Scale Storage</h3>
              <p className="text-muted-foreground">
                Built on Swiss principles of permanence and neutrality
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Authentic Presence</h3>
              <p className="text-muted-foreground">
                No hallucinations—only your real stories, values, and wisdom
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Visual Timeline</h3>
              <p className="text-muted-foreground">
                Beautiful organization of memories spanning decades
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Scheduled Messages</h3>
              <p className="text-muted-foreground">
                Deliver wisdom at life&apos;s most important moments
              </p>
            </CardContent>
          </Card>

          <Card className="modern-card border-border/50">
            <CardContent className="p-8 space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Family Collaboration</h3>
              <p className="text-muted-foreground">
                Multiple contributors create a living family archive
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-5xl mx-auto px-8 py-32 text-center space-y-8">
        <h2 className="text-5xl md:text-7xl font-bold">
          Start preserving
          <br />
          your story today
        </h2>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Join families already creating their digital legacies. Begin your journey in minutes.
        </p>
        
        <Button 
          asChild
          size="lg" 
          className="bg-primary hover:bg-primary/90 text-white px-12 py-6 rounded-full text-lg"
        >
          <Link to="/">
            Get Started for Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>

        <p className="text-sm text-muted-foreground">
          No credit card required. Start preserving memories today.
        </p>
      </div>
    </div>
  );
};

export default HowItWorks;
