import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  ArrowLeft,
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Volume2,
  Clock,
  Calendar,
  Music,
  Loader2,
  FileAudio,
  Database
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { aiVoiceSearchService } from '@/services/aiVoiceSearch';
import type { VoiceSearchResult } from '@/services/aiVoiceSearch';

interface TranscriptSegment {
  timestamp: number;
  speaker: 'user' | 'ai';
  text: string;
}

export default function Archive() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Data state
  const [recordings, setRecordings] = useState<VoiceSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Audio playback state
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<VoiceSearchResult | null>(null);
  
  // Audio refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load all voice recordings
  useEffect(() => {
    if (user?.id) {
      loadVoiceRecordings();
    }
  }, [user?.id]);

  const loadVoiceRecordings = async () => {
    try {
      console.log('📄 Loading voice recordings for Archive...');
      setLoading(true);
      
      const results = await aiVoiceSearchService.getAllVoiceRecordings(user!.id);
      setRecordings(results);
      
      console.log('✅ Loaded recordings:', results.length);
      
      if (results.length === 0) {
        toast({
          title: 'No Voice Recordings',
          description: 'Start conversations with Solin to create voice recordings!',
        });
      }
    } catch (error) {
      console.error('❌ Failed to load recordings:', error);
      toast({
        title: 'Loading Error',
        description: 'Failed to load voice recordings. Please refresh the page.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

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

  // Load and play audio
  const playAudio = async (recording: VoiceSearchResult) => {
    try {
      // Stop current audio if playing
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      console.log('🎵 Loading audio for playback:', recording.storage_path);
      
      // Get signed URL for audio
      const audioUrl = await aiVoiceSearchService.getAudioUrl(recording.storage_path);
      
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
        setPlayingRecordingId(null);
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
        setPlayingRecordingId(null);
      };

      // Parse transcript for this recording
      const segments = parseTranscript(recording.transcript_text || '');
      setTranscript(segments);
      setSelectedRecording(recording);

      // Start playback
      await audio.play();
      setCurrentAudio(audio);
      audioRef.current = audio;
      setIsPlaying(true);
      setPlayingRecordingId(recording.id);

      // Setup time update interval
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
      timeUpdateIntervalRef.current = setInterval(() => {
        if (audio && !audio.paused) {
          setCurrentTime(audio.currentTime);
        }
      }, 100);

      toast({
        title: 'Playing Recording',
        description: `Playing from ${new Date(recording.created_at).toLocaleDateString()}`,
      });

    } catch (error) {
      console.error('❌ Audio playback error:', error);
      toast({
        title: 'Playback Error',
        description: 'Failed to play audio recording',
        variant: 'destructive'
      });
    }
  };

  // Pause/resume audio
  const togglePlayPause = () => {
    if (!currentAudio) return;

    if (isPlaying) {
      currentAudio.pause();
      setIsPlaying(false);
    } else {
      currentAudio.play();
      setIsPlaying(true);
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

  // Format date display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric', 
      year: 'numeric'
    });
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
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b-[1.5px] border-section-border bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/timeline">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Timeline
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-semibold">Archive</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Voice Recording Archive</h2>
          <p className="text-muted-foreground">
            All your conversation recordings with Solin. Click any recording to listen.
          </p>
        </div>

        {/* Audio Player (when audio is selected) */}
        {selectedRecording && (
          <Card className="mb-6 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                Now Playing: {formatDate(selectedRecording.created_at)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                  {selectedRecording.memory_titles && selectedRecording.memory_titles.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">Memory:</span>
                      <Badge variant="outline" className="text-xs">
                        {selectedRecording.memory_titles[0]}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Audio Controls */}
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={skipBack}
                    disabled={!currentAudio}
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={togglePlayPause}
                    disabled={!currentAudio}
                    className="w-12 h-10"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={skipForward}
                    disabled={!currentAudio}
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>

                  <div className="flex-1 mx-4">
                    <Slider
                      value={[currentTime]}
                      max={duration}
                      step={1}
                      onValueChange={(value) => seekAudio(value[0])}
                      disabled={!currentAudio}
                      className="cursor-pointer"
                    />
                  </div>

                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                </div>

                {/* Transcript with clickable segments */}
                {transcript.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Conversation Transcript</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                      {transcript.map((segment, index) => (
                        <div
                          key={index}
                          onClick={() => seekToSegment(segment)}
                          className="p-2 rounded cursor-pointer transition-colors hover:bg-muted/50"
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
                            <span>{segment.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-2" />
            <span>Loading voice recordings...</span>
          </div>
        )}

        {/* Recordings List */}
        {!loading && (
          <div className="space-y-4">
            {recordings.length > 0 ? (
              <>
                <h3 className="font-medium">All Recordings ({recordings.length})</h3>
                <div className="grid gap-4">
                  {recordings.map((recording) => (
                    <Card 
                      key={recording.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        playingRecordingId === recording.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:border-primary/30'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <FileAudio className="w-4 h-4 text-primary" />
                              <span className="font-medium">
                                {formatDate(recording.created_at)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {Math.round(recording.duration_seconds || 0)}s
                              </Badge>
                              {recording.session_mode && (
                                <Badge variant="secondary" className="text-xs">
                                  {recording.session_mode}
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {recording.conversation_summary || 'No summary available'}
                            </p>
                            
                            {/* Memory Titles */}
                            {recording.memory_titles && recording.memory_titles.length > 0 && (
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-muted-foreground">Memories:</span>
                                <div className="flex gap-1 flex-wrap">
                                  {recording.memory_titles.map((title, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {title}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Topics */}
                            {recording.topics && recording.topics.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {recording.topics.slice(0, 4).map((topic, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => playAudio(recording)}
                            disabled={playingRecordingId === recording.id && isPlaying}
                            className="gap-2 flex-shrink-0"
                          >
                            {playingRecordingId === recording.id && isPlaying ? (
                              <>
                                <Pause className="w-4 h-4" />
                                Playing
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" />
                                Play
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <FileAudio className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Voice Recordings</h3>
                <p className="text-muted-foreground mb-4">
                  Start conversations with Solin to create voice recordings that will appear here.
                </p>
                <Link to="/">
                  <Button>
                    Start a Conversation
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}