import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Plus, Clock, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    <div className="min-h-screen bg-gradient-to-br from-background to-sanctuary p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Welcome Header */}
        <div className="text-center space-y-4 pt-8">
          <div className="gentle-float">
            <Heart className="w-12 h-12 mx-auto text-love mb-4" />
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-foreground">
            Welcome back, {userName}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your digital sanctuary for preserving the memories, stories, and love that matter most.
          </p>
        </div>

        {/* Memory Counter */}
        <Card className="memory-card bg-gradient-to-r from-memory/20 to-love/20 border-memory/30">
          <CardContent className="p-8 text-center">
            <div className="space-y-3">
              <div className="text-5xl font-light text-memory">{memoryCount}</div>
              <div className="text-xl text-foreground">
                {memoryCount === 1 ? 'memory preserved' : 'memories preserved'}
              </div>
              <p className="text-muted-foreground">
                Each one a precious thread in the tapestry of your story
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Add New Memory */}
          <Card className="memory-card group cursor-pointer hover:bg-memory/10">
            <Link to="/add-memory">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-memory/20 rounded-full flex items-center justify-center mx-auto group-hover:bg-memory/30 transition-colors">
                  <Plus className="w-8 h-8 text-memory" />
                </div>
                <h3 className="text-xl font-medium text-foreground">Add New Memory</h3>
                <p className="text-muted-foreground text-sm">
                  Capture a moment, story, or reflection
                </p>
              </CardContent>
            </Link>
          </Card>

          {/* View Reflections */}
          <Card className="memory-card group cursor-pointer hover:bg-accent/10">
            <Link to="/reflections">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto group-hover:bg-accent/30 transition-colors">
                  <BookOpen className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-medium text-foreground">View Reflections</h3>
                <p className="text-muted-foreground text-sm">
                  See insights and echoes from your memories
                </p>
              </CardContent>
            </Link>
          </Card>

          {/* My Timeline */}
          <Card className="memory-card group cursor-pointer hover:bg-love/10">
            <Link to="/timeline">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-love/20 rounded-full flex items-center justify-center mx-auto group-hover:bg-love/30 transition-colors">
                  <Clock className="w-8 h-8 text-love" />
                </div>
                <h3 className="text-xl font-medium text-foreground">My Timeline</h3>
                <p className="text-muted-foreground text-sm">
                  Journey through your preserved memories
                </p>
              </CardContent>
            </Link>
          </Card>

        </div>

        {/* Quote or Inspiration */}
        <Card className="memory-card bg-gradient-to-r from-sanctuary to-background border-muted/20">
          <CardContent className="p-6 text-center">
            <blockquote className="text-lg italic text-muted-foreground">
              "The life of the dead is set in the memory of the living."
            </blockquote>
            <cite className="text-sm text-muted-foreground/70 block mt-2">— Marcus Tullius Cicero</cite>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Dashboard;