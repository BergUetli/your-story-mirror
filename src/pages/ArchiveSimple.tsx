import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { aiVoiceSearch, VoiceSearchResult } from '@/services/aiVoiceSearch';

const ArchiveSimple = () => {
  const [recordings, setRecordings] = useState<VoiceSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecordings = async () => {
    console.log('🚀 Simple Archive: Loading recordings...');
    setIsLoading(true);
    setError(null);
    
    try {
      const demoRecordings = await aiVoiceSearch.getDemoRecordings();
      console.log('📊 Simple Archive: Got recordings:', demoRecordings.length);
      setRecordings(demoRecordings);
    } catch (err) {
      console.error('❌ Simple Archive: Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  console.log('🎨 Simple Archive Render:', {
    recordingsCount: recordings.length,
    isLoading,
    error
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Simple Archive Test</h1>
          <p className="text-muted-foreground">Testing basic recording display without complex logic</p>
          
          <div className="flex gap-2 justify-center mt-4">
            <Button onClick={loadRecordings} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Reload Recordings'}
            </Button>
          </div>
        </div>

        <div className="text-center p-4 bg-muted/20 rounded">
          <strong>Status:</strong> {recordings.length} recordings loaded
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-red-700">
              <strong>Error:</strong> {error}
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-muted-foreground">Loading recordings...</p>
          </div>
        )}

        {!isLoading && recordings.length === 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4 text-center">
              <h3 className="font-medium text-yellow-800">No Recordings Found</h3>
              <p className="text-yellow-600 mt-2">No demo recordings were returned from the database.</p>
            </CardContent>
          </Card>
        )}

        {recordings.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Found {recordings.length} Recordings:</h2>
            
            {recordings.map((recording, index) => (
              <Card key={recording.id} className="border-green-200">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">
                      Recording {index + 1}: {recording.session_id}
                    </h3>
                    
                    <div className="text-sm text-muted-foreground flex gap-4">
                      <span>Duration: {recording.duration_seconds}s</span>
                      <span>Mode: {recording.session_mode}</span>
                      <span>Date: {new Date(recording.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="text-sm">
                      <strong>Summary:</strong> {recording.conversation_summary || 'No summary'}
                    </div>
                    
                    {recording.topics && recording.topics.length > 0 && (
                      <div className="text-sm">
                        <strong>Topics:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {recording.topics.map((topic, idx) => (
                            <span 
                              key={idx}
                              className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchiveSimple;