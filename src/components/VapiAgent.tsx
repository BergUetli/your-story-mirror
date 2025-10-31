import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VapiAgentProps {
  assistantId: string;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

export function VapiAgent({ assistantId, onSpeakingChange }: VapiAgentProps) {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeakingChange = useCallback((speaking: boolean) => {
    setIsSpeaking(speaking);
    onSpeakingChange?.(speaking);
  }, [onSpeakingChange]);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    
    try {
      // Get microphone access
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // This would initialize VAPI SDK
      // For now, showing the structure
      
      setIsConnected(true);
      setIsConnecting(false);
      
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
    // Stop VAPI connection
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
