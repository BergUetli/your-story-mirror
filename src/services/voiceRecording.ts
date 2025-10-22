/**
 * VOICE RECORDING SERVICE
 * 
 * Handles conversation audio capture, compression, and storage for voice search functionality.
 * Optimized for cost-effective storage with high-quality compression.
 */

import { supabase } from '@/integrations/supabase/client';
import { logVoiceRecording } from '@/services/diagnosticLogger';
import { toast } from '@/hooks/use-toast';

export interface RecordingConfig {
  mimeType: string;
  audioBitsPerSecond: number;
  sampleRate: number;
  channelCount: number;
}

export interface TranscriptEntry {
  timestamp: number; // Milliseconds from session start
  speaker: 'user' | 'ai';
  text: string;
}

export interface RecordingSession {
  sessionId: string;
  userId: string;
  sessionMode: string;
  startTime: Date;
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  isRecording: boolean;
  conversationTranscript: TranscriptEntry[];
  memoryIds: string[];
}

export interface VoiceRecordingMetadata {
  sessionId: string;
  recordingType: 'conversation' | 'memory_creation' | 'voice_search';
  duration: number;
  fileSize: number;
  transcript?: string;
  summary?: string;
  memoryIds?: string[];
  topics?: string[];
  sessionMode?: string;
  conversationPhase?: string;
}

export class VoiceRecordingService {
  private currentSession: RecordingSession | null = null;
  private readonly STORAGE_BUCKET = 'voice-recordings';
  
  // Optimized recording configuration for cost/quality balance
  private readonly DEFAULT_CONFIG: RecordingConfig = {
    mimeType: 'audio/webm;codecs=opus', // Best compression ratio
    audioBitsPerSecond: 64000,          // Good quality, small size
    sampleRate: 48000,                  // Standard rate
    channelCount: 1                     // Mono for voice
  };

  /**
   * Start recording a conversation session
   */
  async startRecording(userId: string, sessionMode: string): Promise<string> {
    try {
      console.log('🎤 Starting voice recording for session mode:', sessionMode);
      console.log('👤 User ID:', userId);
      console.log('🎙️ Checking MediaRecorder support...');
      
      logVoiceRecording('info', 'recording_start_requested', { 
        userId, 
        sessionMode,
        hasMediaRecorder: !!window.MediaRecorder,
        hasGetUserMedia: !!(navigator.mediaDevices?.getUserMedia)
      });
      
      // Force cleanup any stale sessions before starting new one
      if (this.currentSession?.isRecording) {
        console.warn('⚠️ Found stale recording session, cleaning up...');
        try {
          // Stop any active MediaRecorder
          if (this.currentSession.mediaRecorder) {
            this.currentSession.mediaRecorder.stop();
            const stream = this.currentSession.mediaRecorder.stream;
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
          }
        } catch (error) {
          console.warn('⚠️ Error cleaning up stale session:', error);
        }
        
        // Reset session state
        this.currentSession = null;
        console.log('✅ Stale session cleaned up, proceeding with new recording');
      }

      // Check MediaRecorder support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        logVoiceRecording('error', 'mediadevices_unsupported', { userId, sessionMode });
        throw new Error('MediaDevices API not supported');
      }

      if (!window.MediaRecorder) {
        logVoiceRecording('error', 'mediarecorder_unsupported', { userId, sessionMode });
        throw new Error('MediaRecorder API not supported');
      }

      console.log('✅ MediaRecorder API supported');
      logVoiceRecording('info', 'media_apis_supported', { userId, sessionMode });

      // Generate unique session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🆔 Generated session ID:', sessionId);

      // Get user media with optimized settings
      console.log('🎧 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: this.DEFAULT_CONFIG.channelCount,
          sampleRate: this.DEFAULT_CONFIG.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('🎧 Microphone access granted');
      console.log('🔊 Audio stream details:', {
        tracks: stream.getAudioTracks().length,
        active: stream.active,
        settings: stream.getAudioTracks()[0]?.getSettings()
      });

      // Create MediaRecorder with compression
      console.log('📹 Creating MediaRecorder with config:', this.DEFAULT_CONFIG);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.DEFAULT_CONFIG.mimeType,
        audioBitsPerSecond: this.DEFAULT_CONFIG.audioBitsPerSecond
      });
      
