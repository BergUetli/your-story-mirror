import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, BookOpen, User, LogOut, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const [memoryCount, setMemoryCount] = useState(7);
  const { profile, loading } = useProfile();
  const { signOut } = useAuth();
  
  const userName = profile?.name || 'Friend';
  
  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-8 py-24">
        <div className="space-y-16 animate-fade-in">
          {/* Welcome */}
          <div className="text-center space-y-6">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
              Welcome back,
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {userName}
              </span>
            </h1>
            <p className="text-2xl text-muted-foreground">
              Your memories live here
            </p>
          </div>

          {/* Memory Counter */}
          <Card className="modern-card border-border/50 max-w-2xl mx-auto">
            <CardContent className="p-12 text-center space-y-4">
              <div className="text-7xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {memoryCount}
              </div>
              <div className="text-2xl text-foreground">
                {memoryCount === 1 ? 'memory preserved' : 'memories preserved'}
              </div>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Each one a precious thread in the tapestry of your story
              </p>
            </CardContent>
          </Card>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Talk to Solin */}
            <Link to="/">
              <Card className="modern-card border-border/50 h-full group cursor-pointer">
                <CardContent className="p-10 space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold flex items-center justify-between">
                      Talk to Solin
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </h3>
                    <p className="text-muted-foreground">
                      Start a conversation with your AI companion
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* My Timeline */}
            <Link to="/timeline">
              <Card className="modern-card border-border/50 h-full group cursor-pointer">
                <CardContent className="p-10 space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Clock className="w-8 h-8 text-accent" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold flex items-center justify-between">
                      My Timeline
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </h3>
                    <p className="text-muted-foreground">
                      Journey through your preserved memories
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Quote */}
          <Card className="modern-card border-border/50 max-w-3xl mx-auto">
            <CardContent className="p-12 text-center space-y-4">
              <blockquote className="text-2xl italic text-muted-foreground leading-relaxed">
                "Memory is the treasury and guardian of all things. The life of the dead is placed in the memory of the living."
              </blockquote>
              <cite className="text-muted-foreground block text-lg">— Marcus Tullius Cicero</cite>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
