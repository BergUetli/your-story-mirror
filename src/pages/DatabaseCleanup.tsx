import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const DatabaseCleanup = () => {
  const { user } = useAuth();
  const [isClearing, setIsClearing] = useState(false);
  const [clearingStep, setClearingStep] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const clearDatabase = async () => {
    if (!user) {
      setError('Must be logged in to perform cleanup');
      return;
    }

    setIsClearing(true);
    setResults([]);
    setError(null);
    setSuccess(false);

    try {
      // Step 1: Clear memory-artifact relationships
      setClearingStep('Clearing memory-artifact relationships...');
      const { error: memArtError } = await supabase
        .from('memory_artifacts')
        .delete()
        .neq('memory_id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (memArtError && memArtError.code !== '42703') {
        console.warn('Memory-artifact error:', memArtError);
        setResults(prev => [...prev, `⚠️ Memory-artifacts: ${memArtError.message}`]);
      } else {
        setResults(prev => [...prev, '✅ Memory-artifact relationships cleared']);
      }

      // Step 2: Clear all memories
      setClearingStep('Clearing all memories...');
      const { error: memoriesError } = await supabase
        .from('memories')
        .delete()
        .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (memoriesError) {
        console.warn('Memories error:', memoriesError);
        setResults(prev => [...prev, `⚠️ Memories: ${memoriesError.message}`]);
      } else {
        setResults(prev => [...prev, '✅ All memories cleared']);
      }

      // Step 3: Clear all artifacts
      setClearingStep('Clearing all artifacts...');
      const { error: artifactsError } = await supabase
        .from('artifacts')
        .delete()
        .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (artifactsError) {
        console.warn('Artifacts error:', artifactsError);
        setResults(prev => [...prev, `⚠️ Artifacts: ${artifactsError.message}`]);
      } else {
        setResults(prev => [...prev, '✅ All artifacts cleared']);
      }

      // Step 4: Clear voice recordings if table exists
      setClearingStep('Clearing voice recordings...');
      const { error: voiceError } = await supabase
        .from('voice_recordings')
        .delete()
        .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (voiceError && voiceError.code !== 'PGRST205') {
        console.warn('Voice recordings error:', voiceError);
        setResults(prev => [...prev, `⚠️ Voice recordings: ${voiceError.message}`]);
      } else {
        setResults(prev => [...prev, '✅ Voice recordings cleared']);
      }

      // Step 5: Verify cleanup
      setClearingStep('Verifying cleanup...');
      
      const { count: memoryCount } = await supabase
        .from('memories')
        .select('*', { count: 'exact', head: true });
      
      const { count: artifactCount } = await supabase
        .from('artifacts')
        .select('*', { count: 'exact', head: true });

      setResults(prev => [
        ...prev,
        `📊 Remaining memories: ${memoryCount || 0}`,
        `📊 Remaining artifacts: ${artifactCount || 0}`,
      ]);

      if ((memoryCount || 0) === 0 && (artifactCount || 0) === 0) {
        setSuccess(true);
        setResults(prev => [...prev, '🎉 Database cleanup completed successfully!']);
      } else {
        setResults(prev => [...prev, '⚠️ Some data may still remain. Check timeline.']);
      }

    } catch (err: any) {
      console.error('Cleanup failed:', err);
      setError(`Cleanup failed: ${err.message}`);
    } finally {
      setIsClearing(false);
      setClearingStep('');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please log in to access database cleanup tools.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Database Cleanup Tool
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This will permanently delete all memories, artifacts, and voice recordings while preserving your account. This action cannot be undone.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h3 className="font-semibold">What will be cleared:</h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• All memories and their content</li>
                <li>• All artifacts (photos, documents, etc.)</li>
                <li>• All memory-artifact relationships</li>
                <li>• All voice recordings</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">What will be preserved:</h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Your user account and login credentials</li>
                <li>• Your user profile information</li>
                <li>• Authentication settings</li>
              </ul>
            </div>

            <Button 
              onClick={clearDatabase} 
              disabled={isClearing}
              variant="destructive" 
              className="w-full"
            >
              {isClearing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {clearingStep || 'Clearing database...'}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {(results.length > 0 || error) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                )}
                Cleanup Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2 text-sm font-mono bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index}>{result}</div>
                ))}
              </div>

              {success && (
                <div className="mt-4 space-y-2">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Database cleanup completed! Your timeline should now be empty. You can return to the timeline to start fresh.
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    onClick={() => window.location.href = '/timeline'} 
                    className="w-full"
                  >
                    Go to Timeline
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DatabaseCleanup;