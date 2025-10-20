import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Database,
  Mic,
  Play,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { memoryRecordingGenerator, type ExistingMemory } from '@/services/memoryRecordingGenerator';
import MemoryRecordingManager from '@/components/admin/MemoryRecordingManager';

const TestMemoryRecordings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [memories, setMemories] = useState<ExistingMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load existing memories to see what we have
   */
  const loadMemories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔍 Loading existing memories...');
      const existingMemories = await memoryRecordingGenerator.getExistingMemories(user?.id);
      setMemories(existingMemories);
      
      console.log(`📚 Found ${existingMemories.length} existing memories`);
      toast({
        title: 'Memories loaded',
        description: `Found ${existingMemories.length} memories in your database.`,
      });
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

  useEffect(() => {
    loadMemories();
  }, [user?.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
              <Mic className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold">Memory Recording Test</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        
        {/* Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              Current Memories in Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                Loading memories...
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!isLoading && !error && (
              <>
                <div className="mb-4">
                  <Badge variant="outline" className="text-lg py-1 px-3">
                    {memories.length} memories found
                  </Badge>
                </div>

                {memories.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No memories found</h3>
                    <p className="text-muted-foreground">
                      You need to create some memories first before generating recordings.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memories.slice(0, 5).map((memory) => (
                      <div 
                        key={memory.id}
                        className="p-4 border rounded-lg bg-card"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">{memory.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {memory.text.substring(0, 200)}...
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Created: {formatDate(memory.created_at)}</span>
                              {memory.memory_date && (
                                <>
                                  <span>•</span>
                                  <span>Memory Date: {new Date(memory.memory_date).toLocaleDateString()}</span>
                                </>
                              )}
                              {memory.memory_location && (
                                <>
                                  <span>•</span>
                                  <span>Location: {memory.memory_location}</span>
                                </>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {memory.source_type || 'manual'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {memories.length > 5 && (
                      <div className="text-center text-muted-foreground text-sm">
                        ... and {memories.length - 5} more memories
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Memory Recording Manager */}
        <MemoryRecordingManager />

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              How to Use Memory Recording Generator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">What this tool does:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-blue-800">
                <li>Finds all existing text memories in your database</li>
                <li>Generates conversation-style voice recordings for memories that don't have recordings yet</li>
                <li>Creates different conversation styles: reflection, interview, storytelling, or discussion</li>
                <li>Links the generated recordings to your existing memories</li>
                <li>Stores recordings in the voice_recordings table for Archive access</li>
              </ul>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> The current implementation uses mock TTS generation for demonstration. 
                To enable real voice generation, you'll need to configure TTS API keys and update the audio generation service.
              </AlertDescription>
            </Alert>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Next steps:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-green-800">
                <li>Select your preferred conversation style and voice model</li>
                <li>Click "Generate All Recordings" to create voice recordings for all memories</li>
                <li>Or generate recordings one by one for testing</li>
                <li>Check the Archive page to see your new voice recordings</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestMemoryRecordings;