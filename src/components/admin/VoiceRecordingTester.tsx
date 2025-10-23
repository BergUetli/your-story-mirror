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
import { conversationRecordingService } from '@/services/conversationRecording';
import { enhancedConversationRecordingService } from '@/services/enhancedConversationRecording';
import { voiceService } from '@/services/voiceService';
import { diagnosticLogger } from '@/services/diagnosticLogger';
import { Link } from 'react-router-dom';

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
  
  // Microphone test state
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micTestTime, setMicTestTime] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [maxVolumeReached, setMaxVolumeReached] = useState(0);
  
// Audio state
const [hasRecording, setHasRecording] = useState(false);
const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
const [audioUrl, setAudioUrl] = useState<string | null>(null);

// End-to-end (merged) test state
const [isE2ETesting, setIsE2ETesting] = useState(false);
const [e2eStatus, setE2eStatus] = useState<string | null>(null);
const [e2eSessionId, setE2eSessionId] = useState<string | null>(null);
const [e2eAudioUrl, setE2eAudioUrl] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingChunks = useRef<Blob[]>([]);
  const micTestTimerRef = useRef<NodeJS.Timeout | null>(null);
  const volumeAnalyzerRef = useRef<AnalyserNode | null>(null);
  const volumeAnimationRef = useRef<number | null>(null);

  const MAX_RECORDING_TIME = 10; // 10 seconds max
  const MIC_TEST_DURATION = 10; // 10 seconds for microphone test

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (micTestTimerRef.current) {
        clearInterval(micTestTimerRef.current);
      }
      if (volumeAnimationRef.current) {
        cancelAnimationFrame(volumeAnimationRef.current);
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

  // Enhanced microphone test with volume visualization
  const testMicrophone = async () => {
    if (isMicTesting) {
      // Stop current test
      stopMicTest();
      return;
    }
    
    setMicTestResult({ type: 'mic', status: 'testing', message: `Testing microphone for ${MIC_TEST_DURATION} seconds... Speak into your microphone!`, timestamp: new Date() });
    setIsMicTesting(true);
    setMicTestTime(0);
    setVolumeLevel(0);
    setMaxVolumeReached(0);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });
      
      streamRef.current = stream;
      
      // Set up audio analysis with proper browser compatibility
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume AudioContext if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      // Configure analyser for better responsiveness
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      source.connect(analyser);
      volumeAnalyzerRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let audioDetected = false;
      let peakVolume = 0;
      
      // Real-time volume monitoring
      const updateVolume = () => {
        if (!isMicTesting || !analyser) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate RMS (Root Mean Square) for better volume representation
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        
        // Convert to percentage (0-100)
        const volumePercent = Math.min(100, (rms / 128) * 100);
        setVolumeLevel(volumePercent);
        
        // Track peak volume
        if (volumePercent > peakVolume) {
          peakVolume = volumePercent;
          setMaxVolumeReached(peakVolume);
        }
        
        // Consider audio detected if volume is above threshold
        if (volumePercent > 5) {
          audioDetected = true;
        }
        
        volumeAnimationRef.current = requestAnimationFrame(updateVolume);
      };
      
      // Start volume monitoring
      updateVolume();
      
      // Timer for test duration
      micTestTimerRef.current = setInterval(() => {
        setMicTestTime(prev => {
          const newTime = prev + 1;
          if (newTime >= MIC_TEST_DURATION) {
            stopMicTest(audioDetected, peakVolume, audioContext);
            return MIC_TEST_DURATION;
          }
          return newTime;
        });
      }, 1000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMicTestResult({ 
        type: 'mic', 
        status: 'error', 
        message: `Microphone test failed: ${errorMessage}`, 
        timestamp: new Date() 
      });
      setIsMicTesting(false);
      
      toast({
        title: 'Microphone Test Failed',
        description: 'Please check your microphone permissions and try again.',
        variant: 'destructive'
      });
    }
  };
  
  // Stop microphone test
  const stopMicTest = (audioDetected?: boolean, peakVolume?: number, audioContext?: AudioContext) => {
    setIsMicTesting(false);
    
    if (micTestTimerRef.current) {
      clearInterval(micTestTimerRef.current);
      micTestTimerRef.current = null;
    }
    
    if (volumeAnimationRef.current) {
      cancelAnimationFrame(volumeAnimationRef.current);
      volumeAnimationRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContext) {
      audioContext.close();
    }
    
    // Only set result if we have the test data (not manual stop)
    if (audioDetected !== undefined && peakVolume !== undefined) {
      if (audioDetected && peakVolume > 5) {
        setMicTestResult({ 
          type: 'mic', 
          status: 'success', 
          message: `Microphone is working perfectly! Peak volume: ${peakVolume.toFixed(1)}%`, 
          timestamp: new Date() 
        });
        toast({
          title: 'Microphone Test Passed',
          description: `Peak volume reached: ${peakVolume.toFixed(1)}%`,
        });
      } else if (audioDetected) {
        setMicTestResult({ 
          type: 'mic', 
          status: 'success', 
          message: `Microphone detected audio but volume was low. Peak: ${peakVolume.toFixed(1)}%`, 
          timestamp: new Date() 
        });
      } else {
        setMicTestResult({ 
          type: 'mic', 
          status: 'error', 
          message: `No audio input detected. Please speak louder or check microphone.`, 
          timestamp: new Date() 
        });
      }
    }
  };

  // Test speakers/headphones
  const testSpeakers = async () => {
    setSpeakerTestResult({ type: 'speakers', status: 'testing', message: 'Playing test tone...', timestamp: new Date() });
    
    try {
      // Create a simple test tone with proper browser compatibility
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume AudioContext if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
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

// End-to-End merged audio test (records mic + AI voice, saves to archive, verifies retrieval)
const runEndToEndTest = async () => {
  if (isE2ETesting) return;
  try {
    setIsE2ETesting(true);
    setE2eStatus('Starting end-to-end enhanced recording...');
    setE2eAudioUrl(null);

    const recordingUserId = user?.id || `guest-${Date.now()}`;
    diagnosticLogger.logInfo('voice_recording', 'e2e_test_started', { userId: recordingUserId });

    // Start enhanced recording (microphone only, we'll capture AI audio internally)
    const sessionId = await enhancedConversationRecordingService.startEnhancedRecording(
      recordingUserId, 
      'diagnostics_end_to_end',
      { enableSystemAudio: false }
    );
    setE2eSessionId(sessionId);

    setE2eStatus('Recording user audio...');
    // Wait 2 seconds for user to say something
    await new Promise(resolve => setTimeout(resolve, 2000));

    setE2eStatus('Playing AI voice and capturing...');
    // Play TTS - the audio will be captured via agentAudioChunks
    const testText = "This is Solin. End-to-end enhanced audio test. You should hear both our voices in the saved file.";
    
    // Simulate capturing agent audio chunks (in real scenario this happens via onMessage)
    // For testing, we'll use voiceService which should trigger the same capture
    await voiceService.speak(testText);
    
    // Add transcript for the AI speech
    enhancedConversationRecordingService.addEnhancedTranscriptEntry('ai', testText, 1.0);
    
    // Wait for speech to finish
    await new Promise(resolve => setTimeout(resolve, 3000));

    setE2eStatus('Stopping and processing recording...');
    await enhancedConversationRecordingService.stopEnhancedRecording();

    // Verify the recording was saved
    setE2eStatus('Verifying archive entry...');
    await new Promise((r) => setTimeout(r, 1000));

    const { data: rec, error } = await supabase
      .from('voice_recordings')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !rec) {
      diagnosticLogger.logError('archive_display', 'e2e_record_not_found', { error: error?.message, sessionId });
      setE2eStatus('Failed: record not found in database.');
      toast({ title: 'End-to-End Test Failed', description: 'Recording metadata not found.', variant: 'destructive' });
      return;
    }

    console.log('📊 E2E Test - Recording data:', {
      id: rec.id,
      session_id: rec.session_id,
      storage_path: rec.storage_path,
      memory_titles: rec.memory_titles,
      transcript_summary: rec.transcript_summary?.substring(0, 100)
    });

    let signedUrl: string | null = null;
    if (rec.storage_path) {
      const { data: signed } = await supabase.storage
        .from('voice-recordings')
        .createSignedUrl(rec.storage_path, 3600);
      signedUrl = signed?.signedUrl || null;
    }

    if (signedUrl) {
      setE2eAudioUrl(signedUrl);
      const titleInfo = rec.memory_titles && rec.memory_titles.length > 0 
        ? ` Title: "${rec.memory_titles[0]}"` 
        : ' (no title set)';
      setE2eStatus(`Success: saved and playable.${titleInfo} Open Archive to view.`);
      diagnosticLogger.logInfo('archive_display', 'e2e_success', { 
        sessionId, 
        recordingId: rec.id, 
        storage_path: rec.storage_path,
        memory_titles: rec.memory_titles
      });
      toast({ 
        title: 'End-to-End Test Passed', 
        description: `Enhanced recording saved to Archive.${titleInfo}`, 
      });
    } else {
      setE2eStatus('Saved metadata, but audio file URL missing.');
      diagnosticLogger.logWarn('archive_display', 'e2e_missing_audio', { sessionId, recordingId: rec.id });
      toast({ title: 'Partial Success', description: 'Metadata saved but audio not available.', variant: 'default' });
    }
  } catch (err: any) {
    console.error('E2E test error:', err);
    diagnosticLogger.logError('system', 'e2e_test_error', { error: err?.message });
    setE2eStatus(`Failed: ${err?.message || 'Unknown error'}`);
    toast({ title: 'End-To-End Test Error', description: String(err?.message || err), variant: 'destructive' });
  } finally {
    setIsE2ETesting(false);
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

      {/* End-to-End Merged Audio Test */}
      <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TestTube className="h-4 w-4 text-purple-400" />
              End-to-End Merged Recording Test
            </CardTitle>
            <Link to="/archive" target="_blank">
              <Button variant="outline" size="sm">
                Open Archive →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-300">
            Complete test: Records mic + AI voice → Saves to storage → Verifies archive retrieval
          </p>
          
          <Button
            onClick={runEndToEndTest}
            disabled={isE2ETesting}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isE2ETesting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Running E2E Test...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Run End-to-End Test
              </>
            )}
          </Button>

          {e2eStatus && (
            <div className="p-3 rounded bg-slate-800/50 border border-slate-700">
              <p className="text-sm font-mono text-slate-200">{e2eStatus}</p>
            </div>
          )}

          {e2eAudioUrl && (
            <div className="space-y-2 p-3 rounded bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-4 w-4" />
                <p className="text-sm font-semibold">Recording saved successfully!</p>
              </div>
              <audio controls src={e2eAudioUrl} className="w-full" />
              {e2eSessionId && (
                <p className="text-xs text-slate-400">Session ID: {e2eSessionId}</p>
              )}
            </div>
          )}

          <Alert className="border-purple-500/20 bg-purple-500/10">
            <AlertTriangle className="h-4 w-4 text-purple-400" />
            <AlertDescription className="text-purple-200 text-xs">
              <strong>Note:</strong> For merged recording to work, you must share tab audio when prompted by your browser.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      
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
              className="w-full"
              variant="outline"
            >
              {isMicTesting ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop Test
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Test Microphone ({MIC_TEST_DURATION}s)
                </>
              )}
            </Button>
            
            {/* Live Volume Visualization */}
            {isMicTesting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Volume Level</span>
                  <span>{micTestTime}s / {MIC_TEST_DURATION}s</span>
                </div>
                
                {/* Volume Meter */}
                <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-75 ${
                      volumeLevel < 30 ? 'bg-green-500' :
                      volumeLevel < 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${volumeLevel}%` }}
                  />
                </div>
                
                {/* Volume Indicators */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-400">Good</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-yellow-400">Loud</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-red-400">Peak</span>
                  </div>
                </div>
                
                {/* Current and Peak Volume */}
                <div className="text-xs text-slate-400 text-center">
                  Current: {volumeLevel.toFixed(1)}% | Peak: {maxVolumeReached.toFixed(1)}%
                </div>
                
                {/* Test Progress */}
                <Progress 
                  value={(micTestTime / MIC_TEST_DURATION) * 100} 
                  className="w-full h-1"
                />
                
                <p className="text-xs text-blue-300 text-center">
                  🎤 Speak normally into your microphone to test volume levels
                </p>
              </div>
            )}
            
            {/* Test Instructions */}
            {!isMicTesting && !micTestResult && (
              <p className="text-xs text-slate-400">
                This will test your microphone for {MIC_TEST_DURATION} seconds with real-time volume visualization.
              </p>
            )}
            
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