import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, X, Send, Sparkles, Volume2, VolumeX, Play, Pause, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { solonService, type SolonResponse, type Memory } from '@/services/solonService';
import { voiceService, VOICES, type Voice } from '@/services/voiceService';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useMemories } from '@/hooks/useMemories';
import { useToast } from '@/hooks/use-toast';

interface SolonProps {
  mode?: 'user' | 'visitor';
  visitorPermissions?: string[];
  defaultView?: 'chat' | 'voice';
}

const Solon: React.FC<SolonProps> = ({ 
  mode = 'user', 
  visitorPermissions = ['public'],
  defaultView = 'voice'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'voice' | 'chat'>(defaultView);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<SolonResponse | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(VOICES[0]); // Default to Aria
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'solon', content: string}>>([]);
  
  const { memories, getMemoriesForVisitor } = useMemories();
  const { toast } = useToast();
  const { 
    isListening, 
    transcript, 
    error: speechError, 
    isSupported: speechSupported,
    startListening, 
    stopListening, 
    resetTranscript 
  } = useSpeechRecognition();

  const getRelevantMemories = () => {
    return mode === 'visitor' 
      ? getMemoriesForVisitor(visitorPermissions)
      : memories;
  };

  // Handle speech recognition results
  useEffect(() => {
    if (transcript && !isLoading) {
      // Auto-send when speech stops and we have a transcript
      const timeoutId = setTimeout(() => {
        if (!isListening && transcript.trim()) {
          handleVoiceMessage(transcript);
          resetTranscript();
        }
      }, 1500); // Wait 1.5 seconds after speech stops

      return () => clearTimeout(timeoutId);
    }
  }, [transcript, isListening, isLoading]);

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

  const handleVoiceMessage = async (userMessage: string) => {
    setIsLoading(true);
    
    // Add user message to conversation history
    const newHistory = [...conversationHistory, { role: 'user' as const, content: userMessage }];
    setConversationHistory(newHistory);
    
    try {
      const relevantMemories = getRelevantMemories();
      const solonResponse = await solonService.chat({
        mode,
        message: userMessage,
        memories: relevantMemories,
        visitorPermissions,
      });
      
      setResponse(solonResponse);
      
      // Add Solon's response to conversation history
      const updatedHistory = [...newHistory, { role: 'solon' as const, content: solonResponse.reflection }];
      setConversationHistory(updatedHistory);
      
      // Speak the response
      await speakResponse(solonResponse.reflection);
      
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

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    await handleVoiceMessage(message.trim());
    setMessage('');
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      if (!speechSupported) {
        toast({
          title: "Speech Recognition Not Supported",
          description: "Your browser doesn't support speech recognition. Try Chrome or Edge.",
          variant: "destructive",
        });
        return;
      }
      startListening();
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
    setConversationHistory([]);
    if (isSpeaking) {
      voiceService.stop();
      setIsSpeaking(false);
    }
    if (isListening) {
      stopListening();
    }
    resetTranscript();
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
          "fixed inset-4 md:bottom-20 md:right-4 md:left-auto md:top-auto md:w-96 md:max-h-[600px] z-50",
          "bg-card/95 backdrop-blur-sm border-memory/20",
          "shadow-2xl animate-scale-in overflow-hidden"
        )}>
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <div className="flex items-center gap-3">
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
                  {isListening && ' • Listening...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView(currentView === 'voice' ? 'chat' : 'voice')}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {currentView === 'voice' ? 'Chat' : 'Voice'}
              </Button>
              
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

          <CardContent className="p-0 h-full">
            {currentView === 'voice' ? (
              /* Voice Conversation Interface */
              <div className="h-full min-h-[400px] md:min-h-[500px] flex flex-col">
                {/* Voice Status */}
                <div className="p-6 text-center flex-1 flex flex-col items-center justify-center">
                  {!speechSupported ? (
                    <div className="text-center space-y-4">
                      <div className="text-muted-foreground">
                        Speech recognition isn't supported in your browser.
                      </div>
                      <Button 
                        onClick={() => setCurrentView('chat')}
                        variant="outline"
                      >
                        Use Text Chat Instead
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Pulsing Microphone Circle */}
                      <div className="relative mb-8">
                        <div className={cn(
                          "w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-300",
                          isListening 
                            ? "bg-gradient-to-br from-memory to-accent border-memory animate-pulse shadow-lg shadow-memory/30" 
                            : "bg-gradient-to-br from-accent to-primary border-accent/50 hover:shadow-lg hover:shadow-accent/30",
                          isLoading && "opacity-50 cursor-not-allowed"
                        )}>
                          {isListening ? (
                            <div className="flex flex-col items-center">
                              <Mic className="h-8 w-8 text-white mb-2" />
                              <div className="text-xs text-white font-medium">Listening...</div>
                            </div>
                          ) : (
                            <Mic className="h-8 w-8 text-white" />
                          )}
                        </div>
                        
                        {/* Ripple effect when listening */}
                        {isListening && (
                          <>
                            <div className="absolute inset-0 rounded-full border-4 border-memory animate-ping opacity-20"></div>
                            <div className="absolute inset-2 rounded-full border-2 border-memory animate-ping opacity-30 animation-delay-150"></div>
                          </>
                        )}
                      </div>

                      {/* Status Text */}
                      <div className="text-center space-y-2 mb-6">
                        {isLoading ? (
                          <p className="text-foreground">Processing your message...</p>
                        ) : isListening ? (
                          <>
                            <p className="text-foreground font-medium">I'm listening...</p>
                            {transcript && (
                              <p className="text-sm text-muted-foreground italic">
                                "{transcript}"
                              </p>
                            )}
                          </>
                        ) : isSpeaking ? (
                          <p className="text-foreground">Speaking...</p>
                        ) : (
                          <p className="text-muted-foreground">
                            {conversationHistory.length === 0 
                              ? "Tap to start our conversation" 
                              : "Tap to continue our conversation"
                            }
                          </p>
                        )}
                        
                        {speechError && (
                          <p className="text-destructive text-sm">{speechError}</p>
                        )}
                      </div>

                      {/* Action Button */}
                      <Button
                        onClick={toggleListening}
                        disabled={isLoading || isSpeaking}
                        size="lg"
                        className={cn(
                          "px-8 py-3 rounded-full font-medium transition-all duration-300",
                          isListening 
                            ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
                            : "bg-gradient-to-br from-accent to-primary hover:opacity-90 text-white"
                        )}
                      >
                        {isLoading ? (
                          "Processing..."
                        ) : isListening ? (
                          <>
                            <MicOff className="w-4 h-4 mr-2" />
                            Stop Listening
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4 mr-2" />
                            Start Conversation
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>

                {/* Voice Settings */}
                <div className="p-4 border-t border-border/50 bg-muted/20">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Voice:</span>
                      <Select value={selectedVoice.id} onValueChange={(value) => {
                        const voice = VOICES.find(v => v.id === value);
                        if (voice) setSelectedVoice(voice);
                      }}>
                        <SelectTrigger className="h-8 text-xs border-none bg-transparent">
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
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleVoice}
                      className="h-8 w-8"
                    >
                      {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Text Chat Interface */
              <div className="h-full min-h-[400px] md:min-h-[500px] flex flex-col">
                <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[350px]">
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
                </div>

                {/* Text Input */}
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
                    <div className="flex flex-col gap-2">
                      {response && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={playResponse}
                          disabled={isSpeaking}
                          className="text-muted-foreground hover:text-foreground"
                          title="Play response"
                        >
                          {isSpeaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button
                        onClick={handleSendMessage}
                        disabled={isLoading}
                        size="icon"
                        className="bg-gradient-to-br from-accent to-primary hover:opacity-90"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default Solon;