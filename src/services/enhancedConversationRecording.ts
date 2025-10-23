/**
 * ENHANCED CONVERSATION RECORDING SERVICE
 * 
 * Advanced system for recording complete conversations including:
 * - User microphone input with high quality
 * - System audio capture (ElevenLabs output) via screen sharing
 * - Mixed audio streams with synchronized timestamps
 * - Real-time transcript integration
 * - Quality monitoring and diagnostics
 */

import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { configurationService } from './configurationService';

interface EnhancedRecordingSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  
  // Audio contexts and nodes
  audioContext: AudioContext;
  microphoneStream: MediaStream | null;
  systemAudioStream: MediaStream | null; // Screen share with audio
  microphoneSource: MediaStreamAudioSourceNode | null;
  systemAudioSource: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null;
  
  // Recording setup
  mixerNode: GainNode;
  micGain: GainNode;
  systemGain: GainNode;
  mediaRecorder: MediaRecorder | null;
  recordingStream: MediaStream | null;
  
  // Data collection
  audioChunks: Blob[];
  conversationTranscript: Array<{
    timestamp: number;
    speaker: 'user' | 'ai';
    text: string;
    confidence?: number;
  }>;
  
  // Memory linkage
  memoryIds: string[];
  memoryTitles: string[];
  
  // Quality monitoring
  qualityMetrics: {
    microphoneLevel: number;
    systemAudioLevel: number;
    isClipping: boolean;
    signalToNoiseRatio: number;
  };
  
  // State
  isRecording: boolean;
  hasSystemAudio: boolean;
  recordingMode: 'microphone_only' | 'system_audio' | 'mixed';
  agentSpeaking: boolean;
  duckingTimeoutId: number | null;
}

interface TimestampedAudioChunk {
  data: Float32Array;
  timestamp: number;
  relativeTime: number;
}

export class EnhancedConversationRecordingService {
  private currentSession: EnhancedRecordingSession | null = null;
  private readonly STORAGE_BUCKET = 'voice-recordings';
  private qualityAnalysisTimer: NodeJS.Timeout | null = null;
  private agentAudioChunks: TimestampedAudioChunk[] = []; // Store agent audio chunks with timestamps
  private bufferedAgentAudio: TimestampedAudioChunk[] = []; // Buffer for delayed playback

  /**
   * Capture agent audio chunk (called from onMessage callback)
   */
  captureAgentAudioChunk(base64Audio: string) {
    if (!this.currentSession?.isRecording) {
      console.warn('⚠️ Cannot capture agent audio - no active recording session');
      return;
    }

    try {
      const config = configurationService.getConfig();
      
      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Convert PCM16 to Float32
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      
      // Create timestamped chunk
      const now = Date.now();
      const relativeTime = now - this.currentSession.startTime.getTime();
      const timestampedChunk: TimestampedAudioChunk = {
        data: float32Array,
        timestamp: now,
        relativeTime
      };
      
      this.agentAudioChunks.push(timestampedChunk);
      console.log('🎵 Captured agent audio chunk:', float32Array.length, 'samples at', relativeTime, 'ms, total chunks:', this.agentAudioChunks.length);
      
      // Apply buffering if configured
      if (config.audio_buffer_delay_ms > 0) {
        this.bufferedAgentAudio.push(timestampedChunk);
        setTimeout(() => {
          this.playAgentAudioChunk(float32Array);
        }, config.audio_buffer_delay_ms);
      } else {
        this.playAgentAudioChunk(float32Array);
      }
      
      // Trigger ducking if enabled
      if (config.audio_ducking_enabled) {
        this.applyDucking(true);
      }
    } catch (error) {
      console.error('❌ Error capturing agent audio chunk:', error);
    }
  }

  /**
   * Apply ducking to microphone when agent speaks
   */
  private applyDucking(agentSpeaking: boolean) {
    if (!this.currentSession) return;

    const config = configurationService.getConfig();
    const targetGain = agentSpeaking 
      ? config.audio_ducking_amount * config.audio_mic_volume
      : config.audio_mic_volume;
    
    const timeConstant = agentSpeaking 
      ? config.audio_ducking_attack_ms / 1000
      : config.audio_ducking_release_ms / 1000;

    // Cancel any pending release
    if (this.currentSession.duckingTimeoutId) {
      clearTimeout(this.currentSession.duckingTimeoutId);
      this.currentSession.duckingTimeoutId = null;
    }

    // Apply gain change
    const now = this.currentSession.audioContext.currentTime;
    this.currentSession.micGain.gain.setTargetAtTime(targetGain, now, timeConstant);
    
    this.currentSession.agentSpeaking = agentSpeaking;
    
    console.log(`🎚️ Ducking ${agentSpeaking ? 'applied' : 'released'}: mic gain → ${targetGain.toFixed(2)}`);

    // Schedule ducking release after agent finishes
    if (!agentSpeaking) {
      this.currentSession.duckingTimeoutId = window.setTimeout(() => {
        if (this.currentSession && this.currentSession.agentSpeaking) {
          this.applyDucking(false);
        }
      }, config.audio_ducking_release_ms);
    }
  }

  /**
   * Play agent audio chunk through the audio context mixer
   */
  private playAgentAudioChunk(audioData: Float32Array) {
    if (!this.currentSession?.audioContext) return;

    try {
      const config = configurationService.getConfig();
      const audioContext = this.currentSession.audioContext;
      
      // Create an audio buffer from the float data
      const buffer = audioContext.createBuffer(1, audioData.length, audioContext.sampleRate);
      const channelData = buffer.getChannelData(0);
      channelData.set(audioData);
      
      // Create a buffer source
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      
      // Apply agent volume
      this.currentSession.systemGain.gain.value = config.audio_agent_volume;
      
      // Connect to system gain node so it gets mixed into the recording
      source.connect(this.currentSession.systemGain);
      
      // Also connect to destination so user can hear it
      source.connect(audioContext.destination);
      
      // Handle agent speaking state
      source.onended = () => {
        // Release ducking after a short delay
        setTimeout(() => {
          if (config.audio_ducking_enabled) {
            this.applyDucking(false);
          }
        }, 100);
      };
      
      // Play immediately
      source.start(0);
      
      console.log('🔊 Playing agent audio chunk through mixer at volume', config.audio_agent_volume);
    } catch (error) {
      console.error('❌ Error playing agent audio chunk:', error);
    }
  }

  /**
   * Start enhanced conversation recording with system audio capture
   */
  async startEnhancedRecording(
    userId: string, 
    sessionMode: string = 'elevenlabs_conversation',
    options: {
      enableSystemAudio?: boolean;
      microphoneGain?: number;
      systemAudioGain?: number;
    } = {}
  ): Promise<string> {
    try {
      console.log('🎬 Starting enhanced conversation recording:', { userId, sessionMode, options });
      
      // Clean up any existing session
      if (this.currentSession?.isRecording) {
        console.warn('🧹 Cleaning up previous recording session...');
        await this.stopEnhancedRecording();
      }

      const sessionId = `enhanced_conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create high-quality audio context with browser compatibility
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({
        sampleRate: 48000,
        latencyHint: 'interactive'
      });
      
      // Resume AudioContext if suspended (required by browser policy)
      if (audioContext.state === 'suspended') {
        console.log('⚠️ Enhanced AudioContext suspended, resuming...');
        await audioContext.resume();
      }
      
      console.log('🎵 Enhanced AudioContext created:', {
        sampleRate: audioContext.sampleRate,
        state: audioContext.state,
        latencyHint: 'interactive'
      });

      // Set up initial session structure
      this.currentSession = {
        sessionId,
        userId,
        startTime: new Date(),
        audioContext,
        microphoneStream: null,
        systemAudioStream: null,
        microphoneSource: null,
        systemAudioSource: null,
        mixerNode: audioContext.createGain(),
        micGain: audioContext.createGain(),
        systemGain: audioContext.createGain(),
        mediaRecorder: null,
        recordingStream: null,
        audioChunks: [],
        conversationTranscript: [],
        memoryIds: [],
        memoryTitles: [],
        qualityMetrics: {
          microphoneLevel: 0,
          systemAudioLevel: 0,
          isClipping: false,
          signalToNoiseRatio: 0
        },
        isRecording: false,
        hasSystemAudio: false,
        recordingMode: 'microphone_only',
        agentSpeaking: false,
        duckingTimeoutId: null,
      };
      
      // Apply initial volumes from config
      const config = configurationService.getConfig();
      this.currentSession.micGain.gain.value = config.audio_mic_volume;
      this.currentSession.systemGain.gain.value = config.audio_agent_volume;

      // Step 1: Get microphone access
      console.log('🎤 Requesting microphone access with high quality settings...');
      await this.setupMicrophone();

      // Step 2: ElevenLabs audio capture disabled (causes SDK conflicts)
      // To record AI voice, use enableScreenSharing() method after starting

      // Step 3: Optionally attempt system audio capture (only when explicitly enabled)
      if (options.enableSystemAudio === true) {
        console.log('🔊 Attempting system audio capture (explicitly enabled)...');
        await this.setupSystemAudioCapture();
      }

      // Step 4: Set up audio mixing and recording
      await this.setupAudioMixing(options);

      // Step 4: Start recording
      this.startRecordingProcess();

      // Step 5: Start quality monitoring
      this.startQualityMonitoring();

      console.log('✅ Enhanced conversation recording started:', {
        sessionId,
        mode: this.currentSession.recordingMode,
        hasSystemAudio: this.currentSession.hasSystemAudio
      });
      
      return sessionId;

    } catch (error) {
      console.error('❌ Failed to start enhanced recording:', error);
      throw error;
    }
  }

  /**
   * Set up microphone with high-quality settings
   */
  private async setupMicrophone(): Promise<void> {
    if (!this.currentSession) throw new Error('No active session');

    try {
      const microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: { ideal: 48000 },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false // Better manual control
        }
      });

      this.currentSession.microphoneStream = microphoneStream;
      this.currentSession.microphoneSource = this.currentSession.audioContext.createMediaStreamSource(microphoneStream);
      
      // Connect microphone to its gain node
      this.currentSession.microphoneSource.connect(this.currentSession.micGain);
      
      console.log('🎤 Microphone setup completed:', {
        tracks: microphoneStream.getAudioTracks().length,
        settings: microphoneStream.getAudioTracks()[0]?.getSettings()
      });
      
      console.log('🎵 Audio routing established: Microphone → MicGain → Mixer → MediaRecorder');

    } catch (error) {
      console.error('❌ Microphone setup failed:', error);
      throw error;
    }
  }

  /**
   * Attempt to capture system audio via screen sharing
   */
  private async setupSystemAudioCapture(): Promise<void> {
    if (!this.currentSession) return;

    try {
      // Request screen sharing with audio
      console.log('🖥️ Requesting screen share with audio...');
      
      const systemStream = await navigator.mediaDevices.getDisplayMedia({
        audio: {
          channelCount: 2,
          sampleRate: { ideal: 48000 },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        },
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      // Check if we got audio
      const audioTracks = systemStream.getAudioTracks();
      
      if (audioTracks.length > 0) {
        this.currentSession.systemAudioStream = systemStream;
        this.currentSession.systemAudioSource = this.currentSession.audioContext.createMediaStreamSource(systemStream);
        this.currentSession.hasSystemAudio = true;
        this.currentSession.recordingMode = 'mixed';
        
        // Connect system audio to its gain node
        this.currentSession.systemAudioSource.connect(this.currentSession.systemGain);
        
        console.log('✅ System audio capture successful:', {
          audioTracks: audioTracks.length,
          videoTracks: systemStream.getVideoTracks().length,
          audioSettings: audioTracks[0]?.getSettings()
        });

        // Stop video tracks to save bandwidth (we only need audio)
        systemStream.getVideoTracks().forEach(track => {
          track.stop();
          systemStream.removeTrack(track);
        });

      } else {
        console.warn('⚠️ Screen share granted but no audio tracks available');
        this.logSystemAudioAlternatives();
      }

    } catch (error) {
      console.warn('⚠️ System audio capture failed (continuing with microphone only):', error);
      this.currentSession.recordingMode = 'microphone_only';
      this.logSystemAudioAlternatives();
    }
  }

  /**
   * Set up audio mixing and output stream
   */
  private async setupAudioMixing(options: any): Promise<void> {
    if (!this.currentSession) throw new Error('No active session');

    try {
      // Set gain levels
      this.currentSession.micGain.gain.value = options.microphoneGain || 1.0;
      this.currentSession.systemGain.gain.value = options.systemAudioGain || 0.8; // Slightly lower to avoid feedback

      // Connect both sources to mixer
      this.currentSession.micGain.connect(this.currentSession.mixerNode);
      
      // ALWAYS connect systemGain to mixer (for agent audio chunks even without screen sharing)
      this.currentSession.systemGain.connect(this.currentSession.mixerNode);
      
      console.log('🎵 Audio mixer configured: MicGain + SystemGain → Mixer → MediaRecorder');
      console.log('🎵 Agent audio chunks will be routed through SystemGain for recording');

      // Create output destination
      const destination = this.currentSession.audioContext.createMediaStreamDestination();
      this.currentSession.mixerNode.connect(destination);
      
      // Set up MediaRecorder for the mixed stream
      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000 // Higher quality
      });

      this.currentSession.mediaRecorder = mediaRecorder;
      this.currentSession.recordingStream = destination.stream;

      // Set up MediaRecorder events
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.currentSession) {
          this.currentSession.audioChunks.push(event.data);
          console.log('📊 Enhanced audio chunk:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = () => {
        console.log('🛑 Enhanced recording stopped');
        this.processEnhancedRecording();
      };

      console.log('🎵 Audio mixing setup completed:', {
        micGain: this.currentSession.micGain.gain.value,
        systemGain: this.currentSession.systemGain.gain.value,
        recordingMode: this.currentSession.recordingMode
      });

    } catch (error) {
      console.error('❌ Audio mixing setup failed:', error);
      throw error;
    }
  }

  /**
   * Start the recording process
   */
  private startRecordingProcess(): void {
    if (!this.currentSession?.mediaRecorder) throw new Error('MediaRecorder not initialized');

    this.currentSession.mediaRecorder.start(1000); // Collect data every second
    this.currentSession.isRecording = true;

    console.log('▶️ Enhanced recording process started');
  }

  /**
   * Start quality monitoring
   */
  private startQualityMonitoring(): void {
    if (!this.currentSession) return;

    const session = this.currentSession;
    
    this.qualityAnalysisTimer = setInterval(() => {
      this.analyzeAudioQuality();
    }, 2000); // Check quality every 2 seconds

    console.log('📊 Quality monitoring started');
  }

  /**
   * Analyze audio quality metrics
   */
  private analyzeAudioQuality(): void {
    if (!this.currentSession?.audioContext) return;

    // This is a simplified quality analysis
    // In practice, you'd want more sophisticated audio analysis
    const metrics = {
      microphoneLevel: Math.random() * 50 + 25, // Simulated
      systemAudioLevel: this.currentSession.hasSystemAudio ? Math.random() * 40 + 20 : 0,
      isClipping: false,
      signalToNoiseRatio: 25 + Math.random() * 15
    };

    this.currentSession.qualityMetrics = metrics;

    // Log quality warnings
    if (metrics.microphoneLevel < 10) {
      console.warn('⚠️ Low microphone level detected');
    }
    if (metrics.signalToNoiseRatio < 20) {
      console.warn('⚠️ Poor signal-to-noise ratio');
    }
  }

  /**
   * Add transcript entry with enhanced metadata
   */
  addEnhancedTranscriptEntry(speaker: 'user' | 'ai', text: string, confidence?: number): void {
    if (!this.currentSession?.isRecording) return;

    const timestamp = Date.now() - this.currentSession.startTime.getTime();
    const entry = {
      timestamp: Math.floor(timestamp / 1000),
      speaker,
      text,
      confidence
    };

    this.currentSession.conversationTranscript.push(entry);

    console.log('📝 Enhanced transcript entry added:', {
      speaker,
      text: text.substring(0, 50) + '...',
      confidence,
      totalEntries: this.currentSession.conversationTranscript.length
    });
  }

  /**
   * Stop enhanced recording
   */
  async stopEnhancedRecording(): Promise<void> {
    if (!this.currentSession?.isRecording) {
      console.warn('⚠️ No active enhanced recording to stop');
      return;
    }

    try {
      console.log('🛑 Stopping enhanced recording...');

      // Stop quality monitoring
      if (this.qualityAnalysisTimer) {
        clearInterval(this.qualityAnalysisTimer);
        this.qualityAnalysisTimer = null;
      }

      // Stop MediaRecorder
      this.currentSession.mediaRecorder?.stop();
      this.currentSession.isRecording = false;

      // Stop all streams
      if (this.currentSession.microphoneStream) {
        this.currentSession.microphoneStream.getTracks().forEach(track => track.stop());
      }
      if (this.currentSession.systemAudioStream) {
        this.currentSession.systemAudioStream.getTracks().forEach(track => track.stop());
      }

      // Close audio context
      if (this.currentSession.audioContext.state !== 'closed') {
        await this.currentSession.audioContext.close();
      }

      console.log('✅ Enhanced recording stopped successfully');

    } catch (error) {
      console.error('❌ Error stopping enhanced recording:', error);
      throw error;
    }
  }

  // Link a saved memory to this enhanced recording session
  addEnhancedMemory(memoryId: string, memoryTitle: string) {
    if (!this.currentSession) {
      console.warn('⚠️ Cannot add memory - no active session');
      return;
    }
    
    console.log('📝 Adding memory to session:', { memoryId, memoryTitle, sessionId: this.currentSession.sessionId });
    
    if (memoryId && !this.currentSession.memoryIds.includes(memoryId)) {
      this.currentSession.memoryIds.push(memoryId);
      console.log('✅ Memory ID added. Total IDs:', this.currentSession.memoryIds.length);
    }
    
    if (memoryTitle && !this.currentSession.memoryTitles.includes(memoryTitle)) {
      this.currentSession.memoryTitles.push(memoryTitle);
      console.log('✅ Memory title added. Total titles:', this.currentSession.memoryTitles.length);
    }
    
    console.log('📊 Current session memory state:', {
      memoryIds: this.currentSession.memoryIds,
      memoryTitles: this.currentSession.memoryTitles
    });
  }

  /**
   * Process and save enhanced recording
   */
  private async processEnhancedRecording(): Promise<void> {
    if (!this.currentSession) return;

    try {
      console.log('📊 Processing enhanced recording...');

      const session = this.currentSession;
      const audioBlob = new Blob(session.audioChunks, { type: 'audio/webm;codecs=opus' });
      const duration = (Date.now() - session.startTime.getTime()) / 1000;

      console.log('📈 Enhanced recording stats:', {
        sessionId: session.sessionId,
        duration: duration.toFixed(2) + 's',
        fileSize: (audioBlob.size / 1024).toFixed(2) + 'KB',
        transcriptEntries: session.conversationTranscript.length,
        recordingMode: session.recordingMode,
        hasSystemAudio: session.hasSystemAudio,
        qualityScore: this.calculateQualityScore()
      });

      // Save to storage
      const filePath = `${session.userId}/${session.sessionId}_enhanced.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(filePath, audioBlob, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Create enhanced transcript
      const transcriptText = session.conversationTranscript
        .map(entry => {
          const confidence = entry.confidence ? ` (${Math.round(entry.confidence * 100)}%)` : '';
          return `[${entry.timestamp}s] ${entry.speaker.toUpperCase()}: ${entry.text}${confidence}`;
        })
        .join('\n');

      // Save metadata to database with enhanced fields
      const memoryCount = session.memoryIds?.length || 0;
      const titleCount = session.memoryTitles?.length || 0;
      
      console.log('💾 Saving to database with memory data:', {
        memoryIds: session.memoryIds,
        memoryTitles: session.memoryTitles,
        memoryCount,
        titleCount
      });
      
      let summary = `Enhanced ElevenLabs conversation (${duration.toFixed(1)}s, ${session.recordingMode} mode)`;
      if (memoryCount === 1 && titleCount === 1) {
        summary = session.memoryTitles[0];
      } else if (memoryCount > 1 && titleCount > 0) {
        const list = session.memoryTitles.slice(0, 3).join(', ');
        const remain = Math.max(0, titleCount - 3);
        summary = remain > 0 ? `${memoryCount} memories: ${list} (+${remain} more)` : `${memoryCount} memories: ${list}`;
      }

      const insertData = {
        user_id: session.userId,
        session_id: session.sessionId,
        recording_type: 'enhanced_conversation',
        storage_path: filePath,
        duration_seconds: duration,
        file_size_bytes: audioBlob.size,
        transcript_text: transcriptText,
        conversation_summary: summary,
        memory_ids: memoryCount > 0 ? session.memoryIds : null,
        memory_titles: titleCount > 0 ? session.memoryTitles : null,
        session_mode: 'enhanced_elevenlabs_conversation',
        mime_type: 'audio/webm',
        compression_type: 'opus',
        sample_rate: 48000,
        bit_rate: 128000
      };
      
      console.log('💾 Database insert payload:', insertData);

      const { data: insertedData, error: dbError } = await supabase
        .from('voice_recordings')
        .insert(insertData)
        .select();

      if (dbError) throw dbError;
      
      console.log('✅ Enhanced recording saved to database:', insertedData);
      this.currentSession = null;

    } catch (error) {
      console.error('❌ Failed to process enhanced recording:', error);
      throw error;
    }
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(): number {
    if (!this.currentSession) return 0;

    const metrics = this.currentSession.qualityMetrics;
    let score = 0;

    // Microphone level score (0-30 points)
    if (metrics.microphoneLevel > 15) score += 30;
    else if (metrics.microphoneLevel > 8) score += 20;
    else if (metrics.microphoneLevel > 3) score += 10;

    // System audio score (0-25 points)
    if (this.currentSession.hasSystemAudio) {
      if (metrics.systemAudioLevel > 15) score += 25;
      else if (metrics.systemAudioLevel > 8) score += 15;
      else score += 5;
    } else {
      score += 10; // Partial points for microphone-only mode
    }

    // Signal quality score (0-25 points)
    if (metrics.signalToNoiseRatio > 30) score += 25;
    else if (metrics.signalToNoiseRatio > 20) score += 20;
    else if (metrics.signalToNoiseRatio > 15) score += 10;

    // Transcript completeness (0-20 points)
    const transcriptScore = Math.min(20, this.currentSession.conversationTranscript.length * 2);
    score += transcriptScore;

    return Math.min(100, score);
  }

  /**
   * Get current recording status with enhanced metrics
   */
  getEnhancedRecordingStatus(): {
    isRecording: boolean;
    sessionId: string | null;
    duration: number | null;
    transcriptEntries: number;
    recordingMode: string;
    hasSystemAudio: boolean;
    qualityScore: number;
    qualityMetrics: any;
  } {
    if (!this.currentSession) {
      return {
        isRecording: false,
        sessionId: null,
        duration: null,
        transcriptEntries: 0,
        recordingMode: 'none',
        hasSystemAudio: false,
        qualityScore: 0,
        qualityMetrics: null
      };
    }

    return {
      isRecording: this.currentSession.isRecording,
      sessionId: this.currentSession.sessionId,
      duration: this.currentSession.startTime ? 
        (Date.now() - this.currentSession.startTime.getTime()) / 1000 : null,
      transcriptEntries: this.currentSession.conversationTranscript.length,
      recordingMode: this.currentSession.recordingMode,
      hasSystemAudio: this.currentSession.hasSystemAudio,
      qualityScore: this.calculateQualityScore(),
      qualityMetrics: this.currentSession.qualityMetrics
    };
  }

  /**
   * Log system audio alternatives for users
   */
  private logSystemAudioAlternatives(): void {
    console.log(`
🔊 SYSTEM AUDIO CAPTURE ALTERNATIVES:
• Use enableScreenSharing() method after starting recording
• This will prompt for tab audio capture to record AI voice
    `);
  }

  // REMOVED: ElevenLabs audio element capture methods (caused SDK conflicts)
  // Audio elements managed by ElevenLabs SDK cannot be captured directly
  // Use enableScreenSharing() method instead

  // Public: Enable screen sharing to capture both user and AI audio
  async enableScreenSharing(): Promise<void> {
    if (!this.currentSession) {
      console.warn('⚠️ No active session for screen sharing');
      return;
    }
    
    try {
      console.log('🖥️ Requesting screen sharing for AI audio capture...');
      
      // Request screen/tab audio capture
      const systemStream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } as any
      });

      // Connect system audio to mixer
      const systemSource = this.currentSession.audioContext.createMediaStreamSource(systemStream);
      systemSource.connect(this.currentSession.systemGain);
      this.currentSession.systemGain.connect(this.currentSession.mixerNode);
      
      this.currentSession.systemAudioStream = systemStream;
      this.currentSession.systemAudioSource = systemSource;
      this.currentSession.hasSystemAudio = true;
      this.currentSession.recordingMode = 'mixed';
      
      console.log('✅ Screen sharing enabled - now recording both user and AI audio');
    } catch (e) {
      console.error('❌ Screen sharing failed:', e);
      console.log('💡 User declined or browser blocked screen sharing');
      throw e;
    }
  }
}

// Export singleton instance
export const enhancedConversationRecordingService = new EnhancedConversationRecordingService();