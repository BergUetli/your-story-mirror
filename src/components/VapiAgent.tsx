import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Vapi from '@vapi-ai/web';

interface VapiAgentProps {
  assistantId: string;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

export function VapiAgent({ assistantId, onSpeakingChange }: VapiAgentProps) {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);

  const handleSpeakingChange = useCallback((speaking: boolean) => {
    setIsSpeaking(speaking);
    onSpeakingChange?.(speaking);
  }, [onSpeakingChange]);

  useEffect(() => {
    // Initialize VAPI client with environment variable
    const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY;
    
    if (!VAPI_PUBLIC_KEY) {
      console.error('❌ VAPI_PUBLIC_KEY not configured');
      toast({
        title: "Configuration Error",
        description: "VAPI public key not configured. Please add it to environment variables.",
        variant: "destructive",
      });
      return;
    }
    
    vapiRef.current = new Vapi(VAPI_PUBLIC_KEY);

    // Set up event listeners
    vapiRef.current.on('call-start', () => {
      console.log('✅ VAPI call started');
      setIsConnected(true);
      setIsConnecting(false);
    });

    vapiRef.current.on('call-end', () => {
      console.log('🔌 VAPI call ended');
      setIsConnected(false);
      handleSpeakingChange(false);
    });

    vapiRef.current.on('speech-start', () => {
      console.log('🗣️ VAPI speech started');
      handleSpeakingChange(true);
    });

    vapiRef.current.on('speech-end', () => {
      console.log('🤐 VAPI speech ended');
      handleSpeakingChange(false);
    });

    vapiRef.current.on('error', (error: any) => {
      console.error('❌ VAPI error:', error);
      toast({
        title: "VAPI Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    });

    return () => {
      vapiRef.current?.stop();
    };
  }, [handleSpeakingChange, toast]);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    
    try {
      if (!vapiRef.current) {
        throw new Error('VAPI not initialized');
      }

      // Fetch personalized session data
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
        'vapi-session'
      );

      if (sessionError) {
        console.warn('Failed to fetch session data, continuing with defaults:', sessionError);
      }

      console.log('✅ Starting VAPI with personalized context');

      // Start VAPI with assistant configuration
      await vapiRef.current.start(assistantId, {
        // VAPI will use the assistant's configured prompt, but we can pass metadata
        metadata: sessionData ? {
          userName: sessionData.userName,
          context: sessionData.context
        } : undefined
      });
      
      toast({
        title: "Connected",
        description: "VAPI agent is ready",
      });
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Failed to connect",
        description: error instanceof Error ? error.message : "Could not start voice agent",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  }, [assistantId, toast]);

  const endConversation = useCallback(() => {
    vapiRef.current?.stop();
    setIsConnected(false);
    handleSpeakingChange(false);
    
    toast({
      title: "Disconnected",
      description: "Voice agent stopped",
    });
  }, [toast, handleSpeakingChange]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>VAPI Agent</span>
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
