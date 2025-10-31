import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OpenAIRealtimeAgentProps {
  model: string;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

export function OpenAIRealtimeAgent({ model, onSpeakingChange }: OpenAIRealtimeAgentProps) {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleSpeakingChange = useCallback((speaking: boolean) => {
    setIsSpeaking(speaking);
    onSpeakingChange?.(speaking);
  }, [onSpeakingChange]);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    
    try {
      // Get microphone access
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Connect to WebSocket (this would connect to your edge function)
      const projectRef = 'gulydhhzwlltkxbfnclu';
      const ws = new WebSocket(`wss://${projectRef}.supabase.co/functions/v1/openai-realtime`);
      
      ws.onopen = () => {
        console.log('Connected to OpenAI Realtime');
        setIsConnected(true);
        setIsConnecting(false);
        
        toast({
          title: "Connected",
          description: "OpenAI Realtime is ready",
        });
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'response.audio.delta') {
          handleSpeakingChange(true);
          // Handle audio playback
        } else if (data.type === 'response.audio.done') {
          handleSpeakingChange(false);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Connection error",
          description: "Failed to connect to OpenAI",
          variant: "destructive",
        });
        setIsConnecting(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        handleSpeakingChange(false);
      };

      wsRef.current = ws;
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Failed to connect",
        description: error instanceof Error ? error.message : "Could not start voice agent",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  }, [model, toast, handleSpeakingChange]);

  const endConversation = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    handleSpeakingChange(false);
    
    toast({
      title: "Disconnected",
      description: "Voice agent stopped",
    });
  }, [toast, handleSpeakingChange]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>OpenAI Realtime Agent</span>
          {isConnected && (
            <span className="text-sm font-normal text-green-500">● Connected</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          {!isConnected ? (
            <Button
              onClick={startConversation}
              disabled={isConnecting}
              size="lg"
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Start Conversation
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={endConversation}
                variant="destructive"
                size="lg"
                className="w-full"
              >
                <MicOff className="mr-2 h-4 w-4" />
                End Conversation
              </Button>
              
              {isSpeaking && (
                <div className="text-sm text-muted-foreground animate-pulse">
                  Speaking...
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
