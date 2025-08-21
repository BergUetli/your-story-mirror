import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { solonService, type SolonResponse, type Memory } from '@/services/solonService';
import { useMemories } from '@/hooks/useMemories';
import { useToast } from '@/hooks/use-toast';

interface SolonProps {
  mode?: 'user' | 'visitor';
  visitorPermissions?: string[];
}

const Solon: React.FC<SolonProps> = ({ 
  mode = 'user', 
  visitorPermissions = ['public'] 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<SolonResponse | null>(null);
  const { memories, getMemoriesForVisitor } = useMemories();
  const { toast } = useToast();

  const getRelevantMemories = () => {
    return mode === 'visitor' 
      ? getMemoriesForVisitor(visitorPermissions)
      : memories;
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !response) return;
    
    setIsLoading(true);
    try {
      const relevantMemories = getRelevantMemories();
      const solonResponse = await solonService.chat({
        mode,
        message: message.trim() || undefined,
        memories: relevantMemories,
        visitorPermissions,
      });
      
      setResponse(solonResponse);
      setMessage('');
      
      toast({
        title: "Solon reflects...",
        description: "I've shared some thoughts based on your memories.",
      });
    } catch (error) {
      toast({
        title: "Connection Issue",
        description: "I couldn't connect right now. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setResponse(null);
    setMessage('');
  };

  const getGreeting = () => {
    if (mode === 'visitor') {
      return "I'm Solon, the memory keeper for this sanctuary. I can share the stories that have been entrusted to me.";
    }
    return "Hello, I'm Solon, your memory companion. I'm here to help you reflect on your experiences and preserve what matters most.";
  };

  return (
    <>
      {/* Floating Solon Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-20 right-4 md:bottom-4 md:right-4 w-14 h-14 rounded-full z-50",
          "bg-gradient-to-br from-accent to-primary border-2 border-memory/30",
          "shadow-lg hover:shadow-xl transition-all duration-300",
          "gentle-float",
          isOpen ? "scale-0" : "scale-100"
        )}
        size="icon"
      >
        <Sparkles className="h-6 w-6 text-white" />
      </Button>

      {/* Solon Chat Interface */}
      {isOpen && (
        <Card className={cn(
          "fixed bottom-20 right-4 md:bottom-20 md:right-4 w-80 md:w-96 max-h-[500px] z-50",
          "bg-card/95 backdrop-blur-sm border-memory/20",
          "shadow-2xl animate-scale-in"
        )}>
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Solon</h3>
                <p className="text-xs text-muted-foreground">
                  {mode === 'visitor' ? 'Memory Keeper' : 'Your Companion'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <CardContent className="p-4 space-y-4 max-h-[350px] overflow-y-auto">
            {!response ? (
              <div className="text-sm text-muted-foreground leading-relaxed">
                {getGreeting()}
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {/* Quote (Echo Highlight) */}
                <div className="bg-memory/10 border-l-4 border-memory p-3 rounded-r">
                  <p className="text-sm font-medium text-memory-foreground">
                    "{response.quote}"
                  </p>
                </div>

                {/* Emotional Reflection (Mirror) */}
                <div className="bg-accent/10 border-l-4 border-accent p-3 rounded-r">
                  <p className="text-sm text-foreground leading-relaxed">
                    {response.reflection}
                  </p>
                </div>

                {/* Follow-up Question */}
                <div className="bg-primary/10 border-l-4 border-primary p-3 rounded-r">
                  <p className="text-sm text-primary font-medium">
                    {response.followUp}
                  </p>
                </div>
              </div>
            )}
          </CardContent>

          {/* Input Area */}
          <div className="p-4 border-t border-border/50">
            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={mode === 'visitor' ? "Ask about these memories..." : "Share a thought or ask for guidance..."}
                className="flex-1 min-h-[80px] text-sm resize-none"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading}
                size="icon"
                className="self-end bg-gradient-to-br from-accent to-primary hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};

export default Solon;