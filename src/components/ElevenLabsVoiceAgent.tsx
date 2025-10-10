import { useState, useCallback } from 'react';
import { useConversation } from '@11labs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ElevenLabsVoiceAgentProps {
  agentId: string;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

export function ElevenLabsVoiceAgent({ agentId, onSpeakingChange }: ElevenLabsVoiceAgentProps) {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Connected to ElevenLabs Conversational AI');
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

  const startConversation = useCallback(async () => {
    try {
      setIsConnecting(true);
      
      // Request microphone access first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      toast({
        title: "Connecting...",
        description: "Setting up voice agent",
      });

      // Get signed URL from our edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-agent-token', {
        body: { agentId }
      });

      if (error) throw error;
      if (!data?.signed_url) {
        throw new Error('Failed to get signed URL');
      }

      // Start the conversation with the signed URL
      await conversation.startSession({ 
        signedUrl: data.signed_url 
      });
      
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