      console.log('✅ MediaRecorder created successfully');
      console.log('🎤 MediaRecorder state:', mediaRecorder.state);
      console.log('🎵 MediaRecorder mimeType:', mediaRecorder.mimeType);

      // Initialize session
      this.currentSession = {
        sessionId,
        userId,
        sessionMode,
        startTime: new Date(),
        mediaRecorder,
        audioChunks: [],
        isRecording: false,
        conversationTranscript: [],
        memoryIds: []
      };

      // Setup event handlers
      mediaRecorder.ondataavailable = (event) => {
        console.log('📊 Data available event:', {
          dataSize: event.data.size,
          dataType: event.data.type,
          currentChunks: this.currentSession?.audioChunks.length || 0
        });
        if (event.data.size > 0 && this.currentSession) {
          this.currentSession.audioChunks.push(event.data);
          console.log(`📦 Audio chunk added (${event.data.size} bytes). Total chunks: ${this.currentSession.audioChunks.length}`);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('🛑 MediaRecorder stop event fired');
        this.handleRecordingStop();
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
      };

      // Start recording
      console.log('🔴 Starting MediaRecorder...');
      mediaRecorder.start(5000); // Collect chunks every 5 seconds
      this.currentSession.isRecording = true;
      
      console.log('🎤 MediaRecorder started. State:', mediaRecorder.state);

      console.log('✅ Voice recording started successfully!');
      console.log('🎤 Session details:', {
        sessionId,
        userId,
        sessionMode,
        recorderState: mediaRecorder.state,
        isRecording: this.currentSession.isRecording
      });
      return sessionId;

    } catch (error) {
      console.error('❌ Failed to start voice recording:', error);
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop recording and save to storage
   */
  async stopRecording(): Promise<VoiceRecordingMetadata | null> {
    if (!this.currentSession || !this.currentSession.isRecording) {
      console.warn('⚠️ No active recording to stop');
      return null;
    }

    try {
      console.log('🛑 Stopping voice recording:', this.currentSession.sessionId);
      
      // Stop the MediaRecorder
      this.currentSession.mediaRecorder?.stop();
      
      // Stop all tracks to free up microphone
      const stream = this.currentSession.mediaRecorder?.stream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      this.currentSession.isRecording = false;
      
      // The actual processing happens in handleRecordingStop
      return null; // Will be returned asynchronously
      
    } catch (error) {
      console.error('❌ Failed to stop voice recording:', error);
      throw error;
    }
  }

  /**
   * Add transcript text to current session with timestamp
   */
  addTranscript(text: string, speaker: 'user' | 'ai' = 'user'): void {
    if (this.currentSession && text.trim()) {
      const timestamp = Date.now() - this.currentSession.startTime.getTime();
      this.currentSession.conversationTranscript.push({
        timestamp,
        speaker,
        text: text.trim()
      });
    }
  }

  /**
   * Add memory ID to current session
   */
  addMemoryId(memoryId: string): void {
    if (this.currentSession && !this.currentSession.memoryIds.includes(memoryId)) {
      this.currentSession.memoryIds.push(memoryId);
    }
  }

  /**
   * Get current recording status
   */
  getRecordingStatus(): { isRecording: boolean; sessionId?: string; duration?: number } {
    if (!this.currentSession) {
      return { isRecording: false };
    }

    const duration = this.currentSession.isRecording 
      ? (Date.now() - this.currentSession.startTime.getTime()) / 1000
      : 0;

    return {
      isRecording: this.currentSession.isRecording,
      sessionId: this.currentSession.sessionId,
      duration
    };
  }

  /**
   * Handle recording stop and process audio
   */
  private async handleRecordingStop(): Promise<VoiceRecordingMetadata | null> {
    if (!this.currentSession) {
      console.log('⚠️ No current session when trying to stop recording');
      return null;
    }

    try {
      console.log('📦 Processing recorded audio for session:', this.currentSession.sessionId);
      console.log('📊 Session details before processing:', {
        sessionId: this.currentSession.sessionId,
        userId: this.currentSession.userId,
        sessionMode: this.currentSession.sessionMode,
        audioChunks: this.currentSession.audioChunks.length,
        transcript: this.currentSession.conversationTranscript.length,
        memoryIds: this.currentSession.memoryIds.length
      });
      
      const session = this.currentSession;
      const endTime = new Date();
      const duration = (endTime.getTime() - session.startTime.getTime()) / 1000;
      console.log('⏱️ Recording duration:', duration, 'seconds');

      // Combine audio chunks into single blob
      console.log('🔧 Combining audio chunks...');
      const audioBlob = new Blob(session.audioChunks, { 
        type: this.DEFAULT_CONFIG.mimeType 
      });

      console.log('🎵 Audio blob created:', {
        size: audioBlob.size,
        duration: duration,
        type: audioBlob.type,
        chunksUsed: session.audioChunks.length
      });

      // Skip upload if recording is too short or too small
      if (duration < 5 || audioBlob.size < 1000) {
        console.log('⏭️ Skipping upload: recording too short or small', {
          duration,
          audioSize: audioBlob.size,
          minDuration: 5,
          minSize: 1000
        });
        this.currentSession = null;
        return null;
      }
      
      console.log('✅ Recording meets minimum requirements, proceeding with upload');

      // Generate storage path
      const timestamp = session.startTime.toISOString().replace(/[:.]/g, '-');
      const filename = `${session.sessionId}_${timestamp}.webm`;
      const storagePath = `${session.userId}/${filename}`;

      console.log('☁️ Uploading to storage:', storagePath);

      // Check if bucket exists (but don't try to create due to RLS)
      console.log('🔍 Verifying storage bucket exists...');
      const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
      
      if (bucketListError) {
        console.warn('⚠️ Could not list buckets (this may be normal in RLS environments):', bucketListError);
      } else {
        const voiceBucket = buckets?.find(b => b.name === this.STORAGE_BUCKET);
        if (!voiceBucket) {
          console.warn('⚠️ Storage bucket "' + this.STORAGE_BUCKET + '" not found in bucket list');
          console.warn('⚠️ This may cause upload failures. Contact administrator to create the bucket.');
        } else {
          console.log('✅ Storage bucket confirmed to exist');
        }
      }

      // Upload to Supabase Storage
      console.log('☁️ Uploading audio file...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(storagePath, audioBlob, {
          contentType: this.DEFAULT_CONFIG.mimeType,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('❌ Upload failed:', uploadError);
        console.error('❌ Upload error details:', {
          message: uploadError.message,
          bucket: this.STORAGE_BUCKET,
          path: storagePath,
          fileSize: audioBlob.size
        });
        
        // Provide helpful error message for common issues
        let userFriendlyError = uploadError.message;
        if (uploadError.message?.includes('Bucket not found')) {
          userFriendlyError = `Storage bucket "${this.STORAGE_BUCKET}" does not exist. Please contact your administrator to create this bucket with audio file permissions.`;
        } else if (uploadError.message?.includes('policy')) {
          userFriendlyError = 'Upload blocked by security policy. Check your permissions or contact administrator.';
        }
        
        // Show user-friendly notification
        toast({
          title: "❌ Recording Upload Failed",
          description: userFriendlyError,
          variant: "destructive"
        });
        
        throw new Error(userFriendlyError);
      }

      console.log('✅ Audio uploaded successfully:', uploadData.path);
      console.log('📁 File details:', { size: audioBlob.size, duration, type: audioBlob.type });

      // Prepare transcript and topics
      const fullTranscript = session.conversationTranscript
        .map(entry => `[${Math.floor(entry.timestamp / 1000)}s] ${entry.speaker.toUpperCase()}: ${entry.text}`)
        .join('\n');
      const plainText = session.conversationTranscript.map(entry => entry.text).join(' ');
      const topics = this.extractTopics(plainText);
      const summary = this.generateSummary(plainText, session.memoryIds.length);

      // Save metadata to database
      console.log('💾 Preparing database record...');
      const metadata: VoiceRecordingMetadata = {
        sessionId: session.sessionId,
        recordingType: session.memoryIds.length > 0 ? 'memory_creation' : 'conversation',
        duration: Math.round(duration * 100) / 100,
        fileSize: audioBlob.size,
        transcript: fullTranscript,
        summary,
        memoryIds: session.memoryIds,
        topics,
        sessionMode: session.sessionMode,
        conversationPhase: 'completed'
      };

      console.log('💾 Saving to voice_recordings table...');
      console.log('📝 Database payload:', {
        user_id: session.userId,
        session_id: session.sessionId,
        recording_type: metadata.recordingType,
        storage_path: uploadData.path,
        duration_seconds: metadata.duration,
        file_size_bytes: audioBlob.size
      });
      
      const { data: dbData, error: dbError } = await supabase
        .from('voice_recordings')
        .insert([{
          user_id: session.userId,
          session_id: session.sessionId,
          recording_type: metadata.recordingType,
          storage_path: uploadData.path,
          original_filename: filename,
          file_size_bytes: audioBlob.size,
          duration_seconds: metadata.duration,
          mime_type: this.DEFAULT_CONFIG.mimeType,
          compression_type: 'opus',
          sample_rate: this.DEFAULT_CONFIG.sampleRate,
          bit_rate: this.DEFAULT_CONFIG.audioBitsPerSecond,
          transcript_text: fullTranscript,
          conversation_summary: summary,
          memory_ids: session.memoryIds,
          topics: topics,
          session_mode: session.sessionMode,
          conversation_phase: 'completed'
        }])
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database save failed:', dbError);
        console.error('🔍 Error details:', {
          message: dbError.message,
          code: dbError.code,
          details: dbError.details,
          hint: dbError.hint
        });
        console.error('📝 Failed payload details:', {
          user_id: session.userId,
          session_id: session.sessionId,
          user_id_type: typeof session.userId,
          user_id_length: session.userId.length,
          is_guest: session.userId.startsWith('guest-')
        });
        // Don't throw - audio is already uploaded
        
        // Show error notification
        toast({
          title: "❌ Recording Save Failed",
          description: `Failed to save recording metadata: ${dbError.message}`,
          variant: "destructive"
        });
      } else {
        console.log('✅ Recording metadata saved:', dbData.id);
        
        // Show success notification
        const fileExtension = this.DEFAULT_CONFIG.mimeType.includes('webm') ? '.webm' : '.audio';
        toast({
          title: "✅ Voice Recording Saved",
          description: `Recording ${filename} successfully saved! Duration: ${metadata.duration}s, Size: ${(audioBlob.size / 1024).toFixed(1)}KB`,
          variant: "default"
        });
      }

      // Clear current session
      this.currentSession = null;

      console.log('🎉 Voice recording processing complete:', metadata);
      return metadata;

    } catch (error) {
      console.error('❌ Failed to process recording:', error);
      this.currentSession = null;
      throw error;
    }
  }

