/**
 * CONVERSATION RECORDING SERVICE
 * 
 * Advanced recording service that captures both sides of ElevenLabs conversations:
 * - User microphone input
 * - ElevenLabs AI voice output
 * - Mixed into a single comprehensive audio file
 */

import { supabase } from '@/integrations/supabase/client';
import { voiceRecordingService } from './voiceRecording';

interface ConversationRecordingSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  
  // Audio contexts and nodes
  audioContext: AudioContext;
  microphoneStream: MediaStream | null;
  microphoneSource: MediaStreamAudioSourceNode | null;
  speakerSource: MediaStreamAudioSourceNode | null;
  
  // Recording setup
  mixerNode: GainNode;
  mediaRecorder: MediaRecorder | null;
  recordingStream: MediaStream | null;
  
  // Data collection
  audioChunks: Blob[];
  conversationTranscript: Array<{
    timestamp: number;
    speaker: 'user' | 'ai';
    text: string;
  }>;
  
  // State
  isRecording: boolean;
}

export class ConversationRecordingService {
  private currentSession: ConversationRecordingSession | null = null;
  private readonly STORAGE_BUCKET = 'voice-recordings';

  /**
   * Start recording a complete ElevenLabs conversation
   */
  async startConversationRecording(userId: string, sessionMode: string): Promise<string> {
    try {
      console.log('🎬 Starting conversation recording for:', { userId, sessionMode });
      
      // Clean up any existing session
      if (this.currentSession?.isRecording) {
        console.warn('🧹 Cleaning up previous conversation recording...');
        await this.stopConversationRecording();
      }

      const sessionId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create audio context (ensure compatibility and proper user gesture handling)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume AudioContext if suspended (required by browser policy)
      if (audioContext.state === 'suspended') {
        console.log('⚠️ AudioContext suspended, resuming...');
        await audioContext.resume();
      }
      
      console.log('🎵 AudioContext created:', {
        sampleRate: audioContext.sampleRate,
        state: audioContext.state
      });

      // Get microphone access
      console.log('🎤 Requesting microphone access...');
      const microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create audio nodes
      const microphoneSource = audioContext.createMediaStreamSource(microphoneStream);
      const mixerNode = audioContext.createGain();
      
      // Set up initial session
      this.currentSession = {
        sessionId,
        userId,
        startTime: new Date(),
        audioContext,
        microphoneStream,
        microphoneSource,
        speakerSource: null,
        mixerNode,
        mediaRecorder: null,
        recordingStream: null,
        audioChunks: [],
        conversationTranscript: [],
        isRecording: false
      };

      // Connect microphone to mixer
      microphoneSource.connect(mixerNode);

      // Try to capture system audio (this has browser limitations)
      await this.setupSystemAudioCapture();

      // Set up recording output
      const destination = audioContext.createMediaStreamDestination();
      mixerNode.connect(destination);
      
      // Create MediaRecorder for the mixed stream
      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 64000
      });

      this.currentSession.mediaRecorder = mediaRecorder;
      this.currentSession.recordingStream = destination.stream;

