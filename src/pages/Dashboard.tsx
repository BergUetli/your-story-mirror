import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Heart, Plus, Clock, BookOpen, User, LogOut, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import deepBlueGalaxy from '@/assets/deep-blue-galaxy.jpg';

const Dashboard = () => {
  const [memoryCount, setMemoryCount] = useState(7);
  const [userName, setUserName] = useState('Sarah');
  
  // Simulate loading user data
  useEffect(() => {
    // This would typically fetch from your database
    // For now, we'll use localStorage or default values
    const storedName = localStorage.getItem('userName') || 'Friend';
    setUserName(storedName);
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Galaxy Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${deepBlueGalaxy})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/30 to-background/70" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header with navigation */}
        <header className="flex justify-between items-center p-6 max-w-6xl mx-auto">
          <div className="flex items-center space-x-3">
            <Heart className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-light text-foreground">Memory Scape</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <User className="w-4 h-4 mr-2" />
              {userName}
            </Button>
            <Button variant="ghost" size="sm">
              <LogOut className="w-4 h-4" />
            </Button>
            {/* Progressive User Photo */}
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-primary/30">
                <AvatarImage src="" alt="Your emerging portrait" />
                <AvatarFallback className="bg-card/20 backdrop-blur-sm">
                  <div className="w-full h-full relative overflow-hidden">
                    {/* Threads that form the portrait based on memories */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-memory/10">
                      {Array.from({ length: Math.min(memoryCount, 20) }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-px bg-primary/40"
                          style={{
                            left: `${(i * 17) % 100}%`,
                            top: `${(i * 23) % 100}%`,
                            height: `${20 + (i * 7) % 30}%`,
                            transform: `rotate(${i * 27}deg)`,
                            opacity: Math.min(1, memoryCount / 10)
                          }}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                      {memoryCount < 5 ? 'Building...' : memoryCount < 15 ? 'Forming...' : 'You'}
                    </div>
                  </div>
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm rounded-full px-2 py-1">
                {Math.round((memoryCount / 50) * 100)}%
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-6 pb-8">
          {/* Hero Section */}
          <div className="text-center space-y-6 py-16">
            <div className="gentle-float">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/20 to-memory/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-primary/30">
                <Heart className="w-10 h-10 text-primary" />
              </div>
            </div>
            <h2 className="text-5xl md:text-6xl leading-tight" style={{ fontFamily: 'Work Sans, sans-serif', fontWeight: 300 }}>
              Welcome back,<br />
              <span className="text-primary">{userName}</span>
            </h2>
            <div 
              className="text-3xl md:text-4xl font-bold text-primary leading-relaxed mt-8"
              style={{ fontFamily: 'Work Sans, sans-serif' }}
            >
              Your Memories Live Here
            </div>
            
            {/* AI Journaler Feature Highlight */}
            <Card className="memory-card bg-card/90 backdrop-blur-md border-primary/40 shadow-cosmic mt-8 max-w-2xl mx-auto">
              <CardContent className="p-8 text-center">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <Sparkles className="w-8 h-8 text-memory animate-pulse" />
                  <h3 className="text-2xl font-semibold text-foreground" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                    AI Journaler
                  </h3>
                  <Sparkles className="w-8 h-8 text-memory animate-pulse" />
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Our AI companion will help pen your life stories, turning your memories into beautifully crafted narratives that capture the essence of your journey.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Memory Counter */}
          <Card className="memory-card bg-card/80 backdrop-blur-md border-primary/30 shadow-cosmic">
            <CardContent className="p-10 text-center">
              <div className="space-y-4">
                <div className="text-6xl font-light bg-gradient-to-r from-primary to-memory bg-clip-text text-transparent drop-shadow-lg">
                  {memoryCount}
                </div>
                <div className="text-2xl text-foreground font-light drop-shadow-sm">
                  {memoryCount === 1 ? 'memory preserved' : 'memories preserved'}
                </div>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Each one a precious thread in the cosmic tapestry of your story
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            
            {/* Add New Memory */}
            <Card className="memory-card group cursor-pointer bg-card/80 backdrop-blur-md border-primary/30 hover:bg-primary/10 transition-all duration-300 shadow-cosmic hover:shadow-starlight">
              <Link to="/add-memory">
                <CardContent className="p-8 text-center space-y-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-memory/30 to-primary/20 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 border border-memory/40 shadow-starlight">
                    <Plus className="w-10 h-10 text-memory drop-shadow-sm" />
                  </div>
                  <h3 className="text-2xl font-light text-foreground drop-shadow-sm">Add New Memory</h3>
                  <p className="text-muted-foreground">
                    Capture a moment, story, or reflection
                  </p>
                </CardContent>
              </Link>
            </Card>

            {/* View Reflections */}
            <Card className="memory-card group cursor-pointer bg-card/80 backdrop-blur-md border-primary/30 hover:bg-accent/10 transition-all duration-300 shadow-cosmic hover:shadow-starlight">
              <Link to="/reflections">
                <CardContent className="p-8 text-center space-y-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-accent/30 to-love/20 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 border border-accent/40 shadow-starlight">
                    <BookOpen className="w-10 h-10 text-accent drop-shadow-sm" />
                  </div>
                  <h3 className="text-2xl font-light text-foreground drop-shadow-sm">View Reflections</h3>
                  <p className="text-muted-foreground">
                    See insights and echoes from your memories
                  </p>
                </CardContent>
              </Link>
            </Card>

            {/* My Timeline */}
            <Card className="memory-card group cursor-pointer bg-card/80 backdrop-blur-md border-primary/30 hover:bg-love/10 transition-all duration-300 shadow-cosmic hover:shadow-starlight">
              <Link to="/timeline">
                <CardContent className="p-8 text-center space-y-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-love/30 to-accent/20 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 border border-love/40 shadow-starlight">
                    <Clock className="w-10 h-10 text-love drop-shadow-sm" />
                  </div>
                  <h3 className="text-2xl font-light text-foreground drop-shadow-sm">My Timeline</h3>
                  <p className="text-muted-foreground">
                    Journey through your preserved memories
                  </p>
                </CardContent>
              </Link>
            </Card>

          </div>

          {/* Quote or Inspiration */}
          <Card className="memory-card bg-card/70 backdrop-blur-md border-primary/20 mt-16 shadow-cosmic">
            <CardContent className="p-10 text-center">
              <blockquote className="text-2xl italic text-muted-foreground font-light leading-relaxed drop-shadow-sm">
                "Memory is the treasury and guardian of all things. The life of the dead is placed in the memory of the living."
              </blockquote>
              <cite className="text-muted-foreground/80 block mt-4 text-lg">— Marcus Tullius Cicero</cite>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;