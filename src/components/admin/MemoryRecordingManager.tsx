import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Database,
  Mic,
  Play,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Users,
  FileAudio,
  Zap,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { memoryRecordingGenerator, type ExistingMemory, type GeneratedRecording } from '@/services/memoryRecordingGenerator';

interface MemoryRecordingManagerProps {
  className?: string;
}

const MemoryRecordingManager: React.FC<MemoryRecordingManagerProps> = ({ className }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [memories, setMemories] = useState<ExistingMemory[]>([]);
  const [memoriesWithoutRecordings, setMemoriesWithoutRecordings] = useState<ExistingMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedRecordings, setGeneratedRecordings] = useState<GeneratedRecording[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [totalToGenerate, setTotalToGenerate] = useState(0);

  // Options
  const [conversationStyle, setConversationStyle] = useState<'interview' | 'reflection' | 'storytelling' | 'discussion'>('reflection');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [voiceModel, setVoiceModel] = useState('google/gemini-2.5-pro-preview-tts');

  /**
   * Load existing memories and check which ones don't have recordings
   */
  const loadMemories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔍 Loading existing memories...');

      // Load all memories for current user
      const allMemories = await memoryRecordingGenerator.getExistingMemories(user?.id);
      setMemories(allMemories);

      // Check which memories don't have recordings yet
      const memoriesWithoutRecs = await memoryRecordingGenerator.getMemoriesWithoutRecordings(user?.id);
      setMemoriesWithoutRecordings(memoriesWithoutRecs);

      console.log(`📊 Memory Status: ${allMemories.length} total, ${memoriesWithoutRecs.length} without recordings`);

      if (allMemories.length === 0) {
        toast({
          title: 'No memories found',
          description: 'You need to have some memories saved before generating recordings.',
        });
      } else {
        toast({
          title: 'Memories loaded',
          description: `Found ${allMemories.length} memories, ${memoriesWithoutRecs.length} can have recordings generated.`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load memories';
      console.error('❌ Error loading memories:', error);
      setError(errorMessage);
      toast({
        title: 'Error loading memories',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generate recordings for memories that don't have them
   */
  const generateRecordings = async () => {
    if (memoriesWithoutRecordings.length === 0) {
      toast({
        title: 'No recordings to generate',
        description: 'All your memories already have recordings.',
      });
      return;
    }

    setIsGenerating(true);
    setCurrentProgress(0);
    setTotalToGenerate(memoriesWithoutRecordings.length);
    setGeneratedRecordings([]);

    try {
      console.log(`🎙️ Starting generation of ${memoriesWithoutRecordings.length} recordings...`);

      const results = await memoryRecordingGenerator.generateRecordingsForMemories(
        memoriesWithoutRecordings,
        {
          voiceModel,
          conversationStyle,
          includeMetadata
        }
      );

      setGeneratedRecordings(results);

      toast({
        title: 'Recordings generated!',
        description: `Successfully created ${results.length} voice recordings for your memories.`,
      });

      // Refresh the memories to update the counts
      await loadMemories();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate recordings';
      console.error('❌ Error generating recordings:', error);
      setError(errorMessage);
      toast({
        title: 'Generation failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Generate recordings for a single memory (for testing)
   */
  const generateSingleRecording = async (memory: ExistingMemory) => {
    setIsGenerating(true);
    try {
      console.log(`🎯 Generating single recording for: "${memory.title}"`);

      const results = await memoryRecordingGenerator.generateRecordingsForMemories(
        [memory],
        {
          voiceModel,
          conversationStyle,
          includeMetadata
        }
      );

      if (results.length > 0) {
        setGeneratedRecordings(prev => [...prev, results[0]]);
        toast({
          title: 'Recording generated',
          description: `Created voice recording for "${memory.title}".`,
        });

        // Refresh the memories
        await loadMemories();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate recording';
      console.error('❌ Error generating single recording:', error);
      toast({
        title: 'Generation failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Load memories on component mount
  useEffect(() => {
    loadMemories();
  }, [user?.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="w-7 h-7 text-primary" />
            Memory Recording Manager
          </h2>
          <p className="text-muted-foreground mt-1">
            Generate voice recordings for your existing text memories
          </p>
        </div>
        <Button 
          onClick={loadMemories} 
          variant="outline"
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{memories.length}</p>
                <p className="text-sm text-muted-foreground">Total Memories</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileAudio className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{memories.length - memoriesWithoutRecordings.length}</p>
                <p className="text-sm text-muted-foreground">Have Recordings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{memoriesWithoutRecordings.length}</p>
                <p className="text-sm text-muted-foreground">Need Recordings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{generatedRecordings.length}</p>
                <p className="text-sm text-muted-foreground">Just Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your memories...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Generation Options */}
      {!isLoading && memories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Recording Generation Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Conversation Style */}
              <div>
                <label className="text-sm font-medium mb-2 block">Conversation Style</label>
                <select 
                  value={conversationStyle}
                  onChange={(e) => setConversationStyle(e.target.value as any)}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="reflection">Personal Reflection</option>
                  <option value="interview">Interview Style</option>
                  <option value="storytelling">Storytelling</option>
                  <option value="discussion">Discussion Format</option>
                </select>
              </div>

              {/* Voice Model */}
              <div>
                <label className="text-sm font-medium mb-2 block">Voice Model</label>
                <select 
                  value={voiceModel}
                  onChange={(e) => setVoiceModel(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="google/gemini-2.5-pro-preview-tts">Google Gemini TTS</option>
                  <option value="elevenlabs/v3-tts">ElevenLabs V3</option>
                  <option value="fal-ai/minimax/speech-02-hd">Minimax Speech HD</option>
                </select>
              </div>

              {/* Include Metadata */}
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="includeMetadata"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="includeMetadata" className="text-sm font-medium">
                  Include dates and locations in recordings
                </label>
              </div>
            </div>

            {/* Generation Button */}
            <div className="flex items-center gap-4">
              <Button
                onClick={generateRecordings}
                disabled={isGenerating || memoriesWithoutRecordings.length === 0}
                className="flex items-center gap-2"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating... ({currentProgress}/{totalToGenerate})
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Generate All Recordings ({memoriesWithoutRecordings.length})
                  </>
                )}
              </Button>

              {memoriesWithoutRecordings.length === 0 && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  All memories have recordings
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Memories Without Recordings */}
      {!isLoading && memoriesWithoutRecordings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Memories That Need Recordings ({memoriesWithoutRecordings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {memoriesWithoutRecordings.slice(0, 10).map((memory) => (
                <div 
                  key={memory.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{memory.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDate(memory.created_at)}
                      {memory.memory_location && (
                        <>
                          <span>•</span>
                          <span>{memory.memory_location}</span>
                        </>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {memory.source_type || 'manual'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {memory.text.substring(0, 100)}...
                    </p>
                  </div>
                  <Button
                    onClick={() => generateSingleRecording(memory)}
                    disabled={isGenerating}
                    size="sm"
                    variant="outline"
                    className="ml-4 flex items-center gap-1"
                  >
                    <Mic className="w-3 h-3" />
                    Generate
                  </Button>
                </div>
              ))}

              {memoriesWithoutRecordings.length > 10 && (
                <div className="text-center text-muted-foreground text-sm">
                  ... and {memoriesWithoutRecordings.length - 10} more memories
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recently Generated Recordings */}
      {generatedRecordings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Recently Generated Recordings ({generatedRecordings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedRecordings.map((recording, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <h4 className="font-medium">Recording Generated</h4>
                      <Badge variant="outline" className="text-xs">
                        {recording.duration}s
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {recording.summary}
                    </p>
                  </div>
                  <Button
                    onClick={() => window.open(recording.audioUrl, '_blank')}
                    size="sm"
                    variant="outline"
                    className="ml-4 flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    Play
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Memories State */}
      {!isLoading && memories.length === 0 && !error && (
        <Card>
          <CardContent className="p-12 text-center">
            <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Memories Found</h3>
            <p className="text-muted-foreground">
              You need to create some memories first before you can generate voice recordings for them.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MemoryRecordingManager;