import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Search, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Volume2,
  Clock,
  MessageSquare,
  Calendar,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { voiceRecordingService } from '@/services/voiceRecording';

interface VoiceSearchResult {
  id: string;
  session_id: string;
  recording_type: string;
  storage_path: string;
  duration_seconds: number;
  transcript_text: string;
  conversation_summary: string;
  memory_ids: string[];
  topics: string[];
  session_mode: string;
  created_at: string;
}

interface TranscriptSegment {
  timestamp: number; // seconds from start
  speaker: 'user' | 'ai';
  text: string;
  isMatch?: boolean;
}

interface EnhancedVoiceSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EnhancedVoiceSearch = ({ open, onOpenChange }: EnhancedVoiceSearchProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<VoiceSearchResult[]>([]);
  
  // Audio playback state
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [selectedResult, setSelectedResult] = useState<VoiceSearchResult | null>(null);
  
  // Audio refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Parse transcript with timestamps
  const parseTranscript = (transcriptText: string): TranscriptSegment[] => {
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

  // Search voice recordings
  const handleSearch = async () => {
    if (!user?.id || !searchQuery.trim()) return;

    setIsSearching(true);
    try {
      console.log('🔍 Searching voice recordings for:', searchQuery);

      // Use the voice recording service search function
      const results = await voiceRecordingService.searchRecordings(user.id, searchQuery.trim(), 20);
      
      setSearchResults(results);
      console.log('✅ Found recordings:', results.length);

      if (results.length === 0) {
        toast({
          title: 'No results found',
          description: `No voice recordings found matching "${searchQuery}"`,
        });
      }
    } catch (error) {
      console.error('❌ Voice search error:', error);
      toast({
        title: 'Search failed',
        description: 'Failed to search voice recordings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Load and play audio
  const playAudio = async (result: VoiceSearchResult, seekToMatch: boolean = false) => {
    try {
      // Stop current audio if playing
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      console.log('🎵 Loading audio for playback:', result.storage_path);
      
      // Get signed URL for audio
      const audioUrl = await voiceRecordingService.getAudioUrl(result.storage_path);
      
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
      const segments = parseTranscript(result.transcript_text || '');
      const highlightedSegments = highlightMatches(segments, searchQuery);
      setTranscript(highlightedSegments);
      setSelectedResult(result);

      // Find first match for seeking
      if (seekToMatch && searchQuery.trim()) {
        const firstMatch = highlightedSegments.find(segment => segment.isMatch);
        if (firstMatch && firstMatch.timestamp > 0) {
          // Seek to a few seconds before the match
          const seekTime = Math.max(0, firstMatch.timestamp - 3);
          audio.currentTime = seekTime;
          console.log(`⏭️ Seeking to match at ${seekTime}s`);
        }
      }

      // Start playback
      await audio.play();
      setCurrentAudio(audio);
      audioRef.current = audio;
      setIsPlaying(true);
      setPlayingRecordingId(result.id);

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
        description: `Playing from ${new Date(result.created_at).toLocaleDateString()}`,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Enhanced Voice Search
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your voice recordings... (e.g., 'Chicago Booth', 'graduation')"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch} 
              disabled={isSearching || !searchQuery.trim()}
              className="gap-2"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </Button>
          </div>

          {/* Audio Player (when audio is selected) */}
          {selectedResult && (
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">
                      Now Playing: {new Date(selectedResult.created_at).toLocaleDateString()}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
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
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Search Results ({searchResults.length})</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <Card 
                    key={result.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      playingRecordingId === result.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-primary/30'
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {new Date(result.created_at).toLocaleDateString()}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(result.duration_seconds)}s
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {result.conversation_summary}
                          </p>
                          
                          {result.topics && result.topics.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {result.topics.slice(0, 3).map((topic, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => playAudio(result, true)}
                            disabled={playingRecordingId === result.id && isPlaying}
                            className="gap-1"
                          >
                            {playingRecordingId === result.id && isPlaying ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                            {playingRecordingId === result.id && isPlaying ? 'Playing' : 'Play'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <p className="font-medium mb-1">💡 How to use Voice Search:</p>
            <ul className="space-y-1 text-xs">
              <li>• Search for topics, names, or keywords from your conversations</li>
              <li>• Click "Play" to listen to recordings with automatic seeking to matches</li>
              <li>• Click on transcript segments to jump to that part of the conversation</li>
              <li>• Use the audio controls to navigate: skip ±10s, seek, or pause/play</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};