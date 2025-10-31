import React, { useEffect, useState } from 'react';
import { ElevenLabsVoiceAgent } from '@/components/ElevenLabsVoiceAgent';
import { OpenAIRealtimeAgent } from '@/components/OpenAIRealtimeAgent';
import { VapiAgent } from '@/components/VapiAgent';
import { configurationService, VoiceProvider } from '@/services/configurationService';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface VoiceProviderWrapperProps {
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onAudioStreamAvailable?: (audioStream: MediaStream) => void;
}

export function VoiceProviderWrapper({ 
  onSpeakingChange, 
  onAudioStreamAvailable 
}: VoiceProviderWrapperProps) {
  const [provider, setProvider] = useState<VoiceProvider>(configurationService.getConfig().voice_provider);
  const [config, setConfig] = useState(configurationService.getConfig());

  useEffect(() => {
    const unsubscribe = configurationService.subscribe((newConfig) => {
      setProvider(newConfig.voice_provider);
      setConfig(newConfig);
    });

    return () => unsubscribe();
  }, []);

  // Validate configuration
  const isConfigValid = () => {
    if (provider === 'elevenlabs' && !config.elevenlabs_agent_id) return false;
    if (provider === 'vapi' && !config.vapi_assistant_id) return false;
    return true;
  };

  if (!isConfigValid()) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Voice provider not configured. Please configure {provider.toUpperCase()} settings in Admin panel.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  switch (provider) {
    case 'elevenlabs':
      return (
        <ElevenLabsVoiceAgent
          agentId={config.elevenlabs_agent_id}
          onSpeakingChange={onSpeakingChange}
          onAudioStreamAvailable={onAudioStreamAvailable}
        />
      );

    case 'openai':
      return (
        <OpenAIRealtimeAgent
          model={config.openai_model}
          onSpeakingChange={onSpeakingChange}
        />
      );

    case 'vapi':
      return (
        <VapiAgent
          assistantId={config.vapi_assistant_id}
          onSpeakingChange={onSpeakingChange}
        />
      );

    default:
      return (
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Unknown voice provider: {provider}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
  }
}