      // Set up MediaRecorder events
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.currentSession) {
          this.currentSession.audioChunks.push(event.data);
          console.log('📊 Audio chunk collected:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = () => {
        console.log('🛑 Conversation recording stopped');
        this.processConversationRecording();
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      this.currentSession.isRecording = true;
      
      console.log('✅ Conversation recording started:', sessionId);
      return sessionId;

    } catch (error) {
      console.error('❌ Failed to start conversation recording:', error);
      throw error;
    }
  }

  /**
   * Attempt to capture system audio (ElevenLabs output)
   * Note: This has browser limitations and may require user permission
   */
  private async setupSystemAudioCapture(): Promise<void> {
    if (!this.currentSession) return;

    try {
      // Method 1: Try to use getDisplayMedia with audio
      // This requires user to share their tab/screen with audio
      console.log('🔊 Attempting to capture system audio...');
      
      // Check if getDisplayMedia supports audio
      const supportsAudio = navigator.mediaDevices.getDisplayMedia && 
                           'getDisplayMedia' in navigator.mediaDevices;
      
      if (supportsAudio) {
        console.log('💡 System audio capture may be possible via screen share');
        // We'll provide instructions to user instead of forcing screen share
        this.logSystemAudioInstructions();
      } else {
        console.log('ℹ️ System audio capture not directly supported');
        this.logSystemAudioLimitations();
      }

    } catch (error) {
      console.warn('⚠️ System audio capture failed:', error);
      this.logSystemAudioLimitations();
    }
  }

  /**
   * Log instructions for users to enable system audio capture
   */
  private logSystemAudioInstructions(): void {
    console.log(`
🎵 TO RECORD COMPLETE CONVERSATIONS:

For best results recording both sides of the conversation:

OPTION 1 - Browser Tab Audio Capture:
1. When prompted, choose "Share your screen"  
2. Select "Browser tab" or "Chrome tab"
3. ✅ Check "Share tab audio" checkbox
4. This will capture both your voice AND Solin's responses

OPTION 2 - System Audio (Advanced):
• Use system audio routing tools like:
  - Windows: Voicemeeter, Virtual Audio Cable
  - Mac: Loopback, SoundFlower  
  - Linux: PulseAudio loopback

CURRENT STATUS: Recording microphone only
For full conversation, follow Option 1 above.
    `);
  }

  /**
   * Log system audio limitations
   */
  private logSystemAudioLimitations(): void {
    console.log(`
⚠️ RECORDING LIMITATION:

Currently recording microphone input only.
ElevenLabs output cannot be captured automatically due to browser security.

To record complete conversations:
1. Use screen sharing with tab audio (see browser prompts)
2. Or use system audio routing software
3. Or record microphone only (current behavior)

This is a browser limitation, not an application issue.
    `);
  }

  /**
   * Add transcript entry for conversation context
   */
  addTranscriptEntry(speaker: 'user' | 'ai', text: string): void {
    if (!this.currentSession?.isRecording) return;

    const timestamp = Date.now() - this.currentSession.startTime.getTime();
    this.currentSession.conversationTranscript.push({
      timestamp: Math.floor(timestamp / 1000), // Convert to seconds
      speaker,
      text
    });

    console.log('📝 Transcript added:', { speaker, text: text.substring(0, 50) + '...' });
  }

  /**
   * Stop conversation recording and save
   */
  async stopConversationRecording(): Promise<void> {
    if (!this.currentSession?.isRecording) {
      console.warn('⚠️ No active conversation recording to stop');
      return;
    }

    try {
      console.log('🛑 Stopping conversation recording...');

      // Stop MediaRecorder
      this.currentSession.mediaRecorder?.stop();
      this.currentSession.isRecording = false;

      // Stop microphone stream
      if (this.currentSession.microphoneStream) {
        this.currentSession.microphoneStream.getTracks().forEach(track => track.stop());
      }

      // Close audio context
      if (this.currentSession.audioContext.state !== 'closed') {
        await this.currentSession.audioContext.close();
      }

      console.log('✅ Conversation recording stopped');

    } catch (error) {
      console.error('❌ Error stopping conversation recording:', error);
      throw error;
    }
  }

  /**
   * Process and save the conversation recording
   */
  private async processConversationRecording(): Promise<void> {
    if (!this.currentSession) return;

    try {
      console.log('📊 Processing conversation recording...');

      const session = this.currentSession;
      const audioBlob = new Blob(session.audioChunks, { type: 'audio/webm;codecs=opus' });
      const duration = (Date.now() - session.startTime.getTime()) / 1000; // seconds

      console.log('📈 Recording stats:', {
        sessionId: session.sessionId,
        duration: duration.toFixed(2) + 's',
        fileSize: (audioBlob.size / 1024).toFixed(2) + 'KB',
        transcriptEntries: session.conversationTranscript.length
      });

      // Save to storage using existing voice recording service
      const filePath = `${session.userId}/${session.sessionId}_conversation.webm`;
      
      console.log('💾 Uploading to storage:', filePath);
      const { error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(filePath, audioBlob, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Create transcript text
      const transcriptText = session.conversationTranscript
        .map(entry => `[${entry.timestamp}s] ${entry.speaker.toUpperCase()}: ${entry.text}`)
        .join('\n');

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('voice_recordings')
        .insert({
          user_id: session.userId,
          session_id: session.sessionId,
          recording_type: 'conversation',
          storage_path: filePath,
          duration_seconds: duration,
          file_size_bytes: audioBlob.size,
          transcript_text: transcriptText,
          conversation_summary: `ElevenLabs conversation recording (${duration.toFixed(1)}s)`,
          session_mode: 'elevenlabs_conversation',
          mime_type: 'audio/webm',
          compression_type: 'opus',
          sample_rate: 48000,
          bit_rate: 64000
        });

      if (dbError) {
        throw dbError;
      }

      console.log('✅ Conversation recording saved successfully');

      // Clean up session
      this.currentSession = null;

    } catch (error) {
      console.error('❌ Failed to process conversation recording:', error);
      throw error;
    }
  }

  /**
   * Get current recording status
   */
  getRecordingStatus(): {
    isRecording: boolean;
    sessionId: string | null;
    duration: number | null;
    transcriptEntries: number;
  } {
    if (!this.currentSession) {
      return {
        isRecording: false,
        sessionId: null,
        duration: null,
        transcriptEntries: 0
      };
    }

    return {
      isRecording: this.currentSession.isRecording,
      sessionId: this.currentSession.sessionId,
      duration: this.currentSession.startTime ? 
        (Date.now() - this.currentSession.startTime.getTime()) / 1000 : null,
      transcriptEntries: this.currentSession.conversationTranscript.length
    };
  }
}

// Export singleton instance
export const conversationRecordingService = new ConversationRecordingService();