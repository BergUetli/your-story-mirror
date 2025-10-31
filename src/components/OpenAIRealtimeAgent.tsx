import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AudioRecorder, encodeAudioForAPI, playAudioData } from '@/utils/RealtimeAudio';

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
  const recorderRef = useRef<AudioRecorder | null>(null);

  const handleSpeakingChange = useCallback((speaking: boolean) => {
    setIsSpeaking(speaking);
    onSpeakingChange?.(speaking);
  }, [onSpeakingChange]);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    
    try {
      // Initialize audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      // Connect to WebSocket
      const ws = new WebSocket('wss://gulydhhzwlltkxbfnclu.supabase.co/functions/v1/openai-realtime');
      
      ws.onopen = async () => {
        console.log('✅ Connected to OpenAI Realtime');
        setIsConnected(true);
        setIsConnecting(false);
        
        // Wait for session.created event before sending session.update
        const sessionCreatedPromise = new Promise((resolve) => {
          const handler = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.type === 'session.created') {
              ws.removeEventListener('message', handler);
              resolve(data);
            }
          };
          ws.addEventListener('message', handler);
        });

        await sessionCreatedPromise;

        // Send session configuration
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are Solin, a helpful AI memory companion. Help users reflect on and preserve their memories.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            },
            temperature: 0.8,
            max_response_output_tokens: 'inf'
          }
        }));

        // Start audio recording
        recorderRef.current = new AudioRecorder((audioData) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: encodeAudioForAPI(audioData)
            }));
          }
        });
        await recorderRef.current.start();
        
        toast({
          title: "Connected",
          description: "OpenAI Realtime is ready",
        });
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('📨 Received event:', data.type);
        
        if (data.type === 'response.audio.delta' && audioContextRef.current) {
          handleSpeakingChange(true);
          const binaryString = atob(data.delta);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          await playAudioData(audioContextRef.current, bytes);
        } else if (data.type === 'response.audio.done') {
          handleSpeakingChange(false);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        toast({
          title: "Connection error",
          description: "Failed to connect to OpenAI",
          variant: "destructive",
        });
        setIsConnecting(false);
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        setIsConnected(false);
        handleSpeakingChange(false);
        recorderRef.current?.stop();
      };

      wsRef.current = ws;
      
    } catch (error) {
      console.error('❌ Error starting conversation:', error);
      toast({
        title: "Failed to connect",
        description: error instanceof Error ? error.message : "Could not start voice agent",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  }, [model, toast, handleSpeakingChange]);

  const endConversation = useCallback(() => {
    recorderRef.current?.stop();
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
      recorderRef.current?.stop();
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
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
