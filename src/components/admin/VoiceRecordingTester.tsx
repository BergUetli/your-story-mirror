import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  MicOff,
  Play, 
  Pause, 
  Square,
  SkipBack, 
  SkipForward,
  Volume2,
  VolumeX,
  Headphones,
  CheckCircle,
  AlertTriangle,
  Clock,
  TestTube
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AudioTestResult {
  type: 'mic' | 'speakers';
  status: 'success' | 'error' | 'testing';
  message: string;
  timestamp: Date;
}

export const VoiceRecordingTester = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([100]);
  const [isMuted, setIsMuted] = useState(false);
  
  // Test results
  const [micTestResult, setMicTestResult] = useState<AudioTestResult | null>(null);
  const [speakerTestResult, setSpeakerTestResult] = useState<AudioTestResult | null>(null);
  const [recordingTestResult, setRecordingTestResult] = useState<AudioTestResult | null>(null);
  
  // Audio state
  const [hasRecording, setHasRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingChunks = useRef<Blob[]>([]);

  const MAX_RECORDING_TIME = 10; // 10 seconds max

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Format time helper
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Test microphone access
  const testMicrophone = async () => {
    setMicTestResult({ type: 'mic', status: 'testing', message: 'Testing microphone access...', timestamp: new Date() });
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });
      
      // Test if we can access audio data
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      // Check for audio input for 2 seconds
      let audioDetected = false;
      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        if (average > 10) { // Threshold for detecting audio
          audioDetected = true;
        }
      };
      
      const checkInterval = setInterval(checkAudio, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        
        if (audioDetected) {
          setMicTestResult({ 
            type: 'mic', 
            status: 'success', 
            message: 'Microphone is working! Audio input detected.', 
            timestamp: new Date() 
          });
          toast({
            title: 'Microphone Test Passed',
            description: 'Your microphone is working correctly.',
          });
        } else {
          setMicTestResult({ 
            type: 'mic', 
            status: 'error', 
            message: 'Microphone detected but no audio input. Try speaking during the test.', 
            timestamp: new Date() 
          });
        }
      }, 2000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMicTestResult({ 
        type: 'mic', 
        status: 'error', 
        message: `Microphone test failed: ${errorMessage}`, 
        timestamp: new Date() 
      });
      
      toast({
        title: 'Microphone Test Failed',
        description: 'Please check your microphone permissions and try again.',
        variant: 'destructive'
      });
    }
  };

  // Test speakers/headphones
  const testSpeakers = async () => {
    setSpeakerTestResult({ type: 'speakers', status: 'testing', message: 'Playing test tone...', timestamp: new Date() });
    
    try {
      // Create a simple test tone
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Low volume
      
      oscillator.start();
      
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
        
        setSpeakerTestResult({ 
          type: 'speakers', 
          status: 'success', 
          message: 'Test tone played successfully. Did you hear it?', 
          timestamp: new Date() 
        });
        
        toast({
          title: 'Speaker Test Complete',
          description: 'If you heard the test tone, your speakers/headphones are working.',
        });
      }, 1000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSpeakerTestResult({ 
        type: 'speakers', 
        status: 'error', 
        message: `Speaker test failed: ${errorMessage}`, 
        timestamp: new Date() 
      });
      
      toast({
        title: 'Speaker Test Failed',
        description: 'Unable to play test tone. Check your audio output settings.',
        variant: 'destructive'
      });
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Clear previous recording
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setAudioBlob(null);
      setHasRecording(false);
      recordingChunks.current = [];
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });
      
      streamRef.current = stream;
      
      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 64000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunks.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordingChunks.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setHasRecording(true);
        
        // Save to storage for testing
        if (user) {
          await saveTestRecording(blob);
        }
        
        setRecordingTestResult({
          type: 'mic',
          status: 'success',
          message: `Recording saved (${formatTime(recordingTime)})`,
          timestamp: new Date()
        });
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-stop at max time
          if (newTime >= MAX_RECORDING_TIME) {
            stopRecording();
            return MAX_RECORDING_TIME;
          }
          return newTime;
        });
      }, 1000);
      
      toast({
        title: 'Recording Started',
        description: `Maximum recording time: ${MAX_RECORDING_TIME} seconds`,
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setRecordingTestResult({
        type: 'mic',
        status: 'error',
        message: `Recording failed: ${errorMessage}`,
        timestamp: new Date()
      });
      
      toast({
        title: 'Recording Failed',
        description: 'Please check your microphone permissions.',
        variant: 'destructive'
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  // Save test recording to storage
  const saveTestRecording = async (blob: Blob) => {
    if (!user) return;
    
    try {
      const fileName = `test-recording-${user.id}-${Date.now()}.webm`;
      const filePath = `${user.id}/${fileName}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('voice-recordings')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadError) {
        console.warn('Failed to save test recording to storage:', uploadError);
      } else {
        console.log('Test recording saved to storage:', filePath);
      }
    } catch (error) {
      console.warn('Error saving test recording:', error);
    }
  };

  // Play/pause recording
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  // Seek functions
  const seekBackward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
  };

  const seekForward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5);
  };

  // Handle audio events
  const handleAudioLoad = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Handle volume change
  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume[0] / 100;
    }
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-slate-200 flex items-center gap-2">
        <TestTube className="h-4 w-4" />
        Voice Recording & Audio Testing
      </h4>
      
      {/* Hardware Tests */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Microphone Test */}
        <Card className="bg-slate-900/50 border-slate-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mic className="h-4 w-4 text-blue-400" />
              Microphone Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={testMicrophone}
              disabled={micTestResult?.status === 'testing'}
              className="w-full"
              variant="outline"
            >
              {micTestResult?.status === 'testing' ? (
                <>
                  <Mic className="h-4 w-4 mr-2 animate-pulse" />
                  Testing...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Test Microphone
                </>
              )}
            </Button>
            
            {micTestResult && (
              <div className={`flex items-start gap-2 p-2 rounded text-xs ${
                micTestResult.status === 'success' ? 'bg-green-500/10 text-green-200' :
                micTestResult.status === 'error' ? 'bg-red-500/10 text-red-200' :
                'bg-blue-500/10 text-blue-200'
              }`}>
                {micTestResult.status === 'success' ? (
                  <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                ) : micTestResult.status === 'error' ? (
                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                ) : (
                  <Clock className="h-3 w-3 mt-0.5 flex-shrink-0 animate-pulse" />
                )}
                <span>{micTestResult.message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Speaker/Headphone Test */}
        <Card className="bg-slate-900/50 border-slate-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Headphones className="h-4 w-4 text-green-400" />
              Speaker Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={testSpeakers}
              disabled={speakerTestResult?.status === 'testing'}
              className="w-full"
              variant="outline"
            >
              {speakerTestResult?.status === 'testing' ? (
                <>
                  <Volume2 className="h-4 w-4 mr-2 animate-pulse" />
                  Playing...
                </>
              ) : (
                <>
                  <Headphones className="h-4 w-4 mr-2" />
                  Test Speakers
                </>
              )}
            </Button>
            
            {speakerTestResult && (
              <div className={`flex items-start gap-2 p-2 rounded text-xs ${
                speakerTestResult.status === 'success' ? 'bg-green-500/10 text-green-200' :
                speakerTestResult.status === 'error' ? 'bg-red-500/10 text-red-200' :
                'bg-blue-500/10 text-blue-200'
              }`}>
                {speakerTestResult.status === 'success' ? (
                  <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                ) : speakerTestResult.status === 'error' ? (
                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                ) : (
                  <Clock className="h-3 w-3 mt-0.5 flex-shrink-0 animate-pulse" />
                )}
                <span>{speakerTestResult.message}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Voice Recording Test */}
      <Card className="bg-slate-900/50 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Mic className="h-4 w-4 text-red-400" />
            Voice Recording Test
            <Badge variant="outline" className="ml-auto text-xs">
              Max {MAX_RECORDING_TIME}s
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recording Controls */}
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <Button 
                onClick={startRecording}
                className="bg-red-600 hover:bg-red-700"
              >
                <Mic className="h-4 w-4 mr-2" />
                Record
              </Button>
            ) : (
              <Button 
                onClick={stopRecording}
                className="bg-red-600 hover:bg-red-700"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            )}
            
            {isRecording && (
              <div className="flex items-center gap-2 text-red-400">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                <span className="font-mono text-sm">
                  {formatTime(recordingTime)} / {formatTime(MAX_RECORDING_TIME)}
                </span>
              </div>
            )}
          </div>

          {/* Recording Progress */}
          {isRecording && (
            <Progress 
              value={(recordingTime / MAX_RECORDING_TIME) * 100} 
              className="w-full"
            />
          )}

          {/* Playback Controls */}
          {hasRecording && audioUrl && (
            <>
              <div className="border-t border-slate-700 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    onClick={seekBackward}
                    variant="outline"
                    size="sm"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={togglePlayback}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    onClick={seekForward}
                    variant="outline"
                    size="sm"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      onClick={toggleMute}
                      variant="outline"
                      size="sm"
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <div className="w-20">
                      <Slider
                        value={volume}
                        onValueChange={handleVolumeChange}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Time Display */}
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span className="font-mono">{formatTime(currentTime)}</span>
                  <span className="font-mono">{formatTime(duration)}</span>
                </div>
              </div>
              
              {/* Hidden audio element */}
              <audio
                ref={audioRef}
                src={audioUrl}
                onLoadedMetadata={handleAudioLoad}
                onTimeUpdate={handleTimeUpdate}
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleEnded}
                style={{ display: 'none' }}
              />
            </>
          )}

          {/* Recording Status */}
          {recordingTestResult && (
            <div className={`flex items-start gap-2 p-3 rounded ${
              recordingTestResult.status === 'success' ? 'bg-green-500/10 text-green-200' :
              'bg-red-500/10 text-red-200'
            }`}>
              {recordingTestResult.status === 'success' ? (
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              )}
              <span className="text-sm">{recordingTestResult.message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Testing Instructions */}
      <Alert className="border-blue-500/20 bg-blue-500/10">
        <TestTube className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-200">
          <strong>Testing Instructions:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
            <li>Test your microphone first to ensure audio input works</li>
            <li>Test your speakers/headphones to verify audio output</li>
            <li>Record a short test message and play it back</li>
            <li>If all tests pass, your audio setup is ready for Solin conversations!</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default VoiceRecordingTester;