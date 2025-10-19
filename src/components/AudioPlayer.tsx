import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Volume2,
  Clock,
  Calendar,
  FileAudio
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { voiceRecordingService } from '@/services/voiceRecording';

interface TranscriptSegment {
  timestamp: number; // seconds from start
  speaker: 'user' | 'ai';
  text: string;
  isMatch?: boolean;
}

interface AudioPlayerProps {
  recording: any;
  searchQuery?: string;
  autoSeekToMatch?: boolean;
  className?: string;
}

export const AudioPlayer = ({ recording, searchQuery = '', autoSeekToMatch = false, className = '' }: AudioPlayerProps) => {
  const { toast } = useToast();
  
  // Audio playback state
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  
  // Audio refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Parse transcript with timestamps
  const parseTranscript = (transcriptText: string): TranscriptSegment[] => {
    if (!transcriptText) return [];
    
    const lines = transcriptText.split('\n').filter(line => line.trim());
    return lines.map(line => {
      // Parse format: [123s] USER: text or [123s] AI: text
      const match = line.match(/^\[(\d+)s\]\s+(USER|AI):\s+(.+)$/);
      if (match) {
        return {
          timestamp: parseInt(match[1]),
          speaker: match[2].toLowerCase() as 'user' | 'ai',
          text: match[3]
        };
      }
      // Fallback for plain text
      return {
        timestamp: 0,
        speaker: 'user',
        text: line
      };
    });
  };

  // Highlight search matches in transcript
  const highlightMatches = (segments: TranscriptSegment[], query: string): TranscriptSegment[] => {
    if (!query.trim()) return segments;
    
    const queryLower = query.toLowerCase();
    return segments.map(segment => ({
      ...segment,
      isMatch: segment.text.toLowerCase().includes(queryLower)
    }));
  };

  // Load and play audio
  const loadAudio = async () => {
    if (!recording?.storage_path) return;

    setIsLoading(true);
    try {
      // Stop current audio if playing
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      console.log('🎵 Loading audio for playback:', recording.storage_path);
      
      // Check if this is a demo recording (no actual audio file)
      if (recording.storage_path.startsWith('demo/')) {
        console.log('🎭 Demo recording detected - using text-based playback');
        
        // Set duration from metadata and prepare for text-based "playback"
        setDuration(recording.duration_seconds || 60);
        setIsLoading(false);
        
        // Parse transcript for this recording
        const segments = parseTranscript(recording.transcript_text || '');
        const highlightedSegments = highlightMatches(segments, searchQuery);
        setTranscript(highlightedSegments);
        
        toast({
          title: 'Demo Recording Loaded',
          description: 'This demo uses text-based playback. Click play to scroll through the transcript!',
        });
        
        return;
      }
      
      // Get signed URL for audio (real recordings)
      const audioUrl = await voiceRecordingService.getAudioUrl(recording.storage_path);
      
      // Create new audio element
      const audio = new Audio(audioUrl);
      audio.preload = 'metadata';
      
      // Setup event listeners
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
        console.log('📊 Audio loaded:', { duration: audio.duration });
      };

      audio.onended = () => {
        setIsPlaying(false);
        if (timeUpdateIntervalRef.current) {
          clearInterval(timeUpdateIntervalRef.current);
        }
      };

      audio.onerror = () => {
        toast({
          title: 'Audio Error',
          description: 'Failed to load audio recording',
          variant: 'destructive'
        });
        setIsPlaying(false);
        setIsLoading(false);
      };

      // Parse transcript for this recording
      const segments = parseTranscript(recording.transcript_text || '');
      const highlightedSegments = highlightMatches(segments, searchQuery);
      setTranscript(highlightedSegments);

      // Set audio reference
      setCurrentAudio(audio);
      audioRef.current = audio;
      
      // Auto-seek to first match if requested
      if (autoSeekToMatch && searchQuery.trim()) {
        const firstMatch = highlightedSegments.find(segment => segment.isMatch);
        if (firstMatch && firstMatch.timestamp > 0) {
          // Seek to a few seconds before the match
          const seekTime = Math.max(0, firstMatch.timestamp - 3);
          audio.currentTime = seekTime;
          setCurrentTime(seekTime);
          console.log(`⏭️ Auto-seeking to match at ${seekTime}s`);
        }
      }

    } catch (error) {
      console.error('❌ Audio loading error:', error);
      toast({
        title: 'Loading Error',
        description: 'Failed to load audio recording',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Demo playback simulation for recordings without audio files
  const startDemoPlayback = () => {
    const totalDuration = recording.duration_seconds || 60;
    const stepSize = totalDuration / 100; // 100 steps for smooth progress
    
    setIsPlaying(true);
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
    }
    
    timeUpdateIntervalRef.current = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + stepSize;
        if (newTime >= totalDuration) {
          clearInterval(timeUpdateIntervalRef.current!);
          setIsPlaying(false);
          return 0; // Reset to start
        }
        return newTime;
      });
    }, 100); // Update every 100ms for smooth progress
  };

  const stopDemoPlayback = () => {
    setIsPlaying(false);
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
    }
  };

  // Play/pause audio
  const togglePlayPause = async () => {
    // Handle demo recordings (no actual audio file)
    if (recording?.storage_path?.startsWith('demo/')) {
      if (isPlaying) {
        stopDemoPlayback();
      } else {
        startDemoPlayback();
        toast({
          title: 'Demo Playback Started',
          description: 'Simulating audio playback with transcript display',
        });
      }
      return;
    }

    // Handle real audio recordings
    if (!currentAudio) {
      await loadAudio();
      return;
    }

    if (isPlaying) {
      currentAudio.pause();
      setIsPlaying(false);
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    } else {
      try {
        await currentAudio.play();
        setIsPlaying(true);

        // Setup time update interval
        if (timeUpdateIntervalRef.current) {
          clearInterval(timeUpdateIntervalRef.current);
        }
        timeUpdateIntervalRef.current = setInterval(() => {
          if (currentAudio && !currentAudio.paused) {
            setCurrentTime(currentAudio.currentTime);
          }
        }, 100);

        toast({
          title: 'Playing Recording',
          description: `From ${new Date(recording.created_at).toLocaleDateString()}`,
        });
      } catch (error) {
        toast({
          title: 'Playback Error',
          description: 'Failed to play audio recording',
          variant: 'destructive'
        });
      }
    }
  };

  // Seek audio
  const seekAudio = (newTime: number) => {
    if (currentAudio) {
      currentAudio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Skip forward/back
  const skipForward = () => {
    if (currentAudio) {
      const newTime = Math.min(currentAudio.duration, currentAudio.currentTime + 10);
      seekAudio(newTime);
    }
  };

  const skipBack = () => {
    if (currentAudio) {
      const newTime = Math.max(0, currentAudio.currentTime - 10);
      seekAudio(newTime);
    }
  };

  // Seek to transcript segment
  const seekToSegment = (segment: TranscriptSegment) => {
    if (currentAudio && segment.timestamp > 0) {
      const seekTime = Math.max(0, segment.timestamp - 1); // 1 second before
      seekAudio(seekTime);
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
      }
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, [currentAudio]);

  return (
    <Card className={`border-primary/20 ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileAudio className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-medium">
                  Voice Recording
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {new Date(recording.created_at).toLocaleDateString()}
                  {duration > 0 && (
                    <>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      {formatTime(duration)}
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Memory Titles */}
            {recording.memory_titles && recording.memory_titles.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {recording.memory_titles.slice(0, 2).map((title: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {title}
                  </Badge>
                ))}
                {recording.memory_titles.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{recording.memory_titles.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Audio Controls */}
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={skipBack}
              disabled={!currentAudio || isLoading}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={togglePlayPause}
              disabled={isLoading}
              className="w-12 h-10"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={skipForward}
              disabled={!currentAudio || isLoading}
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            <div className="flex-1 mx-4">
              <Slider
                value={[currentTime]}
                max={duration}
                step={1}
                onValueChange={(value) => seekAudio(value[0])}
                disabled={!currentAudio || isLoading}
                className="cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[100px]">
              <Volume2 className="w-4 h-4" />
              <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
          </div>

          {/* Conversation Summary */}
          {recording.conversation_summary && (
            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
              <strong>Summary:</strong> {recording.conversation_summary}
            </div>
          )}

          {/* Transcript with clickable segments */}
          {transcript.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Conversation Transcript</h4>
              <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                {transcript.slice(0, 10).map((segment, index) => (
                  <div
                    key={index}
                    onClick={() => seekToSegment(segment)}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      segment.isMatch 
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Badge 
                        variant={segment.speaker === 'user' ? 'default' : 'secondary'}
                        className="text-xs flex-shrink-0"
                      >
                        {segment.speaker === 'user' ? 'You' : 'Solin'}
                      </Badge>
                      {segment.timestamp > 0 && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatTime(segment.timestamp)}
                        </span>
                      )}
                      <span className={segment.isMatch ? 'font-medium' : ''}>
                        {segment.text}
                      </span>
                    </div>
                  </div>
                ))}
                {transcript.length > 10 && (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    ... and {transcript.length - 10} more segments (load audio to see all)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};