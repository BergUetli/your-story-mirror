import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Heart, Send, Upload } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useMemorySound } from '@/hooks/useMemorySound';
import galaxyBackdrop from '@/assets/galaxy-backdrop.jpg';

const AddMemory = () => {
  const [memory, setMemory] = useState('');
  const [recipient, setRecipient] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { playSuccessSound } = useMemorySound();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memory.trim()) {
      toast({
        title: "Please share your memory",
        description: "Your story is important to us",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate processing - in real app, this would save to database
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      
      // Create a summary for the timeline (3-4 words)
      const words = memory.trim().split(' ').slice(0, 4);
      const summary = words.join(' ') + (memory.trim().split(' ').length > 4 ? '...' : '');
      
      // Play the whoosh sound
      playSuccessSound();
      
      toast({
        title: "Memory preserved ✨",
        description: "Your story has been safely captured in your digital sanctuary"
      });
      
      // Navigate to timeline with animation parameters
      setTimeout(() => {
        navigate(`/timeline?newMemory=temp-${Date.now()}&animate=true&summary=${encodeURIComponent(summary)}`);
      }, 500);
      
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again in a moment",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat relative p-4 md:p-6"
      style={{ backgroundImage: `url(${galaxyBackdrop})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/70" />
      <div className="relative z-10 max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 pt-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to sanctuary
            </Button>
          </Link>
        </div>

        <div className="text-center space-y-4">
          <Heart className="w-10 h-10 mx-auto text-memory gentle-float" />
          <h1 className="text-3xl md:text-4xl font-light text-foreground">
            Share Your Memory
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Tell us about a moment, story, or reflection you'd like to preserve. 
            We'll help you find its deeper meaning and beauty.
          </p>
        </div>

        {/* Memory Form */}
        <Card className="memory-card backdrop-blur-md bg-card/80 border-primary/30 shadow-cosmic">
          <CardHeader>
            <CardTitle className="text-xl font-medium text-center text-foreground drop-shadow-sm">
              Your Story Matters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Memory Input */}
              <div className="space-y-2">
                <Label htmlFor="memory" className="text-foreground font-medium">
                  Tell us your memory
                </Label>
                <Textarea
                  id="memory"
                  placeholder="Share what's on your heart... perhaps a conversation, a moment of joy, a lesson learned, or simply a day you want to remember forever."
                  value={memory}
                  onChange={(e) => setMemory(e.target.value)}
                  className="min-h-32 resize-none bg-sanctuary border-muted focus:border-memory transition-colors"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Take your time. There's no rush in this sanctuary.
                </p>
              </div>

              {/* Optional Recipient */}
              <div className="space-y-2">
                <Label htmlFor="recipient" className="text-foreground font-medium">
                  Is this for someone special? (optional)
                </Label>
                <Input
                  id="recipient"
                  placeholder="Mom, Dad, Sarah, my children..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="bg-sanctuary border-muted focus:border-love transition-colors"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  We can help craft a message for them based on your memory
                </p>
              </div>

              {/* File Upload Placeholder */}
              <div className="space-y-2">
                <Label className="text-foreground font-medium">
                  Voice or video (coming soon)
                </Label>
                <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center bg-sanctuary/50">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">
                    Audio and video uploads will be available soon
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                    Preserving your memory...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Preserve this memory
                  </div>
                )}
              </Button>

            </form>
          </CardContent>
        </Card>

        {/* Privacy Note */}
        <Card className="bg-love/20 border-love/30 backdrop-blur-md shadow-cosmic">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-love-foreground drop-shadow-sm">
              <Heart className="w-4 h-4 inline mr-1" />
              Your memories are private and never used for training. 
              They remain yours, always.
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default AddMemory;