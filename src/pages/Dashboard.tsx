import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Plus, Clock, BookOpen, User, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import galaxyBackdrop from '@/assets/galaxy-backdrop.jpg';

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
        style={{ backgroundImage: `url(${galaxyBackdrop})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/30 to-background/70" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header with navigation */}
        <header className="flex justify-between items-center p-6 max-w-6xl mx-auto">
          <div className="flex items-center space-x-3">
            <Heart className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-light text-foreground">You, Remembered</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <User className="w-4 h-4 mr-2" />
              {userName}
            </Button>
            <Button variant="ghost" size="sm">
              <LogOut className="w-4 h-4" />
            </Button>
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
            <h2 className="text-5xl md:text-6xl font-light text-foreground leading-tight">
              Welcome back,<br />
              <span className="text-primary">{userName}</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Your digital sanctuary for preserving the memories, stories, and love that matter most.
            </p>
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
                "The cosmos is within us. We are made of star-stuff."
              </blockquote>
              <cite className="text-muted-foreground/80 block mt-4 text-lg">— Carl Sagan</cite>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;