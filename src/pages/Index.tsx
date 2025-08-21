import { Heart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-sanctuary flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        
        <div className="space-y-6">
          <Heart className="w-16 h-16 mx-auto text-memory gentle-float" />
          
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-light text-foreground leading-tight">
              You, <span className="text-memory">Remembered</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">
              A digital sanctuary for preserving your voice, stories, and love — 
              creating lasting connections without simulation.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Link to="/dashboard">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg">
              Enter Your Sanctuary
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          
          <p className="text-sm text-muted-foreground">
            Privacy-first • No simulation • Just truth and love
          </p>
        </div>

      </div>
    </div>
  );
};

export default Index;
