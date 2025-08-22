import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { voiceService, VOICES } from '@/services/voiceService';
import { useToast } from '@/hooks/use-toast';

export function VoiceTestSimple() {
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  const testElevenLabs = async () => {
    if (isPlaying) {
      voiceService.stop();
      setIsPlaying(false);
      return;
    }

    try {
      setIsPlaying(true);
      toast({
        title: "Testing ElevenLabs TTS",
        description: "Generating speech with Rachel voice..."
      });

      // Use Rachel voice (EXAVITQu4vr4xnSDxMaL - Sarah voice)
      await voiceService.speak("Hello! This is a test of ElevenLabs text-to-speech integration. The voice should sound clear and natural.", {
        voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah voice
        model: 'eleven_turbo_v2_5'
      });

      toast({
        title: "Success!",
        description: "ElevenLabs TTS is working correctly.",
        variant: "default"
      });
    } catch (error) {
      console.error('Voice test failed:', error);
      toast({
        title: "TTS Test Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">ElevenLabs TTS Test</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Test the ElevenLabs integration with a sample phrase using Sarah's voice.
      </p>
      <Button 
        onClick={testElevenLabs}
        disabled={isPlaying}
        className="w-full"
      >
        {isPlaying ? 'Playing...' : 'Test ElevenLabs TTS'}
      </Button>
    </div>
  );
}