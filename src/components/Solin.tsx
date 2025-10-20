/**
 * SOLIN AI COMPANION COMPONENT
 * 
 * This is the core AI companion interface for "You, Remembered" - a digital memory preservation application.
 * Solin serves as an empathetic AI guide that helps users capture and preserve their life stories through
 * natural voice conversations, creating a lasting digital legacy for future generations.
 * 
 * BUSINESS PURPOSE:
 * - Primary user interface for memory capture through AI conversation
 * - Enables natural, voice-based interaction to reduce friction in memory sharing
 * - Automatically converts conversations into structured memories for timeline preservation
 * - Supports both authenticated users and visitors with different permission levels
 * - Creates emotional connection through empathetic AI responses and memory reflection
 * 
 * KEY FEATURES:
 * - Real-time voice conversation with ElevenLabs AI agent
 * - Automatic memory extraction from conversations
 * - Dual interface modes: Voice (primary) and Text Chat (fallback)
 * - Intelligent conversation management with auto-pause detection
 * - Memory context injection for personalized responses
 * - Visitor mode for sharing public memories with others
 * 
 * TECHNICAL ARCHITECTURE:
 * - Uses ElevenLabs Conversational AI for real-time voice interaction
 * - Client-side memory tools for instant operations (zero latency)
 * - Speech recognition for hands-free conversation
 * - Automatic conversation-to-memory conversion
 * - State management for conversation flow and UI updates
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, X, Send, Sparkles, Volume2, VolumeX, Play, Pause, Mic, MicOff, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { solinService, type SolinResponse, type Memory } from '@/services/solinService';
import { voiceService, VOICES, type Voice } from '@/services/voiceService';
import { voiceRecordingService, testGuestRecording, checkDatabaseRecordings, checkGuestRecordings } from '@/services/voiceRecording';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useMemories } from '@/hooks/useMemories';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import solinConfig from '@/agents/solin.json';
import { AddMemoryForm } from '@/components/AddMemoryForm';

/**
 * Component Props Configuration
 * 
 * BUSINESS CONTEXT:
 * - mode: Determines user access level and available features
 *   - 'user': Full access for authenticated users (can save private memories)
 *   - 'visitor': Limited access for sharing public memories only
 * - visitorPermissions: Controls which memory categories visitors can access
 * - defaultView: Primary interaction method (voice is preferred for natural conversation)
 *   - 'voice': Natural voice conversation (default)
 *   - 'chat': Text-based chat interface
 *   - 'form': Manual memory entry form
 */
interface SolinProps {
  mode?: 'user' | 'visitor';           // User access level and permissions
  visitorPermissions?: string[];       // Memory categories visitors can access
  defaultView?: 'voice' | 'chat' | 'form';     // Primary interaction interface
}

/**
 * MAIN SOLIN COMPONENT
 * 
 * This component manages the entire AI conversation experience, including voice interaction,
 * memory capture, and user interface state. It serves as the primary touchpoint for users
 * to interact with their AI memory companion.
 */
const Solin: React.FC<SolinProps> = ({ 
  mode = 'user', 
  visitorPermissions = ['public'],
  defaultView = 'voice'
}) => {
  // ===== USER INTERFACE STATE =====
  // These states control the visual presentation and user interaction flow
  
  const [isOpen, setIsOpen] = useState(false);                    // Whether Solin chat interface is visible
  const [currentView, setCurrentView] = useState<'voice' | 'chat' | 'form'>(defaultView);  // Current interaction mode
  const [isLoading, setIsLoading] = useState(false);              // Whether AI is processing a response
  const [isSpeaking, setIsSpeaking] = useState(false);            // Whether AI is currently speaking
  const [message, setMessage] = useState('');                     // Text input for chat mode
  const [response, setResponse] = useState<SolinResponse | null>(null);  // Latest AI response
  const [selectedVoice, setSelectedVoice] = useState<Voice>(VOICES[0]);  // User's preferred AI voice
  const [voiceEnabled, setVoiceEnabled] = useState(true);         // Whether voice output is enabled
  
  // ===== CONVERSATION MANAGEMENT =====
  // These states manage the conversation flow and memory capture process
  
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'solin', content: string}>>([]);  // Complete conversation record
  const [isProcessing, setIsProcessing] = useState(false);        // Whether saving memory to database
  const [isConversationActive, setIsConversationActive] = useState(false);  // Whether conversation is ongoing
  const [lastResponseTime, setLastResponseTime] = useState<number>(0);  // Timestamp of last AI response
  
  // ===== INTELLIGENT CONVERSATION FEATURES =====
  // These states enable natural conversation flow with automatic pause detection
  
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);  // Timer for auto-processing after silence
  const [transcriptBuffer, setTranscriptBuffer] = useState('');   // Current speech recognition text
  const lastTranscriptRef = useRef('');                          // Previous transcript to detect changes
  const processingRef = useRef(false);                           // Prevents duplicate processing
  
  // ===== BUSINESS SERVICES INTEGRATION =====
  // These hooks connect to the memory system and user experience features
  
  const { memories, getMemoriesForVisitor, addMemoryFromConversation } = useMemories();  // Memory operations
  const { toast } = useToast();                                 // User notification system
  const { user } = useAuth();                                   // User authentication state
  const navigate = useNavigate();                               // Page navigation
  
  // ===== VOICE RECORDING STATE =====
  // State for tracking conversation audio recording
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);  // Whether voice is being recorded
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);  // Current recording session ID
  
  // ===== DEBUG: Expose test functions globally =====
  useEffect(() => {
    (window as any).testGuestRecording = testGuestRecording;
    (window as any).checkDatabaseRecordings = checkDatabaseRecordings;
    (window as any).checkGuestRecordings = checkGuestRecordings;
    (window as any).voiceRecordingService = voiceRecordingService;
    console.log('🔧 Debug functions exposed:', {
      testGuestRecording: 'Test guest recording insertion',
      checkDatabaseRecordings: 'Check all recordings in database', 
      checkGuestRecordings: 'Check guest recordings specifically',
      voiceRecordingService: 'Full voice recording service'
    });
  }, []);
  const { 
    isListening, 
    transcript, 
    error: speechError, 
    isSupported: speechSupported,
    startListening, 
    stopListening, 
    resetTranscript 
  } = useSpeechRecognition();                                   // Speech-to-text capabilities

  /**
   * MEMORY CONTEXT MANAGEMENT
   * 
   * BUSINESS PURPOSE: Provides personalized conversation context by injecting relevant memories
   * into the AI's responses. This creates continuity and emotional connection across conversations.
   * 
   * TECHNICAL IMPLEMENTATION: Returns appropriate memory set based on user mode and permissions.
   */
  const getRelevantMemories = () => {
    return mode === 'visitor' 
      ? getMemoriesForVisitor(visitorPermissions)  // Filtered public memories for visitors
      : memories;                                  // Full memory access for authenticated users
  };

  /**
   * INTELLIGENT CONVERSATION MANAGEMENT
   * 
   * BUSINESS PURPOSE: Creates natural conversation flow by automatically detecting when users
   * finish speaking and processing their input. This eliminates the need for manual "send" actions
   * and makes the interaction feel more like talking to a real person.
   * 
   * KEY FEATURES:
   * - Auto-pause detection: Waits 3 seconds after user stops speaking
   * - Prevents duplicate processing: Uses refs to avoid processing same transcript twice
   * - Natural flow: User can speak naturally without pressing buttons
   * - Context awareness: Only processes when conversation is active and not already speaking
   */
  useEffect(() => {
    if (transcript && isConversationActive && !isLoading && !isSpeaking) {
      setTranscriptBuffer(transcript);
      
      // Clear any existing timer to reset the countdown
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }

      // Set a new timer for auto-processing after 3 seconds of silence
      const timer = setTimeout(() => {
        if (transcript.trim() && transcript !== lastTranscriptRef.current && !processingRef.current && !isSpeaking) {
          handleAutoProcessMessage(transcript);
        }
      }, 3000); // Wait 3 seconds of silence before processing

      setSilenceTimer(timer);
    }

    return () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    };
  }, [transcript, isConversationActive, isLoading, isSpeaking]);

  /**
   * AUTO-RESTART LISTENING MANAGEMENT
   * 
   * BUSINESS PURPOSE: Ensures continuous conversation flow by automatically restarting
   * speech recognition after Solin finishes speaking. This creates seamless back-and-forth
   * conversation without requiring users to manually restart listening.
   * 
   * TECHNICAL IMPLEMENTATION: Waits 1 second after Solin stops speaking to prevent
   * interrupting the AI, then restarts listening if conversation is still active.
   */
  useEffect(() => {
    if (isConversationActive && !isSpeaking && !isLoading && !isListening) {
      // Longer delay to prevent interrupting Solin
      const timer = setTimeout(() => {
        if (isConversationActive && speechSupported && !isSpeaking) {
          startListening();
        }
      }, 1000); // Increased delay to 1 second
      
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, isLoading, isConversationActive, isListening, speechSupported]);

  /**
   * AUTOMATIC MESSAGE PROCESSING
   * 
   * BUSINESS PURPOSE: Processes user speech input automatically, creating natural conversation flow.
   * This function handles the core conversation logic including AI response generation, memory
   * context injection, and conversation history management.
   * 
   * KEY FEATURES:
   * - Conversation end detection: Recognizes natural ending phrases
   * - Memory context injection: Uses relevant memories for personalized responses
   * - Conversation history tracking: Maintains complete conversation record
   * - Automatic speech synthesis: Converts AI response to speech
   * - Error handling: Graceful fallback for conversation failures
   * - **NEW**: Voice recording transcript capture for archival
   */
  const handleAutoProcessMessage = async (userMessage: string) => {
    if (processingRef.current || !userMessage.trim()) return;
    
    processingRef.current = true;
    lastTranscriptRef.current = userMessage;
    
    // Add transcript to voice recording if active
    if (isRecordingVoice && currentSessionId) {
      try {
        voiceRecordingService.addTranscript(userMessage, 'user');
      } catch (error) {
        console.error('❌ Failed to add user transcript to recording:', error);
      }
    }
    
    // Check for natural conversation ending commands
    const endCommands = ['end conversation', 'save memory', 'store memory', 'goodbye solin', 'stop conversation'];
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
    
    // Add user message to conversation history for context
    const newHistory = [...conversationHistory, { role: 'user' as const, content: userMessage }];
    setConversationHistory(newHistory);
    
    try {
      const relevantMemories = getRelevantMemories();
      
      // Generate AI response with memory context and conversation history
      const solinResponse = await solinService.chat({
        mode,
        message: userMessage,
        memories: relevantMemories,
        visitorPermissions,
        conversationHistory: newHistory, // Pass conversation context for continuity
      });
      
      setResponse(solinResponse);
      setLastResponseTime(Date.now());
      
      // Add Solin's response to conversation history
      const updatedHistory = [...newHistory, { role: 'solin' as const, content: solinResponse.reflection }];
      setConversationHistory(updatedHistory);
      
      // Add AI response transcript to voice recording if active
      if (isRecordingVoice && currentSessionId) {
        try {
          voiceRecordingService.addTranscript(solinResponse.reflection, 'ai');
        } catch (error) {
          console.error('❌ Failed to add AI transcript to recording:', error);
        }
      }
      
      // Reset transcript after processing
      resetTranscript();
      setTranscriptBuffer('');
      
      // Convert AI response to speech for natural conversation flow
      await speakResponse(solinResponse.reflection);
      
    } catch (error) {
      console.error('Conversation error:', error);
    } finally {
      setIsLoading(false);
      processingRef.current = false;
    }
  };

  /**
   * SPEECH SYNTHESIS SERVICE
   * 
   * BUSINESS PURPOSE: Converts AI text responses into natural speech using ElevenLabs technology.
   * This creates the illusion of talking to a real person rather than reading text responses.
   * 
   * KEY FEATURES:
   * - High-quality voice synthesis using ElevenLabs Turbo v2.5 model
   * - User-configurable voice selection from multiple options
   * - Optimized voice settings for natural conversation flow
   * - Graceful error handling with user-friendly notifications
   * - Respects user's voice preference settings
   * 
   * TECHNICAL IMPLEMENTATION: Uses ElevenLabs API with custom voice settings for optimal
   * conversation experience. Includes comprehensive error handling and logging for debugging.
   */
  const speakResponse = async (text: string) => {
    if (!voiceEnabled) {
      console.log('🔇 Voice disabled, skipping speech');
      return;
    }
    
    try {
      setIsSpeaking(true);
      console.log('🎤 Solin starting to speak:', text.substring(0, 50) + '...');
      
      // Use selected voice from dropdown with optimized settings for conversation
      const voiceOptions = {
        voiceId: selectedVoice.id,
        model: 'eleven_turbo_v2_5',  // Fast, high-quality model for real-time conversation
        voiceSettings: {
          stability: 0.71,           // Balanced stability for consistent voice quality
          similarity_boost: 0.5      // Moderate similarity boost for natural variation
        }
      };
      
      console.log('🎤 Using Solin voice settings:', voiceOptions);
      console.log('🎵 About to call voiceService.speak...');
      
      await voiceService.speak(text, voiceOptions);
      console.log('✅ Solin finished speaking successfully');
      
    } catch (error) {
      console.error('❌ Solin speech error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        voiceEnabled,
        textLength: text.length
      });
      
      // Show user-friendly error only for critical errors, not for every voice issue
      if (!error.message?.includes('401') && !error.message?.includes('unusual_activity')) {
        toast({
          title: "Speech Error",
          description: "I had trouble speaking that response.",
          variant: "destructive",
        });
      }
    } finally {
      console.log('🏁 Solin speech attempt completed, setting isSpeaking to false');
      setIsSpeaking(false);
    }
  };

  /**
   * CONVERSATION INITIATION
   * 
   * BUSINESS PURPOSE: Starts a new conversation session with Solin, providing appropriate
   * greetings based on user mode and initiating the voice interaction flow.
   * 
   * KEY FEATURES:
   * - Browser compatibility check for speech recognition
   * - Mode-specific greetings (visitor vs. authenticated user)
   * - State initialization for new conversation
   * - Automatic greeting delivery via speech synthesis
   * - **NEW**: Automatic voice recording for conversation archival
   * 
   * USER EXPERIENCE: Creates welcoming entry point that immediately engages users
   * and sets expectations for the conversation experience.
   */
  const startConversation = async () => {
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
    
    // Start voice recording for conversation archival
    // Use actual user ID if logged in, or generate temporary guest ID for demo
    const recordingUserId = user?.id || `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🎬 Solin conversation starting with recording setup:', {
      recordingUserId,
      isAuthenticated: !!user?.id,
      isGuest: !user?.id,
      userObject: user
    });
    
    try {
      console.log('🎤 Calling voiceRecordingService.startRecording...');
      const sessionId = await voiceRecordingService.startRecording(recordingUserId, 'solin_conversation');
      setCurrentSessionId(sessionId);
      setIsRecordingVoice(true);
      console.log('🎙️ Started recording Solin conversation:', { sessionId, userId: recordingUserId, isGuest: !user?.id });
      
      if (!user?.id) {
        console.log('👤 Guest user - voice recording will be stored with temporary ID');
        toast({
          title: "Recording Active",
          description: "Your conversation is being recorded as a guest session.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('❌ Failed to start voice recording:', error);
      // Continue conversation even if recording fails
      toast({
        title: "Recording Notice",
        description: "Voice recording couldn't start, but you can still have a conversation.",
        variant: "default"
      });
    }
    
    // Give initial greeting based on user mode
    const greeting = mode === 'visitor' 
      ? "Hi, I'm your AI guide through time. I'm ready to share memories. What would you like to know?"
      : "Hi, I'm your AI guide through time. Please share a memory or a thought for the future with me.";
    
    speakResponse(greeting);
  };

  /**
   * CONVERSATION TERMINATION
   * 
   * BUSINESS PURPOSE: Safely stops an active conversation, cleaning up all voice services
   * and resetting component state. This ensures proper resource management and prevents
   * memory leaks or hanging voice connections.
   * 
   * **NEW**: Also handles voice recording cleanup and archival.
   */
  const stopConversation = async () => {
    setIsConversationActive(false);
    if (isListening) stopListening();
    if (isSpeaking) voiceService.stop();
    if (silenceTimer) clearTimeout(silenceTimer);
    
    // Stop voice recording if active
    if (isRecordingVoice && currentSessionId) {
      try {
        const recordingMetadata = await voiceRecordingService.stopRecording();
        if (recordingMetadata) {
          console.log('🎙️ Stopped Solin conversation recording:', recordingMetadata);
        }
      } catch (error) {
        console.error('❌ Failed to stop voice recording:', error);
      } finally {
        setIsRecordingVoice(false);
        setCurrentSessionId(null);
      }
    }
    
    setIsSpeaking(false);
    setIsLoading(false);
    processingRef.current = false;
    resetTranscript();
    setTranscriptBuffer('');
  };

  /**
   * CONVERSATION-TO-MEMORY CONVERSION
   * 
   * BUSINESS PURPOSE: Converts completed conversations into permanent memories, creating
   * the core value proposition of preserving life stories. This function handles the
   * entire memory creation workflow from conversation processing to database storage.
   * 
   * KEY FEATURES:
   * - User confirmation dialog for memory saving
   * - Automatic title generation from first user message
   * - Content summarization from conversation history
   * - Complete conversation preservation for future reference
   * - Navigation to timeline after successful save
   * - Voice confirmation of successful memory creation
   * - **NEW**: Links voice recordings to memories for unified archival
   * 
   * USER EXPERIENCE: Provides clear feedback throughout the memory creation process
   * and ensures users understand their stories are being preserved for posterity.
   */
  const handleEndConversation = async () => {
    if (conversationHistory.length === 0) {
      await stopConversation();
      return;
    }

    // Stop conversation and show save prompt
    await stopConversation();
    
    // Ask user if they want to save the memory
    const shouldSave = await showSaveMemoryPrompt();
    
    if (shouldSave) {
      setIsProcessing(true);
      
      try {
        // Create conversation text from history for complete preservation
        const conversationText = conversationHistory
          .map(entry => `${entry.role === 'user' ? 'You' : 'Solin'}: ${entry.content}`)
          .join('\n\n');

        // Generate title and content from conversation for memory organization
        const firstUserMessage = conversationHistory.find(entry => entry.role === 'user')?.content || '';
        const title = firstUserMessage.length > 50 
          ? firstUserMessage.substring(0, 47) + '...' 
          : firstUserMessage || 'Memory Conversation';

        // Create a summary from the conversation for search and discovery
        const userMessages = conversationHistory.filter(entry => entry.role === 'user').map(entry => entry.content);
        const content = userMessages.length > 1 
          ? userMessages.join(' ') 
          : userMessages[0] || 'A conversation with Solin about memories';

        // Save the memory with complete conversation context
        const savedMemory = await addMemoryFromConversation(
          title,
          content,
          conversationText,
          'public'
        );

        // Link voice recording to the saved memory if both exist
        if (savedMemory && currentSessionId && isRecordingVoice) {
          try {
            voiceRecordingService.addMemoryId(savedMemory.id);
            console.log('🔗 Linked voice recording to memory:', { memoryId: savedMemory.id, sessionId: currentSessionId });
          } catch (error) {
            console.error('❌ Failed to link voice recording to memory:', error);
          }
        }

        if (savedMemory) {
          toast({
            title: "Memory Saved",
            description: "Your conversation has been preserved as a memory and voice recording.",
          });

          // Navigate to timeline to show the new memory
          navigate(`/timeline`);
          
          // Provide voice confirmation for natural conversation closure
          await speakResponse("Your memory has been saved and added to your timeline. The conversation is also archived as a voice recording.");
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
      }
    }
    
    // Clear conversation and close interface
    setConversationHistory([]);
    setResponse(null);
    setIsOpen(false);
  };

  const showSaveMemoryPrompt = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.innerHTML = `
        <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div class="bg-card p-6 rounded-lg max-w-md w-full border border-border/20 shadow-2xl">
            <h3 class="text-lg font-semibold mb-4 text-foreground">Save this memory?</h3>
            <p class="text-muted-foreground mb-6">Would you like to preserve this conversation as a memory in your timeline?</p>
            <div class="flex gap-3 justify-end">
              <button id="cancel-save" class="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors">
                Continue Conversation
              </button>
              <button id="confirm-save" class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
                Save Memory
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      const handleSave = () => {
        document.body.removeChild(dialog);
        resolve(true);
      };
      
      const handleCancel = () => {
        document.body.removeChild(dialog);
        resolve(false);
      };
      
      dialog.querySelector('#confirm-save')?.addEventListener('click', handleSave);
      dialog.querySelector('#cancel-save')?.addEventListener('click', handleCancel);
    });
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
      return "I'm Solin, the memory keeper for this sanctuary. I can share the stories that have been entrusted to me.";
    }
    return "Hello, I'm Solin, your memory companion. I'm here to help you reflect on your experiences and preserve what matters most.";
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
      {/* 
        FLOATING SOLIN ACCESS BUTTON
        BUSINESS PURPOSE: Primary entry point for users to access Solin AI companion.
        Positioned as a floating action button for easy access from any page.
        
        VISUAL FEEDBACK:
        - Gentle floating animation to draw attention
        - Pulsing animation when Solin is active/speaking
        - Gradient styling consistent with brand identity
        - Responsive positioning for mobile and desktop
      */}
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

      {/* 
        SOLIN CHAT INTERFACE
        BUSINESS PURPOSE: Main conversation interface providing dual interaction modes
        (voice and text) with intelligent conversation management and memory capture.
        
        KEY FEATURES:
        - Responsive design for mobile and desktop
        - Dual interface modes (voice primary, text fallback)
        - Real-time conversation status indicators
        - Voice settings and preferences
        - Conversation history and memory conversion
      */}
      {isOpen && (
        <Card className={cn(
          "fixed inset-4 md:bottom-20 md:right-4 md:left-auto md:top-auto md:w-96 md:max-h-[600px] z-50",
          "bg-card/95 backdrop-blur-sm border-memory/20",
          "shadow-2xl animate-scale-in overflow-hidden"
        )}>
          {/* 
            INTERFACE HEADER
            BUSINESS PURPOSE: Provides clear identification of Solin AI companion and
            current conversation status, along with interface controls.
            
            VISUAL ELEMENTS:
            - Solin avatar with animated state indicators
            - Mode-specific titles (Memory Keeper vs. Your Companion)
            - Active conversation status indicator
            - Interface toggle (Voice/Chat) and close button
          */}
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center",
                (isSpeaking || isConversationActive) && "animate-pulse"
              )}>
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Solin</h3>
                <p className="text-xs text-muted-foreground">
                  {mode === 'visitor' ? 'Memory Keeper' : 'Your Companion'}
                  {isConversationActive && ' • Active'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Interface Mode Toggle - Voice / Chat / Form */}
              <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
                <Button
                  variant={currentView === 'voice' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('voice')}
                  className="text-xs h-7 px-2"
                >
                  Voice
                </Button>
                <Button
                  variant={currentView === 'chat' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('chat')}
                  className="text-xs h-7 px-2"
                >
                  Chat
                </Button>
                <Button
                  variant={currentView === 'form' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('form')}
                  className="text-xs h-7 px-2"
                >
                  Form
                </Button>
              </div>
              
              {/* Close Interface Button */}
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
                        
                        {/* Voice Recording Indicator */}
                        {isRecordingVoice && (
                          <div className="flex items-center justify-center gap-2 text-xs text-memory bg-memory/10 rounded-lg px-3 py-1 mx-auto">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span>Recording conversation</span>
                          </div>
                        )}
                        
                        {speechError && (
                          <p className="text-destructive text-sm">{speechError}</p>
                        )}

                        {/* Instructions */}
                        {!isConversationActive && conversationHistory.length === 0 && (
                          <div className="text-sm text-muted-foreground max-w-sm">
                            Click the circle to start a natural conversation with Solin. 
                            I'll listen and respond automatically.
                            {user && (
                              <div className="text-xs text-memory mt-1">
                                💾 Your conversations will be automatically recorded and archived
                              </div>
                            )}
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
            ) : currentView === 'chat' ? (
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
            ) : (
              /* Manual Memory Entry Form */
              <div className="h-full min-h-[400px] md:min-h-[500px] overflow-y-auto">
                <div className="p-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    Add a memory manually using the form below. You can switch back to voice or chat mode anytime.
                  </div>
                  <AddMemoryForm />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default Solin;
