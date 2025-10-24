import { useState, useCallback, useEffect } from 'react';
import { useConversation } from '@11labs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ElevenLabsVoiceAgentProps {
  agentId: string;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onAudioStreamAvailable?: (audioStream: MediaStream) => void;
}

export function ElevenLabsVoiceAgent({ agentId, onSpeakingChange, onAudioStreamAvailable }: ElevenLabsVoiceAgentProps) {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Connected to ElevenLabs Conversational AI');
      console.log('🔍 Conversation object properties:', Object.keys(conversation));
      console.log('🎵 Checking for audio streams in conversation:', {
        hasAudioContext: !!(conversation as any).audioContext,
        hasAudioStream: !!(conversation as any).audioStream,
        hasMediaStream: !!(conversation as any).mediaStream,
        hasOutputStream: !!(conversation as any).outputStream,
        hasSpeakerStream: !!(conversation as any).speakerStream
      });
      
      // Try to extract audio stream from various possible sources
      const audioStream = (conversation as any).audioStream || 
                         (conversation as any).mediaStream || 
                         (conversation as any).outputStream ||
                         (conversation as any).speakerStream;
      
      if (audioStream && audioStream instanceof MediaStream) {
        console.log('🎵 Found ElevenLabs audio stream!', {
          id: audioStream.id,
          audioTracks: audioStream.getAudioTracks().length,
          trackLabels: audioStream.getAudioTracks().map(t => t.label)
        });
        onAudioStreamAvailable?.(audioStream);
      } else {
        console.log('⚠️ No direct audio stream found, will use fallback audio detection methods');
        // Trigger enhanced audio element detection
        setTimeout(() => detectElevenLabsAudioElements(), 1000);
      }
      
      toast({
        title: "Connected",
        description: "Voice agent is ready to chat",
      });
    },
    onDisconnect: () => {
      console.log('👋 Disconnected from ElevenLabs');
      toast({
        title: "Disconnected",
        description: "Voice conversation ended",
      });
      onSpeakingChange?.(false);
    },
    onMessage: (message) => {
      console.log('📨 Message received:', message);
    },
    onError: (error) => {
      console.error('❌ Conversation error:', error);
      toast({
        title: "Error",
        description: typeof error === 'string' ? error : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Propagate speaking state to parent for orb animation
  useEffect(() => {
    onSpeakingChange?.(conversation.isSpeaking);
  }, [conversation.isSpeaking, onSpeakingChange]);

  const startConversation = useCallback(async () => {
    try {
      setIsConnecting(true);
      
      // Request microphone access first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      toast({
        title: "Connecting...",
        description: "Setting up voice agent",
      });

      // Get signed URL and personalized prompt from our edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-agent-token', {
        body: { agentId }
      });

      if (error) throw error;
      if (!data?.signed_url) {
        throw new Error('Failed to get signed URL');
      }

      console.log('Starting personalized ElevenLabs session with prompt override');
      
      // Use a cancellable timeout to avoid unhandled rejection after connect
      let timeoutId: number | undefined;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('Connection timed out')), 20000);
      });

      // Start the conversation with signed URL and personalized prompt override
      const startPromise = conversation.startSession({
        signedUrl: data.signed_url,
        ...(data.personalizedPrompt && {
          overrides: {
            agent: {
              prompt: {
                prompt: data.personalizedPrompt
              }
            }
          }
        })
      });

      await Promise.race([startPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);
      
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast({
        title: "Failed to connect",
        description: error instanceof Error ? error.message : "Could not start voice agent",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [agentId, conversation, toast]);

  const detectElevenLabsAudioElements = useCallback(() => {
    console.log('🔍 Scanning for ElevenLabs audio elements...');
    
    // Look for audio elements that might be created by ElevenLabs
    const audioElements = document.querySelectorAll('audio');
    
    audioElements.forEach((audioElement, index) => {
      console.log(`🎵 Found audio element ${index}:`, {
        src: audioElement.src,
        currentSrc: audioElement.currentSrc,
        networkState: audioElement.networkState,
        readyState: audioElement.readyState,
        paused: audioElement.paused
      });
      
      // Try to capture this audio element if it seems active
      if (audioElement.src || audioElement.currentSrc) {
        try {
          // Create MediaStream from audio element
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const source = audioContext.createMediaElementSource(audioElement);
          const destination = audioContext.createMediaStreamDestination();
          
          // Connect source to destination to create a stream
          source.connect(destination);
          // Also connect back to output so audio still plays
          source.connect(audioContext.destination);
          
          console.log(`✅ Successfully created MediaStream from audio element ${index}`);
          onAudioStreamAvailable?.(destination.stream);
          
        } catch (error) {
          console.warn(`⚠️ Failed to capture audio element ${index}:`, error);
        }
      }
    });
    
    // If no audio elements found yet, set up observer for future elements
    if (audioElements.length === 0) {
      console.log('👀 No audio elements found yet, setting up observer...');
      setupAudioElementObserver();
    }
  }, [onAudioStreamAvailable]);

  const setupAudioElementObserver = useCallback(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'AUDIO' || element.querySelector('audio')) {
              console.log('🎵 New audio element detected by observer!');
              setTimeout(() => detectElevenLabsAudioElements(), 500);
            }
          }
        });
      });
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    
    // Clean up observer after 30 seconds
    setTimeout(() => observer.disconnect(), 30000);
  }, [detectElevenLabsAudioElements]);

  const endConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isConnected = conversation.status === 'connected';

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Voice Agent</span>
          {conversation.isSpeaking && (
            <span className="text-sm font-normal text-muted-foreground animate-pulse">
              Speaking...
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          {!isConnected ? (
            <Button
              onClick={startConversation}
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Start Voice Conversation
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={endConversation}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              <MicOff className="w-5 h-5 mr-2" />
              End Conversation
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground space-y-2">
          <p className="font-medium">Status: {isConnected ? '🟢 Connected' : '⚪ Disconnected'}</p>
          <p className="text-xs">
            {isConnected 
              ? "Speak naturally - the agent is listening"
              : "Click the button to start a voice conversation"
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
