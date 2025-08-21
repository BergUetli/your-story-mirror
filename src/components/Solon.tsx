import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, X, Send, Sparkles, Volume2, VolumeX, Play, Pause, Mic, MicOff, Square } from 'lucide-react';
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
  const [selectedVoice, setSelectedVoice] = useState<Voice>(VOICES[0]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'solon', content: string}>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [lastResponseTime, setLastResponseTime] = useState<number>(0);
  
  // Auto-pause detection
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [transcriptBuffer, setTranscriptBuffer] = useState('');
  const lastTranscriptRef = useRef('');
  const processingRef = useRef(false);
  
  const { memories, getMemoriesForVisitor, addMemoryFromConversation } = useMemories();
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

  // Intelligent conversation management
  useEffect(() => {
    if (transcript && isConversationActive && !isLoading && !isSpeaking) {
      setTranscriptBuffer(transcript);
      
      // Clear any existing timer
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }

      // Set a new timer for auto-processing
      const timer = setTimeout(() => {
        if (transcript.trim() && transcript !== lastTranscriptRef.current && !processingRef.current) {
          handleAutoProcessMessage(transcript);
        }
      }, 2000); // Wait 2 seconds of silence before processing

      setSilenceTimer(timer);
    }

    return () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    };
  }, [transcript, isConversationActive, isLoading, isSpeaking]);

  // Auto-restart listening after Solon finishes speaking
  useEffect(() => {
    if (isConversationActive && !isSpeaking && !isLoading && !isListening) {
      // Small delay to ensure audio has fully stopped
      const timer = setTimeout(() => {
        if (isConversationActive && speechSupported) {
          startListening();
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, isLoading, isConversationActive, isListening, speechSupported]);

  const handleAutoProcessMessage = async (userMessage: string) => {
    if (processingRef.current || !userMessage.trim()) return;
    
    processingRef.current = true;
    lastTranscriptRef.current = userMessage;
    
    // Check for end conversation command
    const endCommands = ['end conversation', 'save memory', 'store memory', 'goodbye solon', 'stop conversation'];
    const isEndCommand = endCommands.some(cmd => 
      userMessage.toLowerCase().includes(cmd.toLowerCase())
    );

    if (isEndCommand && conversationHistory.length > 0) {
      await handleEndConversation();
      processingRef.current = false;
      return;
    }

    setIsLoading(true);
    if (isListening) stopListening();
    
    // Add user message to conversation history
    const newHistory = [...conversationHistory, { role: 'user' as const, content: userMessage }];
    setConversationHistory(newHistory);
    
    try {
      const relevantMemories = getRelevantMemories();
      
      // Create more dynamic responses in demo mode
      const solonResponse = await solonService.chat({
        mode,
        message: userMessage,
        memories: relevantMemories,
        visitorPermissions,
        conversationHistory: newHistory, // Pass conversation context
      });
      
      setResponse(solonResponse);
      setLastResponseTime(Date.now());
      
      // Add Solon's response to conversation history
      const updatedHistory = [...newHistory, { role: 'solon' as const, content: solonResponse.reflection }];
      setConversationHistory(updatedHistory);
      
      // Reset transcript after processing
      resetTranscript();
      setTranscriptBuffer('');
      
      // Speak the response
      await speakResponse(solonResponse.reflection);
      
    } catch (error) {
      console.error('Conversation error:', error);
    } finally {
      setIsLoading(false);
      processingRef.current = false;
    }
  };

  const speakResponse = async (text: string) => {
    if (!voiceEnabled) return;
    
    try {
      setIsSpeaking(true);
      await voiceService.speak(text, { voiceId: selectedVoice.id });
    } catch (error) {
      console.error('Error speaking:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const startConversation = () => {
    if (!speechSupported) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }
    
    setIsConversationActive(true);
    resetTranscript();
    setTranscriptBuffer('');
    lastTranscriptRef.current = '';
    processingRef.current = false;
    
    // Give initial greeting
    const greeting = mode === 'visitor' 
      ? "Hello, I'm Solon. I'm ready to share the memories that have been entrusted to me. What would you like to know?"
      : "Hello, I'm Solon. I'm here to listen and help you reflect on your experiences. What's on your mind today?";
    
    speakResponse(greeting);
  };

  const stopConversation = () => {
    setIsConversationActive(false);
    if (isListening) stopListening();
    if (isSpeaking) voiceService.stop();
    if (silenceTimer) clearTimeout(silenceTimer);
    
    setIsSpeaking(false);
    setIsLoading(false);
    processingRef.current = false;
    resetTranscript();
    setTranscriptBuffer('');
  };

  const handleEndConversation = async () => {
    if (conversationHistory.length === 0) {
      stopConversation();
      return;
    }

    setIsProcessing(true);
    
    try {
      // Create conversation text from history
      const conversationText = conversationHistory
        .map(entry => `${entry.role === 'user' ? 'You' : 'Solon'}: ${entry.content}`)
        .join('\n\n');

      // Generate title and content from conversation
      const firstUserMessage = conversationHistory.find(entry => entry.role === 'user')?.content || '';
      const title = firstUserMessage.length > 50 
        ? firstUserMessage.substring(0, 47) + '...' 
        : firstUserMessage || 'Memory Conversation';

      // Create a summary from the conversation
      const userMessages = conversationHistory.filter(entry => entry.role === 'user').map(entry => entry.content);
      const content = userMessages.length > 1 
        ? userMessages.join(' ') 
        : userMessages[0] || 'A conversation with Solon about memories';

      // Save the memory with conversation
      const savedMemory = await addMemoryFromConversation(
        title,
        content,
        conversationText,
        'public'
      );

      if (savedMemory) {
        toast({
          title: "Memory Saved",
          description: "Your conversation has been preserved as a memory.",
        });

        // Clear conversation and close
        setConversationHistory([]);
        setResponse(null);
        stopConversation();
        setIsOpen(false);
        
        // Speak confirmation
        await speakResponse("Your memory has been saved. Thank you for sharing with me.");
      } else {
        throw new Error('Failed to save memory');
      }
      
    } catch (error) {
      console.error('Error saving memory:', error);
      toast({
        title: "Save Error",
        description: "I couldn't save your memory right now. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      stopConversation();
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    await handleAutoProcessMessage(message.trim());
    setMessage('');
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
    stopConversation();
    setResponse(null);
    setMessage('');
    setConversationHistory([]);
  };

  const getGreeting = () => {
    if (mode === 'visitor') {
      return "I'm Solon, the memory keeper for this sanctuary. I can share the stories that have been entrusted to me.";
    }
    return "Hello, I'm Solon, your memory companion. I'm here to help you reflect on your experiences and preserve what matters most.";
  };

  // Get conversation status text
  const getConversationStatus = () => {
    if (isProcessing) return "Saving your memory...";
    if (isLoading) return "Thinking...";
    if (isSpeaking) return "Speaking...";
    if (isConversationActive && isListening) {
      if (transcriptBuffer) return `"${transcriptBuffer}"`;
      return "Listening...";
    }
    if (isConversationActive && !isListening) return "Starting to listen...";
    return conversationHistory.length === 0 
      ? "Ready to begin our conversation" 
      : "Ready to continue our conversation";
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
          (isSpeaking || isConversationActive) && "animate-pulse border-memory"
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
                (isSpeaking || isConversationActive) && "animate-pulse"
              )}>
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Solon</h3>
                <p className="text-xs text-muted-foreground">
                  {mode === 'visitor' ? 'Memory Keeper' : 'Your Companion'}
                  {isConversationActive && ' • Active'}
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
                      {/* Pulsing Conversation Circle */}
                      <div className="relative mb-8">
                        <div className={cn(
                          "w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-300 cursor-pointer",
                          isConversationActive
                            ? "bg-gradient-to-br from-memory to-accent border-memory shadow-lg shadow-memory/30" 
                            : "bg-gradient-to-br from-accent to-primary border-accent/50 hover:shadow-lg hover:shadow-accent/30",
                          (isLoading || isProcessing) && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={isConversationActive ? stopConversation : startConversation}
                        >
                          {isConversationActive ? (
                            <div className="flex flex-col items-center">
                              <Square className="h-8 w-8 text-white mb-2" />
                              <div className="text-xs text-white font-medium">Active</div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <Mic className="h-8 w-8 text-white mb-2" />
                              <div className="text-xs text-white font-medium">Start</div>
                            </div>
                          )}
                        </div>
                        
                        {/* Animated rings when active */}
                        {isConversationActive && (
                          <>
                            <div className="absolute inset-0 rounded-full border-4 border-memory animate-ping opacity-20"></div>
                            <div className="absolute inset-2 rounded-full border-2 border-memory animate-ping opacity-30 animation-delay-150"></div>
                            {isListening && (
                              <div className="absolute inset-4 rounded-full border border-memory animate-pulse opacity-40"></div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Status Text */}
                      <div className="text-center space-y-2 mb-6 min-h-[60px] flex flex-col justify-center">
                        <p className={cn(
                          "font-medium transition-colors duration-300",
                          isConversationActive ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {getConversationStatus()}
                        </p>
                        
                        {speechError && (
                          <p className="text-destructive text-sm">{speechError}</p>
                        )}

                        {/* Instructions */}
                        {!isConversationActive && conversationHistory.length === 0 && (
                          <div className="text-sm text-muted-foreground max-w-sm">
                            Click the circle to start a natural conversation with Solon. 
                            I'll listen and respond automatically.
                          </div>
                        )}
                        
                        {isConversationActive && conversationHistory.length > 0 && (
                          <div className="text-xs text-memory bg-memory/10 rounded-lg p-3 mt-4">
                            <p className="font-medium mb-1">💡 Say:</p>
                            <p>"End conversation" to save this as a memory</p>
                          </div>
                        )}
                      </div>

                      {/* Quick Actions */}
                      {isConversationActive && (
                        <div className="flex gap-3">
                          <Button
                            onClick={stopConversation}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            <Square className="w-3 h-3 mr-1" />
                            End Conversation
                          </Button>
                        </div>
                      )}
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
