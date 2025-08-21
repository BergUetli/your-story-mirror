import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, X, Send, Sparkles, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { solonService, type SolonResponse, type Memory } from '@/services/solonService';
import { voiceService, VOICES, type Voice } from '@/services/voiceService';
import { useMemories } from '@/hooks/useMemories';
import { useToast } from '@/hooks/use-toast';

interface SolonProps {
  mode?: 'user' | 'visitor';
  visitorPermissions?: string[];
  autoSpeak?: boolean;
}

const Solon: React.FC<SolonProps> = ({ 
  mode = 'user', 
  visitorPermissions = ['public'],
  autoSpeak = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<SolonResponse | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(VOICES[0]); // Default to Aria
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const { memories, getMemoriesForVisitor } = useMemories();
  const { toast } = useToast();

  const getRelevantMemories = () => {
    return mode === 'visitor' 
      ? getMemoriesForVisitor(visitorPermissions)
      : memories;
  };

  const speakResponse = async (text: string) => {
    if (!voiceEnabled) return;
    
    try {
      setIsSpeaking(true);
      await voiceService.speak(text, { voiceId: selectedVoice.id });
    } catch (error) {
      console.error('Error speaking:', error);
      toast({
        title: "Voice Error",
        description: "I couldn't speak right now. Check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsSpeaking(false);
    }
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
      
      // Auto-speak the reflection if voice is enabled
      if (autoSpeak && voiceEnabled) {
        await speakResponse(solonResponse.reflection);
      }
      
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

  const toggleVoice = () => {
    if (isSpeaking) {
      voiceService.stop();
      setIsSpeaking(false);
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const playResponse = async () => {
    if (!response) return;
    await speakResponse(response.reflection);
  };

  const handleClose = () => {
    setIsOpen(false);
    setResponse(null);
    setMessage('');
    if (isSpeaking) {
      voiceService.stop();
      setIsSpeaking(false);
    }
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
          isOpen ? "scale-0" : "scale-100",
          isSpeaking && "animate-pulse border-memory"
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
              <div className={cn(
                "w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center",
                isSpeaking && "animate-pulse"
              )}>
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Solon</h3>
                <p className="text-xs text-muted-foreground">
                  {mode === 'visitor' ? 'Memory Keeper' : 'Your Companion'}
                  {isSpeaking && ' • Speaking...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Voice Controls */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleVoice}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title={voiceEnabled ? "Disable voice" : "Enable voice"}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              
              {response && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={playResponse}
                  disabled={isSpeaking}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Play response"
                >
                  {isSpeaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
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
          <div className="p-4 border-t border-border/50 space-y-3">
            {/* Voice Settings */}
            {voiceEnabled && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Voice:</label>
                <Select value={selectedVoice.id} onValueChange={(value) => {
                  const voice = VOICES.find(v => v.id === value);
                  if (voice) setSelectedVoice(voice);
                }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <div>
                          <div className="font-medium">{voice.name}</div>
                          <div className="text-xs text-muted-foreground">{voice.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
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