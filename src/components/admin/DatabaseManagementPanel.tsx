import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  RefreshCw, 
  Database,
  User,
  RotateCcw 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const DatabaseManagementPanel = () => {
  const { user, checkOnboardingStatus } = useAuth();
  const [isClearing, setIsClearing] = useState(false);
  const [clearingStep, setClearingStep] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const clearDatabase = async () => {
    if (!user) {
      setError('Must be logged in as admin to perform cleanup');
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

      // Step 5: Reset all user onboarding status
      setClearingStep('Resetting all user onboarding status...');
      const { error: onboardingError } = await supabase
        .from('user_profiles')
        .update({ 
          onboarding_completed: false,
          first_conversation_completed: false,
          first_conversation_completed_at: null
        })
        .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Reset all users

      if (onboardingError) {
        console.warn('Onboarding reset error:', onboardingError);
        setResults(prev => [...prev, `⚠️ Onboarding reset: ${onboardingError.message}`]);
      } else {
        setResults(prev => [...prev, '✅ All user onboarding status reset']);
        // Refresh current user's onboarding status
        await checkOnboardingStatus();
      }

      // Step 6: Verify cleanup
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
        setResults(prev => [...prev, '🎉 Complete database cleanup successful!', '🎯 All users will get First Conversation onboarding']);
      } else {
        setResults(prev => [...prev, '⚠️ Some data may still remain. Check manually.']);
      }

    } catch (err: any) {
      console.error('Cleanup failed:', err);
      setError(`Cleanup failed: ${err.message}`);
    } finally {
      setIsClearing(false);
      setClearingStep('');
    }
  };

  const resetOnboardingAll = async () => {
    if (!user) {
      setError('Must be logged in as admin to reset onboarding');
      return;
    }

    setIsClearing(true);
    setResults([]);
    setError(null);
    setSuccess(false);
    setClearingStep('Resetting onboarding for all users...');

    try {
      const { error: onboardingError } = await supabase
        .from('user_profiles')
        .update({ 
          onboarding_completed: false,
          first_conversation_completed: false,
          first_conversation_completed_at: null
        })
        .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Reset all users

      if (onboardingError) {
        throw onboardingError;
      }

      // Refresh current user's onboarding status
      await checkOnboardingStatus();

      setResults(['✅ All user onboarding status reset successfully!', '🎯 First Conversation will trigger for all users (including you) immediately!']);
      setSuccess(true);
    } catch (err: any) {
      console.error('Onboarding reset failed:', err);
      setError(`Onboarding reset failed: ${err.message}`);
    } finally {
      setIsClearing(false);
      setClearingStep('');
    }
  };

  const resetUserOnboarding = async () => {
    if (!user) {
      setError('Must be logged in as admin');
      return;
    }

    setIsClearing(true);
    setResults([]);
    setError(null);
    setSuccess(false);
    setClearingStep('Resetting current user onboarding...');

    try {
      // Try user_profiles table first, fallback to users table
      let { error: onboardingError } = await supabase
        .from('user_profiles')
        .update({ 
          onboarding_completed: false,
          first_conversation_completed: false,
          first_conversation_completed_at: null
        })
        .eq('user_id', user.id);

      // If user_profiles table doesn't exist, try users table as fallback  
      if (onboardingError && onboardingError.code === 'PGRST205') {
        console.log('📋 user_profiles table not found, using users table as fallback');
        const fallback = await supabase
          .from('users')
          .update({ onboarding_completed: false })
          .eq('user_id', user.id);
        onboardingError = fallback.error;
      }

      if (onboardingError) {
        throw onboardingError;
      }

      // Refresh current user's onboarding status
      setClearingStep('Refreshing onboarding status...');
      await checkOnboardingStatus();

      setResults(['✅ Your onboarding status reset successfully!', '🎯 First Conversation should trigger immediately!', '🔄 Navigate to any page to see First Conversation dialog']);
      setSuccess(true);
    } catch (err: any) {
      console.error('User onboarding reset failed:', err);
      setError(`User onboarding reset failed: ${err.message}`);
    } finally {
      setIsClearing(false);
      setClearingStep('');
    }
  };

  const forceRefreshOnboarding = async () => {
    setIsClearing(true);
    setResults([]);
    setError(null);
    setClearingStep('Checking current onboarding status...');

    try {
      await checkOnboardingStatus();
      setResults(['✅ Onboarding status refreshed!', '🎯 If reset was done, First Conversation should trigger now']);
      setSuccess(true);
    } catch (err: any) {
      console.error('Refresh failed:', err);
      setError(`Refresh failed: ${err.message}`);
    } finally {
      setIsClearing(false);
      setClearingStep('');
    }
  };

  const checkVoiceRecordingsTable = async () => {
    if (!user) {
      setError('Must be logged in as admin');
      return;
    }

    setIsClearing(true);
    setResults([]);
    setError(null);
    setSuccess(false);
    setClearingStep('Checking voice_recordings table...');

    try {
      // Try to query the voice_recordings table
      const { data, error } = await supabase
        .from('voice_recordings')
        .select('id')
        .limit(1);

      if (error) {
        if (error.message.includes('voice_recordings') && 
            (error.message.includes('does not exist') || 
             error.message.includes('not found') ||
             error.message.includes('schema cache'))) {
          setResults([
            '❌ voice_recordings table does not exist',
            '🔧 The Archive feature requires this table to be created',
            '📋 Use the "Create Voice Recordings Table" button below to fix this issue'
          ]);
        } else {
          throw error;
        }
      } else {
        setResults([
          '✅ voice_recordings table exists and is accessible',
          `📊 Table is ready for Archive feature`,
          '🎯 Archive page should work properly now'
        ]);
        setSuccess(true);
      }
    } catch (err: any) {
      console.error('Table check failed:', err);
      setError(`Table check failed: ${err.message}`);
    } finally {
      setIsClearing(false);
      setClearingStep('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Database Cleanup Section */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <Database className="h-5 w-5" />
            Complete Database Cleanup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-500/20 bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200">
              <strong>DANGER:</strong> This will permanently delete ALL memories, artifacts, and voice recordings 
              for ALL users while preserving user accounts. This action cannot be undone.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-semibold text-slate-200">What will be cleared:</h4>
            <ul className="text-sm text-slate-300 space-y-1 ml-4">
              <li>• All memories and their content (ALL USERS)</li>
              <li>• All artifacts (photos, documents, etc.)</li>
              <li>• All memory-artifact relationships</li>
              <li>• All voice recordings</li>
              <li>• Reset onboarding status for all users</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-slate-200">What will be preserved:</h4>
            <ul className="text-sm text-slate-300 space-y-1 ml-4">
              <li>• User accounts and login credentials</li>
              <li>• User profile information</li>
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
                CLEAR ALL DATABASE DATA
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Separator className="bg-slate-700" />

      {/* Onboarding Management Section */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-400">
            <User className="h-5 w-5" />
            Onboarding Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-200">Reset All Users Onboarding</h4>
              <p className="text-sm text-slate-300">
                Reset onboarding status for ALL users. First Conversation will trigger for everyone.
              </p>
              <Button 
                onClick={resetOnboardingAll} 
                disabled={isClearing}
                variant="outline" 
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset All Users Onboarding
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-slate-200">Reset Your Onboarding</h4>
              <p className="text-sm text-slate-300">
                Reset only your onboarding status to test the First Conversation flow.
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={resetUserOnboarding} 
                  disabled={isClearing}
                  variant="outline" 
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset My Onboarding
                </Button>
                <Button 
                  onClick={forceRefreshOnboarding} 
                  disabled={isClearing}
                  variant="ghost" 
                  size="sm"
                  className="w-full text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Force Refresh Status
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Setup Section */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-400">
            <Database className="h-5 w-5" />
            Database Setup & Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-200">Voice Archive Feature Setup</h4>
            <p className="text-sm text-slate-300">
              The Archive page requires a voice_recordings table to store conversation metadata.
              Use this tool to check if the table exists and create it if needed.
            </p>
            
            <div className="grid gap-3 md:grid-cols-2">
              <Button 
                onClick={checkVoiceRecordingsTable} 
                disabled={isClearing}
                variant="outline" 
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                Check Voice Recordings Table
              </Button>
              
              <Alert className="border-yellow-500/20 bg-yellow-500/10 p-3">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200 text-xs">
                  <strong>Note:</strong> If the table doesn't exist, you'll need to create it manually 
                  in the Supabase SQL Editor using the provided SQL file.
                </AlertDescription>
              </Alert>
            </div>
            
            <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-300 mb-2">
                <strong>Quick Fix Instructions:</strong>
              </p>
              <ol className="text-xs text-slate-400 space-y-1 ml-4">
                <li>1. Go to your Supabase Dashboard → SQL Editor</li>
                <li>2. Copy contents from: <code className="bg-slate-800 px-1 rounded">fix_voice_recordings.sql</code></li>
                <li>3. Run the SQL to create the voice_recordings table</li>
                <li>4. Return here and click "Check Voice Recordings Table"</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {(results.length > 0 || error) && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-200">
              {success ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-orange-400" />
              )}
              Operation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4 border-red-500/20 bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-200">{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2 text-sm font-mono bg-slate-900/50 p-4 rounded-lg max-h-60 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="text-slate-300">{result}</div>
              ))}
            </div>

            {success && (
              <div className="mt-4">
                <Alert className="border-green-500/20 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-200">
                    Operation completed successfully! Changes will be reflected immediately.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DatabaseManagementPanel;