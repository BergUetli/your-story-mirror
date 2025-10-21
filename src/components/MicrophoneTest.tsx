/**
 * MICROPHONE TEST COMPONENT
 * 
 * Advanced microphone testing with real-time volume visualization
 * - Extended test duration (30+ seconds)
 * - Real-time volume level display
 * - Audio quality metrics
 * - Permission diagnostics
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, AlertTriangle, CheckCircle, Play, Square } from 'lucide-react';

interface MicrophoneTestProps {
  onTestComplete?: (results: MicTestResults) => void;
  duration?: number; // Test duration in seconds (default 30)
}

interface MicTestResults {
  hasPermission: boolean;
  averageVolume: number;
  maxVolume: number;
  qualityScore: number; // 0-100
  sampleRate?: number;
  channelCount?: number;
  deviceLabel?: string;
  recommendations: string[];
}

export const MicrophoneTest: React.FC<MicrophoneTestProps> = ({ 
  onTestComplete, 
  duration = 30 
}) => {
  const [isTestActive, setIsTestActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [testResults, setTestResults] = useState<MicTestResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Audio analysis refs
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const testTimerRef = useRef<number | null>(null);

  // Volume tracking
  const volumeHistoryRef = useRef<number[]>([]);
  const maxVolumeRef = useRef(0);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (testTimerRef.current) {
      clearInterval(testTimerRef.current);
      testTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  // Analyze audio volume in real-time
  const analyzeAudio = useCallback(() => {
    if (!analyzerRef.current) return;

    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Use time domain data for better volume detection (more sensitive to speech)
    analyzerRef.current.getByteTimeDomainData(dataArray);
    
    // Calculate RMS volume from time domain data
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const amplitude = (dataArray[i] - 128) / 128; // Convert to -1 to 1 range
      sum += amplitude * amplitude;
    }
    const rms = Math.sqrt(sum / bufferLength);
    const volume = Math.min(100, rms * 100 * 5); // Increased scaling for better sensitivity

    setCurrentVolume(volume);
    volumeHistoryRef.current.push(volume);
    maxVolumeRef.current = Math.max(maxVolumeRef.current, volume);

    // Keep only last 100 readings to prevent memory issues
    if (volumeHistoryRef.current.length > 100) {
      volumeHistoryRef.current = volumeHistoryRef.current.slice(-100);
    }

    if (isTestActive) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }
  }, [isTestActive]);

  const startTest = async () => {
    try {
      setError(null);
      setIsTestActive(true);
      setTimeRemaining(duration);
      volumeHistoryRef.current = [];
      maxVolumeRef.current = 0;

      console.log('🎤 Starting microphone test...');

      // Request microphone access with high quality settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: { ideal: 48000 },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      setHasPermission(true);

      // Get device info
      const tracks = stream.getAudioTracks();
      const deviceLabel = tracks[0]?.label || 'Unknown microphone';
      
      console.log('🎤 Microphone access granted:', {
        deviceLabel,
        settings: tracks[0]?.getSettings()
      });

      // Set up audio analysis - ensure AudioContext is created after user gesture
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume AudioContext if it's suspended (required by browser policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.3;
      
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      // Start volume analysis
      analyzeAudio();

      // Start countdown timer
      testTimerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            stopTest();
            return 0;
          }
          return newTime;
        });
      }, 1000);

    } catch (err) {
      console.error('❌ Microphone test failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      setHasPermission(false);
      setIsTestActive(false);
    }
  };

  const stopTest = useCallback(() => {
    if (!isTestActive) return;

    console.log('🛑 Stopping microphone test...');
    setIsTestActive(false);

    // Calculate results
    const volumeHistory = volumeHistoryRef.current;
    const averageVolume = volumeHistory.length > 0 
      ? volumeHistory.reduce((sum, vol) => sum + vol, 0) / volumeHistory.length 
      : 0;
    
    const maxVolume = maxVolumeRef.current;
    
    // Calculate quality score based on various factors
    let qualityScore = 0;
    if (averageVolume > 5) qualityScore += 30; // Basic audio detected
    if (averageVolume > 15) qualityScore += 20; // Good average volume
    if (maxVolume > 30) qualityScore += 25; // Can detect loud speech
    if (maxVolume < 90) qualityScore += 25; // Not clipping/distorted
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (averageVolume < 10) {
      recommendations.push('Your microphone may be too quiet. Try speaking louder or adjusting your input level.');
    }
    if (maxVolume > 85) {
      recommendations.push('Your microphone may be too loud. Consider reducing input gain to avoid distortion.');
    }
    if (maxVolume < 20) {
      recommendations.push('Your microphone seems very quiet. Check if it\'s muted or try a different microphone.');
    }
    if (qualityScore > 80) {
      recommendations.push('Great! Your microphone is working well for voice recording.');
    }

    const results: MicTestResults = {
      hasPermission: true,
      averageVolume: Math.round(averageVolume),
      maxVolume: Math.round(maxVolume),
      qualityScore,
      sampleRate: audioContextRef.current?.sampleRate,
      channelCount: streamRef.current?.getAudioTracks()[0]?.getSettings().channelCount,
      deviceLabel: streamRef.current?.getAudioTracks()[0]?.label,
      recommendations
    };

    setTestResults(results);
    onTestComplete?.(results);

    cleanup();
  }, [isTestActive, onTestComplete, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const getVolumeColor = (volume: number) => {
    if (volume < 10) return 'bg-red-500';
    if (volume < 30) return 'bg-yellow-500';
    if (volume < 70) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getQualityBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    if (score >= 40) return <Badge className="bg-orange-100 text-orange-800">Fair</Badge>;
    return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Microphone Test
        </CardTitle>
        <CardDescription>
          Test your microphone quality and volume levels ({duration}s test)
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {hasPermission === null && (
          <div className="text-center space-y-3">
            <Button onClick={startTest} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Start Microphone Test
            </Button>
            <p className="text-sm text-muted-foreground">
              Click to test your microphone for {duration} seconds
            </p>
          </div>
        )}

        {isTestActive && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {timeRemaining}s
              </div>
              <p className="text-sm text-muted-foreground">remaining</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Volume Level</span>
                <span className="text-sm text-muted-foreground">{Math.round(currentVolume)}%</span>
              </div>
              
              <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-100 ${getVolumeColor(currentVolume)}`}
                  style={{ width: `${Math.min(100, currentVolume)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Volume2 className="h-4 w-4 text-white mix-blend-difference" />
                </div>
              </div>
            </div>

            <Button onClick={stopTest} variant="secondary" className="w-full">
              <Square className="h-4 w-4 mr-2" />
              Stop Test Early
            </Button>
          </div>
        )}

        {testResults && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700">Test completed successfully</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Average Volume</div>
                <div className="text-muted-foreground">{testResults.averageVolume}%</div>
              </div>
              <div>
                <div className="font-medium">Max Volume</div>
                <div className="text-muted-foreground">{testResults.maxVolume}%</div>
              </div>
              <div>
                <div className="font-medium">Quality Score</div>
                <div className="text-muted-foreground">{testResults.qualityScore}/100</div>
              </div>
              <div>
                <div className="font-medium">Quality Rating</div>
                <div>{getQualityBadge(testResults.qualityScore)}</div>
              </div>
            </div>

            {testResults.recommendations.length > 0 && (
              <div className="space-y-2">
                <div className="font-medium text-sm">Recommendations:</div>
                <ul className="space-y-1">
                  {testResults.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={() => {
                setHasPermission(null);
                setTestResults(null);
                setError(null);
              }} className="w-full">
                Run Another Test
              </Button>
            </div>
          </div>
        )}

        {hasPermission === false && !error && (
          <div className="text-center space-y-3">
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <MicOff className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-700">Microphone access denied</span>
            </div>
            <Button onClick={startTest} variant="outline" className="w-full">
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MicrophoneTest;