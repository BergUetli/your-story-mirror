import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Loader2,
  AlertTriangle,
  RefreshCw,
  Mic,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { aiVoiceSearch, VoiceSearchResult } from '@/services/aiVoiceSearch';
import { AudioPlayer } from '@/components/AudioPlayer';
import { MemoryArchive } from '@/components/MemoryArchive';
import { logArchiveDisplay } from '@/services/diagnosticLogger';

const Archive = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [recordings, setRecordings] = useState<VoiceSearchResult[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<VoiceSearchResult[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<VoiceSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'memories'>('date');
  const [activeTab, setActiveTab] = useState<'recordings' | 'memories'>('recordings');
  
  // Load all voice recordings
  const loadRecordings = async () => {
    console.log('🚀 loadRecordings function called');
    console.log('👤 Current user state:', user);
    console.log('🆔 User ID:', user?.id);
    
    logArchiveDisplay('info', 'archive_load_requested', {
      userId: user?.id,
      hasUser: !!user,
      timestamp: new Date().toISOString()
    });
    
    setIsLoading(true);
    setError(null);
    try {
      console.log('📚 Loading all voice recordings for Archive...');
      
      // If no user is logged in, load demo recordings AND guest recordings
      if (!user?.id) {
        console.log('👤 No user logged in, loading demo and guest recordings...');
        
        // Load demo recordings
        console.log('🔍 Loading demo recordings...');
        const demoRecordings = await aiVoiceSearch.getDemoRecordings();
        console.log(`🎭 Demo recordings: ${demoRecordings.length}`);
        
        // Also load any guest recordings from this session
        console.log('🔍 Loading recent guest recordings...');
        const guestRecordings = await aiVoiceSearch.getGuestRecordings();
        console.log(`👤 Guest recordings: ${guestRecordings.length}`);
        
        // Combine demo and guest recordings
        const allRecordings = [...guestRecordings, ...demoRecordings];
        console.log(`📈 Total recordings: ${allRecordings.length}`);
        
        setRecordings(allRecordings);
        setFilteredRecordings(allRecordings);
        console.log(`✅ Archive loaded: ${allRecordings.length} recordings (${guestRecordings.length} guest + ${demoRecordings.length} demo)`);
        
        if (allRecordings.length === 0) {
          toast({
            title: 'No recordings found',
            description: 'Start a conversation with Solin to create your first recording!',
          });
        } else {
          const message = guestRecordings.length > 0 
            ? `Loaded ${guestRecordings.length} new recording(s) + ${demoRecordings.length} demo recordings!`
            : `Loaded ${demoRecordings.length} demo recordings for testing!`;
          toast({
            title: 'Archive Loaded',
            description: message,
          });
        }
        return;
      }
      
      const allRecordings = await aiVoiceSearch.getAllVoiceRecordings(user.id);
      
      logArchiveDisplay('info', 'recordings_loaded_success', {
        userId: user.id,
        recordingCount: allRecordings.length,
        sampleRecordings: allRecordings.slice(0, 3).map(r => ({
          id: r.id,
          created_at: r.created_at,
          has_storage_path: !!r.storage_path,
          has_file_url: !!(r as any).file_url, // Keep for compatibility
          has_transcript: !!((r as any).transcript_text || (r as any).transcript),
          has_summary: !!((r as any).conversation_summary || (r as any).summary)
        }))
      });
      
      setRecordings(allRecordings);
      setFilteredRecordings(allRecordings);
      console.log(`✅ Archive loaded: ${allRecordings.length} voice recordings`);
      
      if (allRecordings.length === 0) {
        logArchiveDisplay('warn', 'no_recordings_found', { userId: user.id });
        toast({
          title: 'No recordings found',
          description: 'Start having conversations with Solin to build your voice archive!',
        });
      }
    } catch (error) {
      console.error('❌ Failed to load Archive:', error);
      
      // Check if this is a table not found error
      const errorMessage = error instanceof Error ? error.message : 'Failed to load voice recordings';
      const isTableMissing = errorMessage.includes('voice_recordings') && 
                           (errorMessage.includes('does not exist') || 
                            errorMessage.includes('not found') ||
                            errorMessage.includes('schema cache'));

      logArchiveDisplay('error', 'archive_load_failed', {
        userId: user?.id,
        error: errorMessage,
        isTableMissing,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      if (isTableMissing) {
        setError('Archive Feature Not Set Up');
        toast({
          title: 'Archive Feature Not Set Up',
          description: 'The voice recordings table needs to be created. Please see the instructions on this page.',
          variant: 'destructive'
        });
      } else {
        setError(errorMessage);
        toast({
          title: 'Archive Load Failed',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort recordings
  const filterRecordings = (query: string) => {
    let filtered = recordings;
    
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      filtered = recordings.filter(recording => {
        const searchText = [
          recording.transcript_text || '',
          recording.conversation_summary || '',
          ...(recording.topics || []),
          ...(recording.memory_titles || [])
        ].join(' ').toLowerCase();
        
        return searchText.includes(queryLower);
      });
    }
    
    // Apply sorting
    const sorted = sortRecordings(filtered, sortBy);
    setFilteredRecordings(sorted);
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
    console.log('🔄 Archive useEffect triggered - loading recordings directly');
    loadRecordings();
  }, []); // Remove user dependency to match ArchiveSimple pattern

  useEffect(() => {
    filterRecordings(searchQuery);
  }, [searchQuery, recordings, sortBy]);



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
              <h1 className="text-xl font-semibold">Archive</h1>
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
        {/* Authentication Notice for Guests */}
        {!user && (
          <Alert className="mb-6 border-blue-500/20 bg-blue-500/10">
            <AlertTriangle className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-200">
              <strong>Viewing Demo Archive:</strong> You're currently viewing sample recordings. 
              <Link to="/auth" className="underline text-blue-300 hover:text-blue-100 ml-1">
                Sign in to access your personal voice recordings and memories.
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-6 bg-muted/30 p-1 rounded-lg w-fit">
          <Button
            variant={activeTab === 'recordings' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('recordings')}
            className="flex items-center gap-2"
          >
            <FileAudio className="w-4 h-4" />
            {user ? 'Your Voice Recordings' : 'Demo Voice Recordings'}
          </Button>
          <Button
            variant={activeTab === 'memories' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('memories')}
            className="flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            {user ? 'Your Memory Archive' : 'Demo Memory Archive'}
          </Button>
        </div>

        {/* Voice Recordings Tab */}
        {activeTab === 'recordings' && (
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

            {/* Recordings List - Using Simple Pattern */}
            
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading voice archive...</span>
              </div>
            )}

            {/* Error State */}
            {error && (error.includes('Archive Feature Not Set Up') || error.includes('voice_recordings') || error.includes('schema cache')) && (
              <div className="text-center py-12 px-6">
                <Database className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-4 text-red-400">
                  Archive Feature Setup Required
                </h3>
                <div className="max-w-2xl mx-auto space-y-4">
                  <Alert className="border-red-500/20 bg-red-500/10 text-left">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-200">
                      <strong>Missing Database Table:</strong> The voice_recordings table doesn't exist in the database.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="bg-slate-900/50 p-4 rounded-lg text-left">
                    <h4 className="font-semibold mb-3 text-green-400">🛠️ Quick Fix Steps:</h4>
                    <ol className="space-y-2 text-sm text-slate-300">
                      <li className="flex gap-2">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center flex-shrink-0">1</span>
                        Go to your <strong>Supabase Dashboard</strong>
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center flex-shrink-0">2</span>
                        Navigate to <strong>SQL Editor</strong>
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center flex-shrink-0">3</span>
                        Copy contents from <code className="bg-slate-800 px-2 py-1 rounded">fix_voice_recordings.sql</code> in project root
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center flex-shrink-0">4</span>
                        Run the SQL script to create the table
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center flex-shrink-0">5</span>
                        Refresh this page - Archive will work immediately!
                      </li>
                    </ol>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <Button 
                      onClick={() => window.location.reload()} 
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh Page
                    </Button>
                    <Button 
                      onClick={() => window.open('https://supabase.com/dashboard/projects', '_blank')} 
                      className="flex items-center gap-2"
                    >
                      <Database className="w-4 h-4" />
                      Open Supabase Dashboard
                    </Button>
                  </div>
                  
                  <p className="text-xs text-slate-400 mt-4">
                    <strong>Why manual setup?</strong> Database table creation requires admin privileges 
                    and is done through Supabase's secure SQL Editor for security reasons.
                  </p>
                </div>
              </div>
            )}

            {/* No Recordings State */}
            {!isLoading && recordings.length === 0 && !error && (
              <div className="text-center py-12 px-6">
                <ArchiveIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-4">
                  {user ? 'No Voice Recordings Found' : 'No Demo Recordings Available'}
                </h3>
                <div className="max-w-md mx-auto space-y-4">
                  {user ? (
                    <>
                      <p className="text-muted-foreground">
                        You haven't recorded any conversations yet. Start talking with Solin to create your first voice recording!
                      </p>
                      
                      <div className="flex gap-3 justify-center">
                        <Link to="/sanctuary">
                          <Button className="flex items-center gap-2">
                            <Mic className="w-4 h-4" />
                            Start First Conversation
                          </Button>
                        </Link>
                        <Link to="/mic-test">
                          <Button variant="outline" className="flex items-center gap-2">
                            <Mic className="w-4 h-4" />
                            Test Microphone
                          </Button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground">
                        No demo recordings are currently available. Sign in to access your personal voice archive.
                      </p>
                      
                      <Alert className="border-blue-500/20 bg-blue-500/10 text-left">
                        <AlertTriangle className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-200">
                          <strong>Get Started:</strong> Create an account to record conversations with Solin and build your personal voice archive.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="flex gap-3 justify-center">
                        <Link to="/auth">
                          <Button className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Sign Up / Sign In
                          </Button>
                        </Link>
                        <Button 
                          onClick={() => window.location.reload()} 
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Retry Loading
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* No Filtered Results State */}
            {!isLoading && recordings.length > 0 && filteredRecordings.length === 0 && (
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
            )}



            {/* Recordings List */}
            {!isLoading && filteredRecordings.length > 0 && (
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
        )}

        {/* Memory Archive Tab */}
        {activeTab === 'memories' && (
          <MemoryArchive />
        )}
      </div>
    </div>
  );
};

export default Archive;