import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Square, Volume2 } from 'lucide-react';
import { voiceService, VOICES } from '@/services/voiceService';
import { useToast } from '@/hooks/use-toast';

const VoiceTest = () => {
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [testText, setTestText] = useState('Hello! I am testing different voices in your memory sanctuary. Each voice should sound distinctly different.');
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  const handlePlayVoice = async () => {
    if (isPlaying) {
      voiceService.stop();
      setIsPlaying(false);
      return;
    }

    try {
      setIsPlaying(true);
      
      const voice = VOICES.find(v => v.id === selectedVoice);
      toast({
        title: `Playing ${voice?.name}`,
        description: voice?.description,
      });

      await voiceService.speak(testText, { voiceId: selectedVoice });
    } catch (error) {
      console.error('Voice test error:', error);
      toast({
        title: 'Voice test failed',
        description: 'Check console for details',
        variant: 'destructive'
      });
    } finally {
      setIsPlaying(false);
    }
  };

  const testAllVoices = async () => {
    for (const voice of VOICES) {
      setSelectedVoice(voice.id);
      toast({
        title: `Testing ${voice.name}`,
        description: voice.description,
      });
      
      try {
        await voiceService.speak(`Hi, I'm ${voice.name}. ${voice.description}`, { voiceId: voice.id });
        // Wait a bit between voices
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error testing voice ${voice.name}:`, error);
      }
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Voice Test Interface
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="voice-select">Select Voice</Label>
          <Select value={selectedVoice} onValueChange={setSelectedVoice}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a voice" />
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

        <div className="space-y-2">
          <Label htmlFor="test-text">Test Text</Label>
          <Input
            id="test-text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Enter text to test with different voices..."
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handlePlayVoice} disabled={!testText.trim()}>
            {isPlaying ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isPlaying ? 'Stop' : 'Test Voice'}
          </Button>
          
          <Button variant="outline" onClick={testAllVoices} disabled={isPlaying}>
            Test All Voices
          </Button>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Expected behavior:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Each voice should sound distinctly different</li>
            <li>You should hear high-quality ElevenLabs audio (not browser TTS)</li>
            <li>Check browser console for any ElevenLabs errors</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceTest;