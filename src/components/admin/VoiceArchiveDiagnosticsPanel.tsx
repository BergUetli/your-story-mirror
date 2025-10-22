/**
 * VOICE ARCHIVE DIAGNOSTICS PANEL
 * 
 * Comprehensive diagnostics and validation for voice archiving system
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Database,
  Mic,
  Archive,
  FileAudio,
  Download,
  Trash2,
  Activity,
  Eye,
  Zap,
  TestTube,
  HardDrive,
  Search,
  Upload,
  Volume2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { diagnosticLogger, ArchiveValidationResult, DiagnosticEvent } from '@/services/diagnosticLogger';
import MemoryRecordingManager from './MemoryRecordingManager';
import { voiceRecordingService, testGuestRecording, testAuthenticatedRecording, checkDatabaseRecordings, checkGuestRecordings } from '@/services/voiceRecording';
import { conversationRecordingService } from '@/services/conversationRecording';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const VoiceArchiveDiagnosticsPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [validationResult, setValidationResult] = useState<ArchiveValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [recentEvents, setRecentEvents] = useState<DiagnosticEvent[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [isTestingRecording, setIsTestingRecording] = useState(false);
  const [databaseRecordings, setDatabaseRecordings] = useState<any[]>([]);
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(false);
  const [storageInspection, setStorageInspection] = useState<any>(null);

  useEffect(() => {
    // Load initial events
    loadRecentEvents();
    
    // Auto-refresh if enabled
    if (autoRefresh) {
      const interval = setInterval(loadRecentEvents, 5000);
      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [autoRefresh]);

  const loadRecentEvents = () => {
    const events = diagnosticLogger.getRecentEvents(100);
    setRecentEvents(events);
  };

  const runValidation = async () => {
    setIsValidating(true);
    try {
      diagnosticLogger.logInfo('system', 'admin_validation_started', { 
        userId: user?.id,
        timestamp: new Date().toISOString()
      });

      const result = await diagnosticLogger.validateVoiceArchiving(user?.id);
      setValidationResult(result);
      loadRecentEvents();

      diagnosticLogger.logInfo('system', 'admin_validation_completed', { 
        success: result.success,
        validationId: result.validationId
      });
    } catch (error) {
      diagnosticLogger.logError('system', 'admin_validation_failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const exportDiagnostics = () => {
    const diagnosticsData = diagnosticLogger.exportDiagnostics();
    const blob = new Blob([diagnosticsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voice-archive-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    diagnosticLogger.logInfo('system', 'diagnostics_exported', {
      timestamp: new Date().toISOString()
    });
  };

  const clearDiagnostics = () => {
    diagnosticLogger.clearEvents();
    setRecentEvents([]);
    setValidationResult(null);
  };

  // Create a test recording that will appear in the archive
  const createTestRecording = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create test recordings",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingTest(true);
    try {
      console.log('🧪 Creating test recording for archive...');
      
      // Create synthetic audio data (silence)
      const audioContext = new AudioContext();
      const duration = 5; // 5 seconds
      const sampleRate = audioContext.sampleRate;
      const numberOfChannels = 1;
      const length = sampleRate * duration;
      
      const audioBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);
      
      // Add some simple tone to make it a valid audio file
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1; // 440Hz tone at low volume
      }

      // Convert to blob
      const offlineContext = new OfflineAudioContext(numberOfChannels, length, sampleRate);
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start(0);
      
      const renderedBuffer = await offlineContext.startRendering();
      
      // Create a WAV file blob
      const wavBlob = bufferToWav(renderedBuffer);
      
      console.log('🎵 Generated test audio:', {
        duration,
        size: wavBlob.size,
        type: wavBlob.type
      });

      console.log('🎵 Proceeding with test recording generation...');
      
      // Upload directly to Supabase storage
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `test_recording_${timestamp}.wav`;
      const storagePath = `${user.id}/${filename}`;
      
      console.log('☁️ Uploading test file to:', storagePath);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-recordings')
        .upload(storagePath, wavBlob, {
          contentType: 'audio/wav',
          cacheControl: '3600'
        });

      if (uploadError) {
        throw uploadError;
      }

      console.log('☁️ Test audio uploaded:', uploadData.path);

      // Create database record
      const { data: dbData, error: dbError } = await supabase
        .from('voice_recordings')
        .insert({
          user_id: user.id,
          session_id: `test-${Date.now()}`,
          recording_type: 'test',
          storage_path: uploadData.path,
          original_filename: filename,
          file_size_bytes: wavBlob.size,
          duration_seconds: duration,
          mime_type: 'audio/wav',
          transcript_text: '[Test Recording] This is a synthetic test recording created by the admin diagnostics panel.',
          conversation_summary: `Admin test recording (${duration}s) - Created for archive testing`,
          session_mode: 'admin_test',
          conversation_phase: 'completed',
          memory_ids: [],
          topics: ['test', 'admin', 'diagnostics']
        })
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database save failed:', dbError);
        throw dbError;
      }

      console.log('✅ Test recording saved to database:', dbData.id);
      
      toast({
        title: "✅ Test Recording Created",
        description: `Test recording ${filename} successfully saved to archive. Duration: ${duration}s, Size: ${(wavBlob.size / 1024).toFixed(1)}KB`,
        variant: "default"
      });

      // Refresh database view
      await loadDatabaseRecordings();
      loadRecentEvents();

    } catch (error) {
      console.error('❌ Failed to create test recording:', error);
      toast({
        title: "❌ Test Recording Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsCreatingTest(false);
    }
  };

  // Convert AudioBuffer to WAV blob
  const bufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float samples to 16-bit PCM
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  // Test the full recording pipeline
  const testRecordingPipeline = async () => {
    setIsTestingRecording(true);
    try {
      console.log('🧪 Testing recording pipeline...');
      
      if (user?.id) {
        // Test authenticated user recording
        const result = await testAuthenticatedRecording();
        if (result.success) {
          toast({
            title: "✅ Authenticated Recording Test Passed",
            description: "Database insertion successful for authenticated user",
            variant: "default"
          });
        } else {
          throw new Error(`Authenticated test failed: ${result.error}`);
        }
      } else {
        // Test guest recording
        const result = await testGuestRecording();
        if (result.success) {
          toast({
            title: "✅ Guest Recording Test Passed",
            description: "Database insertion successful for guest user",
            variant: "default"
          });
        } else {
          throw new Error(`Guest test failed: ${result.error}`);
        }
      }
      
      await loadDatabaseRecordings();
      
    } catch (error) {
      console.error('❌ Recording pipeline test failed:', error);
      toast({
        title: "❌ Recording Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsTestingRecording(false);
    }
  };

  // Load database recordings for inspection
  const loadDatabaseRecordings = async () => {
    setIsLoadingDatabase(true);
    try {
      const result = await checkDatabaseRecordings();
      if (result.success) {
        setDatabaseRecordings(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to load recordings');
      }
    } catch (error) {
      console.error('❌ Failed to load database recordings:', error);
      toast({
        title: "❌ Database Load Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsLoadingDatabase(false);
    }
  };

  // Check available storage buckets first
  const checkStorageBuckets = async () => {
    try {
      console.log('🔍 Checking available storage buckets...');
      
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('❌ Failed to list buckets:', error);
        return { success: false, error };
      }
      
      console.log('📦 Available buckets:', buckets);
      return { success: true, buckets };
      
    } catch (error) {
      console.error('❌ Bucket listing exception:', error);
      return { success: false, error };
    }
  };

  // Try to create voice recordings bucket (may fail due to RLS)
  const createVoiceRecordingsBucket = async () => {
    try {
      console.log('🔨 Attempting to create voice-recordings bucket...');
      console.log('⚠️ Note: This may fail due to RLS policies - that\'s normal');
      
      const { data, error } = await supabase.storage.createBucket('voice-recordings', {
        public: false, // Private bucket
        allowedMimeTypes: ['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4'],
        fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
      });
      
      if (error) {
        console.error('❌ Bucket creation failed (likely RLS policy):', error);
        
        // Check if bucket actually exists despite the error
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.find(b => b.name === 'voice-recordings');
        
        if (bucketExists) {
          console.log('✅ Bucket exists despite creation error - RLS prevented creation but bucket is available');
          return { success: true, data: bucketExists, note: 'Bucket exists (RLS prevented creation)' };
        }
        
        return { 
          success: false, 
          error, 
          isRLSError: error.message?.includes('RLS') || error.message?.includes('policy'),
          suggestion: 'Bucket creation requires admin privileges. Contact your Supabase administrator to create the voice-recordings bucket.'
        };
      }
      
      console.log('✅ Bucket created successfully:', data);
      return { success: true, data };
      
    } catch (error) {
      console.error('❌ Bucket creation exception:', error);
      return { success: false, error };
    }
  };

  // Comprehensive bucket diagnostic test
  const runComprehensiveBucketTest = async () => {
    try {
      console.log('🧪🔍 Running comprehensive bucket diagnostics...');
      
      if (!user?.id) {
        throw new Error('User authentication required for upload test');
      }

      const results = {
        bucketList: null as any,
        voiceBucketExists: false,
        memoryBucketExists: false,
        uploadTest: null as any,
        pathTest: null as any,
        conflictCheck: null as any
      };

      // 1. List all buckets
      console.log('🔍 Step 1: Listing all buckets...');
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      results.bucketList = { buckets: buckets || [], error: bucketError };
      
      if (buckets) {
        results.voiceBucketExists = buckets.some(b => b.name === 'voice-recordings');
        results.memoryBucketExists = buckets.some(b => b.name === 'memory-images');
        console.log('📦 Available buckets:', buckets.map(b => b.name));
        console.log('✅ voice-recordings exists:', results.voiceBucketExists);
        console.log('✅ memory-images exists:', results.memoryBucketExists);
      }

      // 2. Test upload to voice-recordings
      if (results.voiceBucketExists) {
        console.log('🔍 Step 2: Testing upload to voice-recordings...');
        const testBlob = new Blob(['test audio data'], { type: 'audio/wav' });
        const testPath = `${user.id}/diagnostic-test-${Date.now()}.wav`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('voice-recordings')
          .upload(testPath, testBlob, {
            contentType: 'audio/wav',
            cacheControl: '3600'
          });
        
        results.uploadTest = { 
          success: !uploadError, 
          data: uploadData, 
          error: uploadError,
          path: testPath
        };
        
        if (uploadData) {
          console.log('✅ Upload successful to:', uploadData.path);
          
          // Clean up test file
          await supabase.storage.from('voice-recordings').remove([testPath]);
          console.log('🧹 Test file cleaned up');
        }
      }

      // 3. Test path listing  
      console.log('🔍 Step 3: Testing path listing...');
      const { data: files, error: listError } = await supabase.storage
        .from('voice-recordings')
        .list(user.id, { limit: 5 });
      
      results.pathTest = {
        success: !listError,
        files: files || [],
        error: listError,
        userFolder: user.id
      };

      // 4. Check for naming conflicts
      console.log('🔍 Step 4: Checking for naming conflicts...');
      const conflictTests = [];
      
      // Test if 'voice-recordings' might be confused with 'memory-images'
      const testPaths = [
        'voice-recordings',
        'memory-images', 
        'voice_recordings',
        'recordings',
        'audio'
      ];
      
      for (const testBucket of testPaths) {
        try {
          const { data: testList } = await supabase.storage
            .from(testBucket)
            .list('', { limit: 1 });
          conflictTests.push({ bucket: testBucket, accessible: true });
        } catch {
          conflictTests.push({ bucket: testBucket, accessible: false });
        }
      }
      
      results.conflictCheck = conflictTests;

      console.log('📊 Diagnostic Results:', results);
      
      return { success: true, results };
      
    } catch (error) {
      console.error('❌ Comprehensive test exception:', error);
      return { success: false, error, results: null };
    }
  };

  // Test upload without creating bucket (for RLS environments)
  const testUploadWithoutBucketCreation = async () => {
    const result = await runComprehensiveBucketTest();
    
    if (result.success && result.results) {
      const { results } = result;
      
      if (!results.voiceBucketExists) {
        return {
          success: false,
          error: { message: 'voice-recordings bucket not found in Supabase' },
          suggestion: 'The voice-recordings bucket does not exist in your Supabase project. Please create it in the Supabase dashboard.'
        };
      }
      
      if (!results.uploadTest.success) {
        return {
          success: false,
          error: results.uploadTest.error,
          suggestion: 'Upload failed - check bucket permissions and RLS policies.'
        };
      }
      
      return {
        success: true,
        data: results.uploadTest.data,
        diagnostics: results
      };
    }
    
    return result;
  };

  // Inspect storage bucket
  const inspectStorage = async () => {
    try {
      console.log('🔍 Inspecting storage bucket...');
      
      // First check if buckets exist
      const bucketCheck = await checkStorageBuckets();
      if (!bucketCheck.success) {
        throw new Error(`Bucket check failed: ${bucketCheck.error}`);
      }
      
      const voiceBucket = bucketCheck.buckets?.find(b => b.name === 'voice-recordings');
      if (!voiceBucket) {
        console.log('⚠️ voice-recordings bucket not found, attempting to create...');
        
        const createResult = await createVoiceRecordingsBucket();
        if (!createResult.success) {
          throw new Error(`Failed to create bucket: ${createResult.error}`);
        }
        
        toast({
          title: "✅ Storage Bucket Created",
          description: "voice-recordings bucket created successfully",
          variant: "default"
        });
      }
      
      // Now try to list files
      const { data: files, error } = await supabase.storage
        .from('voice-recordings')
        .list(user?.id || 'guest', {
          limit: 20,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        // If folder doesn't exist, that's okay - it will be created when first file is uploaded
        if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
          console.log('📁 User folder does not exist yet - will be created on first upload');
          setStorageInspection({
            files: [],
            userFolder: user?.id || 'guest',
            totalFiles: 0,
            buckets: bucketCheck.buckets,
            bucketExists: true,
            folderExists: false
          });
        } else {
          throw error;
        }
      } else {
        setStorageInspection({
          files: files || [],
          userFolder: user?.id || 'guest',
          totalFiles: files?.length || 0,
          buckets: bucketCheck.buckets,
          bucketExists: true,
          folderExists: true
        });
      }

      toast({
        title: "📁 Storage Inspected",
        description: `Found ${files?.length || 0} files in storage. Bucket exists: ${voiceBucket ? 'Yes' : 'No'}`,
        variant: "default"
      });

    } catch (error) {
      console.error('❌ Storage inspection failed:', error);
      toast({
        title: "❌ Storage Inspection Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  // Load database recordings on component mount
  useEffect(() => {
    loadDatabaseRecordings();
  }, []);

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const getEventIcon = (level: DiagnosticEvent['level']) => {
    switch (level) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'debug': return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: DiagnosticEvent['category']) => {
    switch (category) {
      case 'voice_recording': return <Mic className="w-4 h-4" />;
      case 'memory_saving': return <Archive className="w-4 h-4" />;
      case 'archive_display': return <FileAudio className="w-4 h-4" />;
      case 'database': return <Database className="w-4 h-4" />;
      case 'system': return <Activity className="w-4 h-4" />;
    }
  };

  const getBusinessFriendlyMessage = (event: DiagnosticEvent): { title: string; description?: string } => {
    // Convert technical events to user-friendly messages
    switch (event.event) {
      case 'memory_save_requested':
        return { title: 'Memory save started', description: 'User created a new memory' };
      case 'memory_database_insert_success':
        return { title: 'Memory saved successfully', description: 'Memory stored in archive' };
      case 'memory_database_insert_failed':
        return { title: 'Memory save failed', description: 'Unable to save memory - check connection' };
      case 'recording_start_requested':
        return { title: 'Voice recording started', description: 'Microphone recording activated' };
      case 'media_apis_supported':
        return { title: 'Microphone ready', description: 'Browser supports voice recording' };
      case 'microphone_permission_granted':
        return { title: 'Microphone access granted', description: 'User allowed microphone use' };
      case 'microphone_permission_denied':
        return { title: 'Microphone access denied', description: 'User blocked microphone - check browser settings' };
      case 'recordings_loaded_success':
        return { title: 'Archive loaded successfully', description: `Found ${event.details.recordingCount || 0} recordings` };
      case 'archive_load_failed':
        return { title: 'Archive loading failed', description: 'Unable to load voice recordings' };
      case 'connectivity_success':
        return { title: 'Database connected', description: 'System is online and ready' };
      case 'validation_started':
        return { title: 'System check started', description: 'Running voice archive diagnostics' };
      case 'validation_completed':
        return { title: 'System check completed', description: event.details.success ? 'All systems working' : 'Issues found' };
      default:
        // Fallback: make technical names more readable
        const readable = event.event
          .replace(/_/g, ' ')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .toLowerCase();
        return { title: readable.charAt(0).toUpperCase() + readable.slice(1) };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <FileAudio className="w-5 h-5" />
                Voice Archive Diagnostics
              </CardTitle>
              <CardDescription className="text-slate-300">
                Validate voice recording, memory saving, and archive display functionality
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="border-slate-600 hover:bg-slate-700"
              >
                {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {autoRefresh ? 'Pause' : 'Auto Refresh'}
              </Button>
              <Button
                size="sm"
                onClick={runValidation}
                disabled={isValidating}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isValidating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Run Validation
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {getStatusIcon(validationResult.success)}
              Validation Results
              <Badge variant={validationResult.success ? "default" : "destructive"}>
                {validationResult.success ? 'PASSED' : 'FAILED'}
              </Badge>
            </CardTitle>
            <CardDescription className="text-slate-300">
              Validation ID: {validationResult.validationId} | {new Date(validationResult.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-white">{validationResult.voiceRecordingCount}</div>
                <div className="text-sm text-slate-300">Voice Recordings</div>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-white">{validationResult.memoryCount}</div>
                <div className="text-sm text-slate-300">Memories</div>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-400">
                  {validationResult.archiveDisplayErrors.length + 
                   validationResult.databaseErrors.length + 
                   validationResult.recordingServiceErrors.length}
                </div>
                <div className="text-sm text-slate-300">Total Errors</div>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-400">{validationResult.recommendations.length}</div>
                <div className="text-sm text-slate-300">Recommendations</div>
              </div>
            </div>

            {/* Errors */}
            {(validationResult.databaseErrors.length > 0 || 
              validationResult.archiveDisplayErrors.length > 0 || 
              validationResult.recordingServiceErrors.length > 0) && (
              <div className="space-y-3">
                <h4 className="text-white font-medium">Issues Found</h4>
                
                {validationResult.databaseErrors.length > 0 && (
                  <Alert className="border-red-600 bg-red-900/20">
                    <Database className="h-4 w-4" />
                    <AlertDescription className="text-red-200">
                      <strong>Database Errors:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {validationResult.databaseErrors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {validationResult.recordingServiceErrors.length > 0 && (
                  <Alert className="border-yellow-600 bg-yellow-900/20">
                    <Mic className="h-4 w-4" />
                    <AlertDescription className="text-yellow-200">
                      <strong>Recording Service Errors:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {validationResult.recordingServiceErrors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {validationResult.archiveDisplayErrors.length > 0 && (
                  <Alert className="border-orange-600 bg-orange-900/20">
                    <Archive className="h-4 w-4" />
                    <AlertDescription className="text-orange-200">
                      <strong>Archive Display Errors:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {validationResult.archiveDisplayErrors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Recommendations */}
            {validationResult.recommendations.length > 0 && (
              <div>
                <h4 className="text-white font-medium mb-2">Recommendations</h4>
                <div className="space-y-1">
                  {validationResult.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diagnostic Events */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList className="bg-slate-800/50 border-slate-700">
          <TabsTrigger value="recent">Recent Events</TabsTrigger>
          <TabsTrigger value="testing">Testing Tools</TabsTrigger>
          <TabsTrigger value="database-inspect">Database Inspector</TabsTrigger>
          <TabsTrigger value="storage-inspect">Storage Inspector</TabsTrigger>
          <TabsTrigger value="generator">Recording Generator</TabsTrigger>
          <TabsTrigger value="voice">Voice Recording</TabsTrigger>
          <TabsTrigger value="memory">Memory Saving</TabsTrigger>
          <TabsTrigger value="archive">Archive Display</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        <TabsContent value="testing">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Recording Testing Tools
              </CardTitle>
              <CardDescription className="text-slate-300">
                Create test recordings and validate the recording pipeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-slate-900/50 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      Create Test Recording
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                      Generate a synthetic test recording that will appear in the Archive
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={createTestRecording} 
                      disabled={isCreatingTest}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isCreatingTest ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {isCreatingTest ? 'Creating Test Recording...' : 'Create Test Recording'}
                    </Button>
                    <p className="text-xs text-slate-400 mt-2">
                      Creates a 5-second synthetic audio file with metadata and saves it to your archive.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Test Recording Pipeline
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                      Test database insertion and recording service functionality
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={async () => {
                        setIsTestingRecording(true);
                        try {
                          console.log('🔍🚨 RLS POLICY TEST - Testing voice_recordings table INSERT permissions');
                          
                          if (!user?.id) {
                            throw new Error('User authentication required for RLS test');
                          }

                          // Test 1: Try to INSERT into voice_recordings table
                          console.log('📝 Step 1: Testing INSERT into voice_recordings table...');
                          const testData = {
                            user_id: user.id,
                            session_id: `rls-test-${Date.now()}`,
                            recording_type: 'test',
                            storage_path: 'test/path.webm',
                            original_filename: 'test.webm',
                            file_size_bytes: 1000,
                            duration_seconds: 5.0,
                            mime_type: 'audio/webm',
                            transcript_text: 'RLS test recording',
                            conversation_summary: 'Test for RLS policy validation',
                            session_mode: 'rls_test'
                          };
                          
                          const { data: insertData, error: insertError } = await supabase
                            .from('voice_recordings')
                            .insert([testData])
                            .select()
                            .single();
                          
                          if (insertError) {
                            console.error('❌ voice_recordings INSERT failed - RLS BLOCKING:', insertError);
                            throw new Error(`RLS Policy Blocks INSERT: ${insertError.message}`);
                          }
                          
                          console.log('✅ voice_recordings INSERT successful:', insertData);
                          
                          // Test 2: Try to SELECT from voice_recordings table
                          console.log('📝 Step 2: Testing SELECT from voice_recordings table...');
                          const { data: selectData, error: selectError } = await supabase
                            .from('voice_recordings')
                            .select('*')
                            .eq('user_id', user.id)
                            .limit(5);
                          
                          if (selectError) {
                            console.error('❌ voice_recordings SELECT failed - RLS BLOCKING:', selectError);
                          } else {
                            console.log('✅ voice_recordings SELECT successful, found records:', selectData?.length || 0);
                          }
                          
                          // Test 3: Storage bucket RLS test
                          console.log('📝 Step 3: Testing storage bucket upload permissions...');
                          const testBlob = new Blob(['RLS test audio'], { type: 'audio/wav' });
                          const testStoragePath = `${user.id}/rls-test-${Date.now()}.wav`;
                          
                          const { data: storageData, error: storageError } = await supabase.storage
                            .from('voice-recordings')
                            .upload(testStoragePath, testBlob, {
                              contentType: 'audio/wav'
                            });
                          
                          if (storageError) {
                            console.error('❌ Storage upload failed - RLS/Policy BLOCKING:', storageError);
                            throw new Error(`Storage RLS Blocks Upload: ${storageError.message}`);
                          }
                          
                          console.log('✅ Storage upload successful:', storageData);
                          
                          // Test 4: Verify file actually exists and can be retrieved
                          console.log('📝 Step 4: Verifying file exists and can be retrieved...');
                          const { data: urlData } = supabase.storage
                            .from('voice-recordings')
                            .getPublicUrl(testStoragePath);
                          
                          if (urlData?.publicUrl) {
                            const response = await fetch(urlData.publicUrl);
                            if (response.ok) {
                              const blob = await response.blob();
                              console.log('✅ File retrieval successful:', {
                                size: blob.size,
                                type: blob.type,
                                url: urlData.publicUrl
                              });
                            } else {
                              console.warn('⚠️ File uploaded but retrieval failed:', response.status);
                            }
                          }
                          
                          // Clean up test data
                          await supabase
                            .from('voice_recordings')
                            .delete()
                            .eq('id', insertData.id);
                            
                          await supabase.storage
                            .from('voice-recordings')
                            .remove([testStoragePath]);
                          
                          console.log('🧹 Test data cleaned up');
                          
                          toast({
                            title: "✅ RLS & File Save Test PASSED",
                            description: "Database INSERT, storage upload, and file retrieval all work correctly",
                            variant: "default"
                          });
                          
                        } catch (error: any) {
                          console.error('❌🚨 RLS TEST FAILED:', error);
                          toast({
                            title: "❌ RLS Policy Blocking",
                            description: error.message || 'RLS policies prevent recording operations',
                            variant: "destructive"
                          });
                        } finally {
                          setIsTestingRecording(false);
                        }
                      }}
                      disabled={isTestingRecording}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      {isTestingRecording ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                      {isTestingRecording ? 'Testing RLS...' : 'Test RLS Policies'}
                    </Button>
                    <p className="text-xs text-slate-400 mt-2">
                      Tests if RLS policies allow INSERT to voice_recordings table and storage uploads.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Audio File Save Testing */}
              <div className="grid grid-cols-1 gap-4">
                <Card className="bg-slate-900/50 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      Audio File Save Test
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                      Test complete audio file save & retrieval process with on-screen confirmation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={async () => {
                        if (!user?.id) {
                          toast({
                            title: "Authentication Required",
                            description: "Please log in to test audio file saves",
                            variant: "destructive"
                          });
                          return;
                        }

                        setIsTestingRecording(true);
                        try {
                          console.log('🎵📁 COMPREHENSIVE AUDIO FILE SAVE TEST');
                          
                          // Step 1: Create real audio content
                          console.log('🎵 Step 1: Creating test audio with real content...');
                          const audioContext = new AudioContext();
                          const duration = 3; // 3 seconds
                          const sampleRate = audioContext.sampleRate;
                          const numberOfChannels = 1;
                          const length = sampleRate * duration;
                          
                          const audioBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);
                          const channelData = audioBuffer.getChannelData(0);
                          
                          // Create a more complex audio signal (multiple tones + voice simulation)
                          for (let i = 0; i < length; i++) {
                            const time = i / sampleRate;
                            const tone1 = Math.sin(2 * Math.PI * 440 * time) * 0.1; // 440Hz
                            const tone2 = Math.sin(2 * Math.PI * 880 * time) * 0.05; // 880Hz  
                            const noise = (Math.random() - 0.5) * 0.02; // Some noise
                            channelData[i] = tone1 + tone2 + noise;
                          }

                          // Convert to WAV blob
                          const wavBlob = bufferToWav(audioBuffer);
                          console.log('✅ Audio created:', {
                            duration: `${duration}s`,
                            size: `${(wavBlob.size / 1024).toFixed(1)}KB`,
                            sampleRate: `${sampleRate}Hz`,
                            channels: numberOfChannels
                          });

                          // Step 2: Upload to storage with detailed path tracking
                          const timestamp = Date.now();
                          const filename = `audio_save_test_${timestamp}.wav`;
                          const storagePath = `${user.id}/${filename}`;
                          
                          console.log('☁️ Step 2: Uploading to storage...');
                          console.log('📁 Storage path:', storagePath);
                          
                          const { data: uploadData, error: uploadError } = await supabase.storage
                            .from('voice-recordings')
                            .upload(storagePath, wavBlob, {
                              contentType: 'audio/wav',
                              cacheControl: '3600'
                            });

                          if (uploadError) {
                            console.error('❌ Upload failed:', uploadError);
                            throw new Error(`Storage upload failed: ${uploadError.message}`);
                          }

                          console.log('✅ Upload successful:', uploadData);
                          
                          // Step 3: Verify file exists in storage
                          console.log('🔍 Step 3: Verifying file exists in storage...');
                          const { data: listData, error: listError } = await supabase.storage
                            .from('voice-recordings')
                            .list(user.id, {
                              search: filename
                            });

                          if (listError || !listData?.find(f => f.name === filename)) {
                            throw new Error('File not found in storage after upload!');
                          }

                          console.log('✅ File verified in storage:', filename);

                          // Step 4: Get download URL
                          console.log('🔗 Step 4: Getting download URL...');
                          const { data: urlData } = supabase.storage
                            .from('voice-recordings')
                            .getPublicUrl(storagePath);

                          if (!urlData?.publicUrl) {
                            throw new Error('Failed to get download URL');
                          }

                          console.log('✅ Download URL generated:', urlData.publicUrl);

                          // Step 5: Test file retrieval
                          console.log('📥 Step 5: Testing file retrieval...');
                          const response = await fetch(urlData.publicUrl);
                          if (!response.ok) {
                            throw new Error(`File retrieval failed: ${response.status} ${response.statusText}`);
                          }

                          const retrievedBlob = await response.blob();
                          console.log('✅ File retrieved:', {
                            size: `${(retrievedBlob.size / 1024).toFixed(1)}KB`,
                            type: retrievedBlob.type,
                            matches: retrievedBlob.size === wavBlob.size ? 'Yes' : 'No'
                          });

                          // Step 6: Save to database with complete metadata
                          console.log('💾 Step 6: Saving to database...');
                          const { data: dbData, error: dbError } = await supabase
                            .from('voice_recordings')
                            .insert({
                              user_id: user.id,
                              session_id: `audio-save-test-${timestamp}`,
                              recording_type: 'audio_save_test',
                              storage_path: uploadData.path,
                              original_filename: filename,
                              file_size_bytes: wavBlob.size,
                              duration_seconds: duration,
                              mime_type: 'audio/wav',
                              transcript_text: '[Audio Save Test] Multi-tone test audio with 440Hz + 880Hz frequencies',
                              conversation_summary: `Audio file save test - ${duration}s test audio with multiple tones`,
                              session_mode: 'audio_file_test',
                              conversation_phase: 'completed',
                              memory_ids: [],
                              topics: ['audio_test', 'file_save', 'diagnostics'],
                              // Add metadata about the audio content
                              metadata: {
                                testType: 'audio_save_verification',
                                audioContent: 'multi-tone_test_signal',
                                frequencies: [440, 880],
                                createdBy: 'admin_diagnostics'
                              }
                            })
                            .select()
                            .single();

                          if (dbError) {
                            console.error('❌ Database save failed:', dbError);
                            throw new Error(`Database save failed: ${dbError.message}`);
                          }

                          console.log('✅ Database record created:', dbData.id);

                          // Step 7: Verify complete roundtrip
                          console.log('🔄 Step 7: Testing complete roundtrip...');
                          const { data: retrievedRecord } = await supabase
                            .from('voice_recordings')
                            .select('*')
                            .eq('id', dbData.id)
                            .single();

                          if (!retrievedRecord) {
                            throw new Error('Database record not found after creation!');
                          }

                          // Step 8: Test audio playback capability
                          console.log('🔊 Step 8: Creating audio element for playback test...');
                          const audio = new Audio(urlData.publicUrl);
                          
                          // Test that audio can be loaded (don't actually play it to avoid noise)
                          await new Promise((resolve, reject) => {
                            audio.addEventListener('canplaythrough', () => {
                              console.log('✅ Audio playback ready');
                              resolve(true);
                            });
                            audio.addEventListener('error', (e) => {
                              console.error('❌ Audio playback error:', e);
                              reject(new Error('Audio playback test failed'));
                            });
                            audio.load();
                            
                            // Timeout after 5 seconds
                            setTimeout(() => reject(new Error('Audio load timeout')), 5000);
                          });

                          // Success! Display comprehensive results
                          const results = {
                            fileSize: wavBlob.size,
                            storagePath: uploadData.path,
                            downloadUrl: urlData.publicUrl,
                            databaseId: dbData.id,
                            duration: duration,
                            roundtripSuccess: true,
                            playbackReady: true
                          };

                          console.log('🎉 AUDIO FILE SAVE TEST - COMPLETE SUCCESS!', results);

                          toast({
                            title: "✅ Audio File Save Test - PASSED",
                            description: `File saved, retrieved & verified! Size: ${(wavBlob.size/1024).toFixed(1)}KB | Duration: ${duration}s | DB ID: ${dbData.id}`,
                            variant: "default"
                          });

                          // Refresh database view to show new record
                          await loadDatabaseRecordings();
                          loadRecentEvents();

                          // Clean up test file (optional - comment out to keep for inspection)
                          // await supabase.storage.from('voice-recordings').remove([storagePath]);
                          // await supabase.from('voice_recordings').delete().eq('id', dbData.id);
                          
                        } catch (error: any) {
                          console.error('❌🚨 AUDIO FILE SAVE TEST FAILED:', error);
                          toast({
                            title: "❌ Audio File Save Test - FAILED",
                            description: error.message || 'Audio file save/retrieval process failed',
                            variant: "destructive"
                          });
                        } finally {
                          setIsTestingRecording(false);
                        }
                      }}
                      disabled={isTestingRecording}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isTestingRecording ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <HardDrive className="w-4 h-4" />
                      )}
                      {isTestingRecording ? 'Testing Audio Save...' : 'Test Audio File Save & Retrieval'}
                    </Button>
                    <p className="text-xs text-slate-400 mt-2">
                      Creates real audio content, saves to storage, verifies retrieval, tests playback capability, and confirms database integration.
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <Alert className="border-blue-600 bg-blue-900/20">
                <TestTube className="h-4 w-4" />
                <AlertDescription className="text-blue-200">
                  <strong>Testing Status:</strong> These tools help validate that the recording system is working correctly.
                  Test recordings will appear in your Archive and can be played back like normal recordings.
                </AlertDescription>
              </Alert>
              
              <Alert className="border-red-600 bg-red-900/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-200">
                  <strong>RLS Policy Check:</strong> Click "Test RLS Policies" to verify if Row Level Security is blocking voice recording operations.
                  Common RLS issues:
                  <br/>• voice_recordings table has RLS enabled but no INSERT policy for users
                  <br/>• Storage bucket has RLS policies blocking file uploads
                  <br/>• User authentication not properly linked to RLS policies
                  <br/>• Database table doesn't exist or has wrong permissions
                </AlertDescription>
              </Alert>
              
              <Alert className="border-blue-600 bg-blue-900/20">
                <TestTube className="h-4 w-4" />
                <AlertDescription className="text-blue-200">
                  <strong>Connection Diagnostic:</strong> Click "Full Diagnostic" to verify Supabase connection.
                  <br/>• Shows which Supabase project you're connected to
                  <br/>• Lists ALL available buckets in your project
                  <br/>• Tests actual file upload to voice-recordings bucket
                  <br/>• Check browser console (F12) for detailed results
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database-inspect">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Database Inspector
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Direct access to voice recordings database contents
                  </CardDescription>
                </div>
                <Button 
                  onClick={loadDatabaseRecordings} 
                  disabled={isLoadingDatabase}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isLoadingDatabase ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {isLoadingDatabase ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <div className="text-sm text-slate-300 mb-2">
                    <strong>Total Recordings Found:</strong> {databaseRecordings.length}
                  </div>
                  <div className="text-xs text-slate-400">
                    Last refreshed: {new Date().toLocaleTimeString()}
                  </div>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {databaseRecordings.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                      No recordings found in database
                    </div>
                  ) : (
                    databaseRecordings.map((recording, i) => (
                      <div key={recording.id} className="bg-slate-900/50 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-white font-medium">Recording #{i + 1}</div>
                            <div className="text-slate-300">
                              <strong>ID:</strong> {recording.id}
                            </div>
                            <div className="text-slate-300">
                              <strong>User ID:</strong> {recording.user_id}
                            </div>
                            <div className="text-slate-300">
                              <strong>Session:</strong> {recording.session_id}
                            </div>
                            <div className="text-slate-300">
                              <strong>Type:</strong> {recording.recording_type}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-300">
                              <strong>Duration:</strong> {recording.duration_seconds}s
                            </div>
                            <div className="text-slate-300">
                              <strong>Size:</strong> {(recording.file_size_bytes / 1024).toFixed(1)}KB
                            </div>
                            <div className="text-slate-300">
                              <strong>Created:</strong> {new Date(recording.created_at).toLocaleString()}
                            </div>
                            <div className="text-slate-300">
                              <strong>Storage:</strong> {recording.storage_path}
                            </div>
                            {recording.memory_ids && recording.memory_ids.length > 0 && (
                              <div className="text-slate-300">
                                <strong>Memories:</strong> {recording.memory_ids.length}
                              </div>
                            )}
                          </div>
                        </div>
                        {recording.conversation_summary && (
                          <div className="mt-2 pt-2 border-t border-slate-600">
                            <div className="text-xs text-slate-400">
                              <strong>Summary:</strong> {recording.conversation_summary}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage-inspect">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <HardDrive className="w-5 h-5" />
                    Storage Inspector
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Direct access to Supabase storage bucket contents
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-3 min-w-fit">
                  <Button 
                    onClick={inspectStorage} 
                    size="default"
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Search className="w-4 h-4" />
                    Inspect Storage
                  </Button>
                  <Button 
                    onClick={async () => {
                      try {
                        console.log('🔍🚨 SUPABASE CONNECTION DIAGNOSTIC');
                        console.log('Supabase URL:', supabase.supabaseUrl);
                        console.log('User:', user);
                        
                        // Check if voice_recordings table exists by attempting a simple query
                        console.log('📝 Testing voice_recordings table access...');
                        const { data: tableTest, error: tableError } = await supabase
                          .from('voice_recordings')
                          .select('id')
                          .limit(1);
                        
                        if (tableError) {
                          console.error('❌ voice_recordings table access failed:', tableError);
                          if (tableError.message?.includes('relation') || tableError.message?.includes('does not exist')) {
                            throw new Error('voice_recordings table does not exist in database!');
                          } else if (tableError.message?.includes('RLS') || tableError.message?.includes('policy')) {
                            console.warn('⚠️ RLS policies may be blocking voice_recordings table access');
                          }
                        } else {
                          console.log('✅ voice_recordings table accessible, found records:', tableTest?.length || 0);
                        }
                        
                        // First, list all buckets to see what's actually available
                        console.log('📦 Listing ALL buckets in Supabase project...');
                        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
                        
                        if (bucketError) {
                          console.error('❌ Failed to list buckets:', bucketError);
                          throw new Error(`Cannot list buckets: ${bucketError.message}`);
                        }
                        
                        console.log('📦 Available buckets:', buckets);
                        const bucketNames = buckets?.map(b => b.name) || [];
                        console.log('🏷️ Bucket names:', bucketNames);
                        
                        const hasVoiceRecordings = bucketNames.includes('voice-recordings');
                        const hasMemoryImages = bucketNames.includes('memory-images');
                        
                        console.log('✅ voice-recordings exists:', hasVoiceRecordings);
                        console.log('✅ memory-images exists:', hasMemoryImages);
                        
                        if (!hasVoiceRecordings) {
                          throw new Error(`voice-recordings bucket not found! Available buckets: ${bucketNames.join(', ') || 'none'}`);
                        }
                        
                        // Now test upload
                        if (!user?.id) {
                          throw new Error('User authentication required');
                        }

                        console.log('🧪 Testing file upload to voice-recordings...');
                        const testContent = 'Test audio file content';
                        const testBlob = new Blob([testContent], { type: 'audio/wav' });
                        const testPath = `${user.id}/diagnostic-test-${Date.now()}.wav`;
                        
                        console.log('📤 Uploading test file to path:', testPath);
                        
                        const { data, error } = await supabase.storage
                          .from('voice-recordings')
                          .upload(testPath, testBlob, {
                            contentType: 'audio/wav',
                            cacheControl: '3600'
                          });

                        if (error) {
                          console.error('❌ Upload failed:', error);
                          throw new Error(`Upload failed: ${error.message}`);
                        }

                        console.log('✅ Test file uploaded successfully to:', data.path);
                        
                        // Clean up
                        await supabase.storage
                          .from('voice-recordings')
                          .remove([testPath]);
                        
                        console.log('🧹 Test file cleaned up');
                        
                        toast({
                          title: "✅ Connection Test PASSED",
                          description: `Buckets: ${bucketNames.length} | Table: ${tableError ? 'Error' : 'OK'} | Upload: Success`,
                          variant: "default"
                        });
                        
                      } catch (error: any) {
                        console.error('❌🚨 DIAGNOSTIC FAILED:', error);
                        toast({
                          title: "❌ Connection/Upload Failed", 
                          description: error.message || 'Check console for details',
                          variant: "destructive"
                        });
                      }
                    }}
                    size="default"
                    className="bg-blue-600 hover:bg-blue-700 font-medium"
                  >
                    <TestTube className="w-4 h-4" />
                    Full Diagnostic
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {storageInspection ? (
                  <>
                    <div className="bg-slate-900/50 p-3 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-white font-medium">User Folder</div>
                          <div className="text-slate-300">{storageInspection.userFolder}</div>
                        </div>
                        <div>
                          <div className="text-white font-medium">Total Files</div>
                          <div className="text-slate-300">{storageInspection.totalFiles}</div>
                        </div>
                        <div>
                          <div className="text-white font-medium">Bucket</div>
                          <div className="text-slate-300">voice-recordings</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {storageInspection.files.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                          No files found in storage bucket
                        </div>
                      ) : (
                        storageInspection.files.map((file: any, i: number) => (
                          <div key={file.name} className="bg-slate-900/50 p-3 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="text-white font-medium">File #{i + 1}</div>
                                <div className="text-slate-300">
                                  <strong>Name:</strong> {file.name}
                                </div>
                                <div className="text-slate-300">
                                  <strong>Size:</strong> {file.metadata?.size ? (file.metadata.size / 1024).toFixed(1) + 'KB' : 'Unknown'}
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-300">
                                  <strong>Created:</strong> {new Date(file.created_at).toLocaleString()}
                                </div>
                                <div className="text-slate-300">
                                  <strong>Updated:</strong> {new Date(file.updated_at).toLocaleString()}
                                </div>
                                <div className="text-slate-300">
                                  <strong>Type:</strong> {file.metadata?.mimetype || 'Unknown'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    Click "Inspect Storage" to view storage bucket contents
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generator">
          <MemoryRecordingManager />
        </TabsContent>

        <TabsContent value="recent">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">All Recent Events</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={loadRecentEvents} className="border-slate-600">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportDiagnostics} className="border-slate-600">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearDiagnostics} className="border-slate-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentEvents.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    No diagnostic events recorded yet
                  </div>
                ) : (
                  recentEvents.map((event, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                      <div className="flex items-center gap-2 mt-0.5">
                        {getCategoryIcon(event.category)}
                        {getEventIcon(event.level)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">
                            {getBusinessFriendlyMessage(event).title}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {event.category.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {getBusinessFriendlyMessage(event).description && (
                          <div className="text-sm text-slate-300 mb-2">
                            {getBusinessFriendlyMessage(event).description}
                          </div>
                        )}
                        {event.level === 'error' && Object.keys(event.details).length > 0 && (
                          <div className="text-xs text-red-300 bg-red-900/20 p-2 rounded border border-red-600/30">
                            <strong>Error details:</strong> {event.details.error || 'Technical issue occurred'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Category-specific tabs */}
        {['voice_recording', 'memory_saving', 'archive_display', 'database'].map(category => (
          <TabsContent key={category} value={category.split('_')[0]}>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white capitalize">
                  {category.replace('_', ' ')} Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recentEvents
                    .filter(e => e.category === category)
                    .map((event, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                        {getEventIcon(event.level)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">{event.event}</span>
                            <span className="text-xs text-slate-400">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          {Object.keys(event.details).length > 0 && (
                            <pre className="text-xs text-slate-300 bg-slate-800 p-2 rounded overflow-x-auto">
                              {JSON.stringify(event.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};