  /**
   * Extract topics from conversation transcript
   */
  private extractTopics(transcript: string): string[] {
    const topics = new Set<string>();
    const text = transcript.toLowerCase();
    
    // Common conversation topics
    const topicKeywords = {
      family: ['family', 'mother', 'father', 'mom', 'dad', 'brother', 'sister', 'parent', 'child'],
      work: ['work', 'job', 'career', 'office', 'boss', 'colleague', 'business'],
      travel: ['travel', 'trip', 'vacation', 'visit', 'journey', 'plane', 'airport'],
      food: ['food', 'restaurant', 'cooking', 'recipe', 'dinner', 'lunch'],
      health: ['health', 'doctor', 'exercise', 'medical', 'wellness'],
      hobbies: ['hobby', 'reading', 'music', 'sports', 'painting', 'photography'],
      friends: ['friend', 'friendship', 'social', 'party', 'gathering'],
      education: ['school', 'university', 'learning', 'teacher', 'student'],
      home: ['home', 'house', 'apartment', 'moving', 'neighborhood'],
      emotions: ['happy', 'sad', 'excited', 'worried', 'grateful', 'proud']
    };

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        topics.add(topic);
      }
    });

    return Array.from(topics).slice(0, 10); // Max 10 topics
  }

  /**
   * Generate simple summary of conversation
   */
  private generateSummary(transcript: string, memoryCount: number): string {
    if (!transcript.trim()) {
      return 'No conversation content recorded.';
    }

    const length = transcript.length;
    let summary = 'Conversation ';
    
    if (memoryCount > 0) {
      summary += `where ${memoryCount} memor${memoryCount === 1 ? 'y was' : 'ies were'} created. `;
    }
    
    if (length < 100) {
      summary += 'Brief exchange.';
    } else if (length < 500) {
      summary += 'Short conversation.';
    } else if (length < 1500) {
      summary += 'Medium-length discussion.';
    } else {
      summary += 'Extended conversation.';
    }

    return summary;
  }

  /**
   * Search voice recordings
   */
  async searchRecordings(userId: string, query: string, limit: number = 10): Promise<any[]> {
    try {
      console.log('🔍 Searching voice recordings:', { userId, query, limit });

      const { data, error } = await supabase
        .from('voice_recordings')
        .select(`
          id,
          session_id,
          recording_type,
          storage_path,
          duration_seconds,
          transcript_text,
          conversation_summary,
          memory_ids,
          topics,
          session_mode,
          created_at
        `)
        .eq('user_id', userId)
        .or(`transcript_text.ilike.%${query}%,conversation_summary.ilike.%${query}%,topics.cs.{${query}}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Voice search error:', error);
        throw error;
      }

      console.log('✅ Found recordings:', data?.length || 0);
      return data || [];

    } catch (error) {
      console.error('❌ Failed to search recordings:', error);
      throw error;
    }
  }

  /**
   * Get audio URL for playback
   */
  async getAudioUrl(storagePath: string): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (error) {
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('❌ Failed to get audio URL:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired recordings (should be run periodically)
   */
  async cleanupExpiredRecordings(): Promise<number> {
    try {
      console.log('🧹 Cleaning up expired voice recordings...');

      // Find expired recordings
      const { data: expiredRecordings, error: fetchError } = await supabase
        .from('voice_recordings')
        .select('id, storage_path')
        .lt('expires_at', new Date().toISOString());

      if (fetchError) {
        throw fetchError;
      }

      if (!expiredRecordings || expiredRecordings.length === 0) {
        console.log('✅ No expired recordings to cleanup');
        return 0;
      }

      console.log(`🗑️ Found ${expiredRecordings.length} expired recordings`);

      // Delete from storage
      const storagePaths = expiredRecordings.map(r => r.storage_path);
      const { data: deleteData, error: deleteError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .remove(storagePaths);

      if (deleteError) {
        console.error('⚠️ Some files failed to delete from storage:', deleteError);
      }

      // Delete from database
      const { error: dbDeleteError } = await supabase
        .from('voice_recordings')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (dbDeleteError) {
        throw dbDeleteError;
      }

      console.log(`✅ Cleaned up ${expiredRecordings.length} expired recordings`);
      return expiredRecordings.length;

    } catch (error) {
      console.error('❌ Failed to cleanup expired recordings:', error);
      throw error;
    }
  }
}

export const voiceRecordingService = new VoiceRecordingService();

// Test function to check if guest recordings work
export const testGuestRecording = async () => {
  try {
    console.log('🧪 Testing guest recording functionality...');
    
    const guestUserId = `guest-${Date.now()}-test`;
    console.log('👤 Test guest user ID:', guestUserId);
    
    // Test database insertion with guest ID
    const { data, error } = await supabase
      .from('voice_recordings')
      .insert([{
        user_id: guestUserId,
        session_id: 'test-session-123',
        recording_type: 'test',
        storage_path: 'test/path.webm',
        original_filename: 'test.webm',
        file_size_bytes: 1000,
        duration_seconds: 10.5,
        mime_type: 'audio/webm;codecs=opus',
        transcript_text: 'This is a test recording',
        conversation_summary: 'Test recording for debugging',
        session_mode: 'test'
      }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Test recording failed:', error);
      return { success: false, error };
    } else {
      console.log('✅ Test recording succeeded:', data);
      
      // Clean up test record
      await supabase
        .from('voice_recordings')
        .delete()
        .eq('id', data.id);
      
      console.log('🧹 Test record cleaned up');
      return { success: true, data };
    }
  } catch (error) {
    console.error('❌ Test recording exception:', error);
    return { success: false, error };
  }
};

// Test function for authenticated users
export const testAuthenticatedRecording = async () => {
  try {
    console.log('🧪 Testing authenticated user recording functionality...');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ No authenticated user found:', userError);
      return { success: false, error: 'No authenticated user' };
    }
    
    console.log('👤 Test authenticated user ID:', user.id);
    
    // Test database insertion with authenticated user ID
    const { data, error } = await supabase
      .from('voice_recordings')
      .insert([{
        user_id: user.id,
        session_id: 'test-auth-session-123',
        recording_type: 'test',
        storage_path: 'test/auth-path.webm',
        original_filename: 'test-auth.webm',
        file_size_bytes: 1000,
        duration_seconds: 10.5,
        mime_type: 'audio/webm;codecs=opus',
        transcript_text: 'This is a test recording for authenticated user',
        conversation_summary: 'Test recording for authenticated user debugging',
        session_mode: 'test'
      }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Authenticated test recording failed:', error);
      return { success: false, error };
    } else {
      console.log('✅ Authenticated test recording succeeded:', data);
      
      // Clean up test record
      await supabase
        .from('voice_recordings')
        .delete()
        .eq('id', data.id);
      
      console.log('🧹 Authenticated test record cleaned up');
      return { success: true, data };
    }
  } catch (error) {
    console.error('❌ Authenticated test recording exception:', error);
    return { success: false, error };
  }
};

// Function to check what's actually in the database
export const checkDatabaseRecordings = async () => {
  try {
    console.log('🔍 Checking all voice recordings in database...');
    
    const { data, error } = await supabase
      .from('voice_recordings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Database query failed:', error);
      return { success: false, error };
    }
    
    console.log(`📊 Found ${data?.length || 0} recordings in database:`);
    data?.forEach((recording, index) => {
      console.log(`📝 Recording ${index + 1}:`, {
        id: recording.id,
        user_id: recording.user_id,
        session_id: recording.session_id,
        recording_type: recording.recording_type,
        duration: recording.duration_seconds,
        size: recording.file_size_bytes,
        created_at: recording.created_at,
        storage_path: recording.storage_path
      });
    });
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ Database check exception:', error);
    return { success: false, error };
  }
};

// Function to check guest recordings specifically
export const checkGuestRecordings = async () => {
  try {
    console.log('👤 Checking guest recordings specifically...');
    
    const { data, error } = await supabase
      .from('voice_recordings')
      .select('*')
      .like('user_id', 'guest-%')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Guest recordings query failed:', error);
      return { success: false, error };
    }
    
    console.log(`👤 Found ${data?.length || 0} guest recordings:`);
    data?.forEach((recording, index) => {
      console.log(`📝 Guest Recording ${index + 1}:`, {
        id: recording.id,
        user_id: recording.user_id,
        session_id: recording.session_id,
        created_at: recording.created_at
      });
    });
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ Guest recordings check exception:', error);
    return { success: false, error };
  }
};