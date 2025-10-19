import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Database, 
  Search, 
  Calendar,
  Clock,
  Filter,
  SortDesc,
  Archive as ArchiveIcon,
  FileAudio,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { aiVoiceSearch, VoiceSearchResult } from '@/services/aiVoiceSearch';
import { AudioPlayer } from '@/components/AudioPlayer';

export const Archive = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [recordings, setRecordings] = useState<VoiceSearchResult[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<VoiceSearchResult[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<VoiceSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'memories'>('date');
  
  // Load all voice recordings
  const loadRecordings = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      console.log('📚 Loading all voice recordings for Archive...');
      const allRecordings = await aiVoiceSearch.getAllVoiceRecordings(user.id);
      
      setRecordings(allRecordings);
      setFilteredRecordings(allRecordings);
      console.log(`✅ Archive loaded: ${allRecordings.length} voice recordings`);
      
      if (allRecordings.length === 0) {
        toast({
          title: 'No recordings found',
          description: 'Start having conversations with Solin to build your voice archive!',
        });
      }
    } catch (error) {
      console.error('❌ Failed to load Archive:', error);
      toast({
        title: 'Archive Load Failed',
        description: error instanceof Error ? error.message : 'Failed to load voice recordings',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter recordings based on search
  const filterRecordings = (query: string) => {
    if (!query.trim()) {
      setFilteredRecordings(recordings);
      return;
    }

    const queryLower = query.toLowerCase();
    const filtered = recordings.filter(recording => {
      const searchText = [
        recording.transcript_text || '',
        recording.conversation_summary || '',
        ...(recording.topics || []),
        ...(recording.memory_titles || [])
      ].join(' ').toLowerCase();
      
      return searchText.includes(queryLower);
    });
    
    setFilteredRecordings(filtered);
  };

  // Sort recordings
  const sortRecordings = (recordings: VoiceSearchResult[], sortBy: string) => {
    const sorted = [...recordings].sort((a, b) => {
      switch (sortBy) {
        case 'duration':
          return b.duration_seconds - a.duration_seconds;
        case 'memories':
          return (b.memory_titles?.length || 0) - (a.memory_titles?.length || 0);
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    
    return sorted;
  };

  // Effects
  useEffect(() => {
    loadRecordings();
  }, [user?.id]);

  useEffect(() => {
    filterRecordings(searchQuery);
  }, [searchQuery, recordings]);

  useEffect(() => {
    setFilteredRecordings(prev => sortRecordings(prev, sortBy));
  }, [sortBy]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Calculate total stats
  const totalDuration = recordings.reduce((sum, r) => sum + r.duration_seconds, 0);
  const totalMemories = recordings.reduce((sum, r) => sum + (r.memory_titles?.length || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b-[1.5px] border-section-border bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/timeline">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <ArchiveIcon className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold">Voice Archive</h1>
            </div>
          </div>
          
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileAudio className="w-4 h-4" />
              {recordings.length} recordings
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {Math.round(totalDuration / 60)} minutes total
            </div>
            <div className="flex items-center gap-1">
              <Database className="w-4 h-4" />
              {totalMemories} memories
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Controls and List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search and Controls */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search transcripts, summaries, topics, or memories..."
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <SortDesc className="w-4 h-4 text-muted-foreground" />
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-sm border rounded px-2 py-1 bg-background"
                  >
                    <option value="date">Latest First</option>
                    <option value="duration">Longest First</option>
                    <option value="memories">Most Memories</option>
                  </select>
                </div>
              </div>
              
              {/* Quick Stats Bar */}
              <div className="flex items-center gap-4 text-sm bg-muted/30 p-3 rounded-lg">
                <span className="font-medium">
                  {filteredRecordings.length} of {recordings.length} recordings
                </span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    <Filter className="w-3 h-3" />
                    Filtered
                  </Badge>
                )}
              </div>
            </div>

            {/* Recordings List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading voice archive...</span>
              </div>
            ) : filteredRecordings.length === 0 ? (
              <div className="text-center py-12">
                <ArchiveIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchQuery ? 'No matching recordings' : 'No voice recordings yet'}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery 
                    ? `No recordings found matching "${searchQuery}"`
                    : 'Start conversations with Solin to build your voice archive!'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecordings.map((recording) => (
                  <Card 
                    key={recording.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedRecording?.id === recording.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-primary/30'
                    }`}
                    onClick={() => setSelectedRecording(recording)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {new Date(recording.created_at).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {formatDuration(recording.duration_seconds)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {recording.session_mode?.replace('_', ' ')}
                            </Badge>
                          </div>

                          {/* Summary */}
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {recording.conversation_summary}
                          </p>

                          {/* Memory Titles */}
                          {recording.memory_titles && recording.memory_titles.length > 0 && (
                            <div className="mb-2">
                              <div className="text-xs font-medium text-muted-foreground mb-1">
                                Connected Memories:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {recording.memory_titles.map((title, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    📝 {title}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Topics */}
                          {recording.topics && recording.topics.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {recording.topics.slice(0, 4).map((topic, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  🏷️ {topic}
                                </Badge>
                              ))}
                              {recording.topics.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{recording.topics.length - 4}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        <Button
                          variant={selectedRecording?.id === recording.id ? "default" : "outline"}
                          size="sm"
                          className="flex-shrink-0"
                        >
                          {selectedRecording?.id === recording.id ? 'Selected' : 'Play'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel: Audio Player */}
          <div className="space-y-4">
            {selectedRecording ? (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <FileAudio className="w-5 h-5 text-primary" />
                  Voice Recording Player
                </h3>
                <AudioPlayer 
                  recording={selectedRecording}
                  searchQuery={searchQuery}
                  className="sticky top-24"
                />
              </div>
            ) : (
              <Card className="sticky top-24">
                <CardContent className="p-6 text-center">
                  <FileAudio className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-medium mb-2">Select a Recording</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a voice recording from the list to play and explore its transcript.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};