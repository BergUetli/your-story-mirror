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
import { voiceService } from '@/services/voiceService';
import { toast } from '@/hooks/use-toast';

interface ConversationRecordingSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  
  // Audio contexts and nodes
  audioContext: AudioContext;
  microphoneStream: MediaStream | null;
  microphoneSource: MediaStreamAudioSourceNode | null;
  speakerSource: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null;
  
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
  
  // Memory tracking
  memoryIds: string[];
  memoryTitles: string[];
  
  // State
  isRecording: boolean;
  
  // Processing completion tracking
  processingComplete?: Promise<void>;
  processingResolver?: () => void;
}

export class ConversationRecordingService {
  private currentSession: ConversationRecordingSession | null = null;
  private readonly STORAGE_BUCKET = 'voice-recordings';
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private hasRegisteredUnloadHandler = false;

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

      // Improve voice clarity with light compression and gain
      const micCompressor = audioContext.createDynamicsCompressor();
      micCompressor.threshold.value = -18;
      micCompressor.knee.value = 24;
      micCompressor.attack.value = 0.003;
      micCompressor.release.value = 0.25;
      micCompressor.ratio.value = 3;

      const micGain = audioContext.createGain();
      micGain.gain.value = 1.1;
      
      // Connect mic: source -> compressor -> gain -> mixer
      microphoneSource.connect(micCompressor);
      micCompressor.connect(micGain);
      micGain.connect(mixerNode);
      
      // Set up initial session with processing promise
      let processingResolver: () => void;
      const processingComplete = new Promise<void>((resolve) => {
        processingResolver = resolve;
      });

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
        memoryIds: [],
        memoryTitles: [],
        isRecording: false,
        processingComplete,
        processingResolver: processingResolver!
      };

      // Microphone already routed through compressor/gain to mixer above

      // ENHANCED: Register for ElevenLabs audio stream notifications (primary method)
      this.registerElevenLabsAudioCapture();
      
      // Try to capture system audio (this has browser limitations - fallback method)
      await this.setupSystemAudioCapture();
      
      // Also try to hook into any existing audio elements on the page (fallback method)
      this.attemptAudioElementCapture();

      // NOTE: Avoid prompting for screen/tab sharing by default to keep UX clean
      // If full tab-audio capture is ever needed, call setupSystemAudioCapture() explicitly from UI.
      // this.setupSystemAudioCapture();

      // Set up recording output
      const destination = audioContext.createMediaStreamDestination();
      mixerNode.connect(destination);
      
      // Create MediaRecorder for the mixed stream
      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
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

      mediaRecorder.onstop = async () => {
        console.log('🛑 Conversation recording stopped');
        await this.processConversationRecording();
        // Signal that processing is complete
        this.currentSession?.processingResolver?.();
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      this.currentSession.isRecording = true;
      
      // ABRUPT TERMINATION PROTECTION: Set up auto-save mechanisms
      this.setupAbruptTerminationHandlers();
      
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
      console.log('🔊 Attempting to capture system audio for complete conversation recording...');
      
      // Check if getDisplayMedia supports audio
      const supportsDisplayMedia = navigator.mediaDevices.getDisplayMedia && 
                                 'getDisplayMedia' in navigator.mediaDevices;
      
      if (supportsDisplayMedia) {
        console.log('💡 Requesting tab audio capture for complete conversation recording...');
        
        // Show user-friendly toast notification
        toast({
          title: "🎵 Enhanced Recording Available",
          description: "To record both sides of the conversation, please share this browser tab with audio when prompted",
          variant: "default"
        });

        try {
          console.log('🎵 Requesting display media with audio...');
          
          // Request display media with audio - note: video must be true for audio in some browsers
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,   // Some browsers require video=true to get audio
            audio: {
              channelCount: 1,
              sampleRate: 48000,
              echoCancellation: false,  // Don't cancel the AI voice
              noiseSuppression: false,  // Keep AI voice clear
              autoGainControl: false    // Don't adjust AI voice volume
            }
          });
          
          console.log('📺 Display media granted:', {
            videoTracks: displayStream.getVideoTracks().length,
            audioTracks: displayStream.getAudioTracks().length,
            videoTrack: displayStream.getVideoTracks()[0]?.label,
            audioTrack: displayStream.getAudioTracks()[0]?.label
          });

          if (displayStream.getAudioTracks().length > 0) {
            console.log('✅ System audio capture successful - recording both sides!');
            
            const audioTrack = displayStream.getAudioTracks()[0];
            console.log('🎵 Audio track details:', {
              label: audioTrack.label,
              enabled: audioTrack.enabled,
              readyState: audioTrack.readyState,
              settings: audioTrack.getSettings()
            });
            
            // Create audio source from the display stream
            const displaySource = this.currentSession.audioContext.createMediaStreamSource(displayStream);
            
            // Create separate gain nodes for mixing control
            const displayGain = this.currentSession.audioContext.createGain();
            displayGain.gain.value = 0.8; // Slightly lower volume for AI voice to prevent clipping
            
            const micGain = this.currentSession.audioContext.createGain(); 
            micGain.gain.value = 1.0; // Full volume for user voice
            
            // Disconnect and reconnect microphone through gain node
            this.currentSession.microphoneSource?.disconnect();
            this.currentSession.microphoneSource?.connect(micGain);
            
            // Connect both sources to mixer
            micGain.connect(this.currentSession.mixerNode);
            displaySource.connect(displayGain);
            displayGain.connect(this.currentSession.mixerNode);
            
            // Store display source and stream for cleanup
            this.currentSession.speakerSource = displaySource;
            
            console.log('🎭 Audio mixing configured - capturing complete conversation');
            console.log('🔊 Audio routing:', {
              microphone: 'User voice → micGain → mixerNode',
              system: 'Tab audio → displayGain → mixerNode',
              output: 'mixerNode → MediaRecorder → storage'
            });
            
            toast({
              title: "✅ Complete Recording Active",
              description: "Now recording both your voice and Solin's responses! 🎵",
              variant: "default"
            });

            // Handle display stream ending (user stops sharing)
            displayStream.getAudioTracks().forEach(track => {
              track.onended = () => {
                console.log('⚠️ System audio sharing stopped - reverting to microphone only');
                toast({
                  title: "🎤 Microphone Only Recording",
                  description: "System audio sharing ended - now recording microphone only",
                  variant: "default"
                });
              };
            });

            // Stop video track if we got one (we only want audio)
            displayStream.getVideoTracks().forEach(track => {
              console.log('📹 Stopping video track to save resources:', track.label);
              track.stop();
            });

          } else {
            console.error('❌ No audio tracks in display stream');
            throw new Error('Display media granted but no audio tracks available. Make sure to check "Share tab audio" when prompted.');
          }
          
        } catch (displayError) {
          console.warn('⚠️ User declined or system audio capture failed:', displayError);
          
          // Provide specific error messages based on error type
          let errorMessage = 'Tab audio sharing declined or failed';
          
          if (displayError.name === 'NotAllowedError') {
            errorMessage = 'Tab audio sharing was declined. Recording your microphone only.';
          } else if (displayError.name === 'NotSupportedError') {
            errorMessage = 'Tab audio sharing not supported in this browser. Recording microphone only.';
          } else if (displayError.message?.includes('audio')) {
            errorMessage = 'Tab audio not available. Make sure to check "Share tab audio" when prompted.';
          }
          
          toast({
            title: "🎤 Microphone Recording Mode",
            description: errorMessage,
            variant: "default"
          });
          
          this.handleSystemAudioFallback();
        }
        
      } else {
        console.log('ℹ️ System audio capture not supported in this browser');
        this.handleSystemAudioFallback();
      }

    } catch (error) {
      console.warn('⚠️ System audio capture setup failed:', error);
      this.handleSystemAudioFallback();
    }
  }

  /**
   * PRIMARY METHOD: Register for ElevenLabs audio element notifications
   * This captures audio directly from voiceService when Solin speaks
   */
  private registerElevenLabsAudioCapture(): void {
    console.log('🎵 Registering for ElevenLabs audio stream notifications...');
    
    // Create bound callback to maintain 'this' context
    const audioCallback = (audioElement: HTMLAudioElement) => {
      this.captureElevenLabsAudioElement(audioElement);
    };
    
    // Store callback for cleanup
    (this.currentSession as any).elevenLabsAudioCallback = audioCallback;
    
    // Register with voice service
    voiceService.onAudioElementCreated(audioCallback);
    console.log('✅ Registered for ElevenLabs audio notifications');
  }

  /**
   * Capture and connect ElevenLabs audio element to recording mixer
   */
  private captureElevenLabsAudioElement(audioElement: HTMLAudioElement): void {
    if (!this.currentSession || !this.currentSession.isRecording) {
      console.warn('⚠️ Cannot capture ElevenLabs audio - no active recording session');
      return;
    }

    try {
      console.log('🎵 Capturing ElevenLabs audio element for recording...', {
        src: audioElement.src?.substring(0, 50) + '...',
        duration: audioElement.duration || 'unknown',
        readyState: audioElement.readyState,
        currentTime: audioElement.currentTime,
        paused: audioElement.paused
      });

      // CRITICAL FIX: Check if we've already captured this audio element
      // Allow capturing multiple ElevenLabs audio elements (each TTS creates a new element)
      console.log('ℹ️ Capturing ElevenLabs audio element (multiple sources supported)');

      // CRITICAL FIX: Wait for audio to be ready before capturing
      const captureWhenReady = () => {
        try {
          console.log('🎵 Audio ready state:', audioElement.readyState, '(need at least 2 for HAVE_CURRENT_DATA)');
          
          // Create MediaStream from the audio element
          const elevenLabsSource = this.currentSession!.audioContext.createMediaElementSource(audioElement);
          
          // Create gain node for AI voice control
          const elevenLabsGain = this.currentSession!.audioContext.createGain();
          elevenLabsGain.gain.value = 0.8; // Slightly lower to prevent clipping when mixed with microphone
          
          // Connect to mixer (CRITICAL: This adds AI voice to the recording)
          elevenLabsSource.connect(elevenLabsGain);
          elevenLabsGain.connect(this.currentSession!.mixerNode);
          
          // IMPORTANT: Also connect back to destination so audio still plays normally
          elevenLabsSource.connect(this.currentSession!.audioContext.destination);
          
          // Store the source for cleanup
          this.currentSession!.speakerSource = elevenLabsSource;
          
          console.log('✅ ElevenLabs audio element captured and connected!');
          console.log('🎭 Audio routing: ElevenLabs AudioElement → elevenLabsGain → mixerNode → MediaRecorder');
          console.log('🎧 Audio routing: ElevenLabs AudioElement → audioContext.destination (for playback)');
          
          toast({
            title: "🎵✨ Complete Recording Active",
            description: "Both your voice AND Solin's responses are being recorded!",
            variant: "default"
          });
        } catch (innerError) {
          console.error('❌ Failed in captureWhenReady:', innerError);
          throw innerError;
        }
      };

      // If audio is ready now, capture immediately
      if (audioElement.readyState >= 2) { // HAVE_CURRENT_DATA or better
        console.log('✅ Audio element ready immediately, capturing now');
        captureWhenReady();
      } else {
        // Wait for audio to be ready
        console.log('⏳ Audio not ready yet, waiting for canplay event...');
        audioElement.addEventListener('canplay', () => {
          console.log('✅ Audio canplay event fired, capturing now');
          captureWhenReady();
        }, { once: true });
        
        // Also try on loadeddata as backup
        audioElement.addEventListener('loadeddata', () => {
          console.log('✅ Audio loadeddata event fired, attempting capture');
          if (!this.currentSession?.speakerSource) { // Only if not already captured
            captureWhenReady();
          }
        }, { once: true });
      }

    } catch (error) {
      console.error('❌ Failed to capture ElevenLabs audio element:', error);
      console.error('❌ Full error:', error);
      
      // Provide user-friendly error message
      let errorMessage = 'Failed to capture AI voice';
      if (error instanceof Error) {
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        if (error.message.includes('already')) {
          errorMessage = 'Audio source already in use - may still record microphone only';
        } else if (error.message.includes('InvalidStateError')) {
          errorMessage = 'Audio element not ready yet - will retry when audio plays';
        }
      }
      
      toast({
        title: "⚠️ ElevenLabs Audio Capture Issue",
        description: errorMessage + '. Recording will continue with microphone only.',
        variant: "default"
      });
    }
  }

  /**
   * DEPRECATED: Enhanced method to capture ElevenLabs audio stream directly from source
   * This is kept for backward compatibility but registerElevenLabsAudioCapture is preferred
   */
  connectElevenLabsAudioStream(audioStream: MediaStream): boolean {
    if (!this.currentSession || !this.currentSession.isRecording) {
      console.warn('⚠️ Cannot connect ElevenLabs audio - no active recording session');
      return false;
    }

    try {
      console.log('🎵 Connecting ElevenLabs audio stream directly...', {
        audioTracks: audioStream.getAudioTracks().length,
        trackLabels: audioStream.getAudioTracks().map(t => t.label)
      });

      // Create audio source from the ElevenLabs stream
      const elevenLabsSource = this.currentSession.audioContext.createMediaStreamSource(audioStream);
      
      // Create gain node for AI voice control
      const elevenLabsGain = this.currentSession.audioContext.createGain();
      elevenLabsGain.gain.value = 0.8; // Slightly lower to prevent clipping when mixed with microphone
      
      // Connect ElevenLabs audio to the existing mixer
      elevenLabsSource.connect(elevenLabsGain);
      elevenLabsGain.connect(this.currentSession.mixerNode);
      
      // Store the source for cleanup
      this.currentSession.speakerSource = elevenLabsSource;
      
      console.log('✅ ElevenLabs audio stream connected successfully!');
      console.log('🎭 Audio routing: ElevenLabs stream → elevenLabsGain → mixerNode → MediaRecorder');
      
      toast({
        title: "🎵✨ Complete Recording Active",
        description: "Both your voice AND Solin's responses are being recorded!",
        variant: "default"
      });

      return true;

    } catch (error) {
      console.error('❌ Failed to connect ElevenLabs audio stream:', error);
      toast({
        title: "⚠️ ElevenLabs Audio Connection Failed",
        description: "Fallback to microphone-only recording. Check console for details.",
        variant: "default"
      });
      return false;
    }
  }

  /**
   * Attempt to capture audio from HTML audio elements (ElevenLabs audio)
   * FALLBACK method for when direct stream connection isn't available
   */
  private attemptAudioElementCapture(): void {
    if (!this.currentSession) return;
    
    try {
      console.log('🔍 Scanning for audio elements to capture ElevenLabs output...');
      
      // Find all audio elements on the page
      const audioElements = document.querySelectorAll('audio');
      console.log(`🎵 Found ${audioElements.length} audio elements on page`);
      
      audioElements.forEach((audioElement, index) => {
        console.log(`🎵 Audio element ${index}:`, {
          src: audioElement.src,
          currentTime: audioElement.currentTime,
          duration: audioElement.duration,
          paused: audioElement.paused,
          volume: audioElement.volume
        });
        
        // Try to create MediaElementAudioSourceNode if audio is playing or will play
        if (audioElement.src && !audioElement.paused) {
          try {
            console.log(`🎵 Attempting to capture audio element ${index}...`);
            
            const elementSource = this.currentSession!.audioContext.createMediaElementSource(audioElement);
            const elementGain = this.currentSession!.audioContext.createGain();
            elementGain.gain.value = 0.8;
            
            // Connect to mixer
            elementSource.connect(elementGain);
            elementGain.connect(this.currentSession!.mixerNode);
            
            // Also connect back to destination so audio still plays normally
            elementSource.connect(this.currentSession!.audioContext.destination);
            
            console.log(`✅ Successfully connected audio element ${index} to recording`);
            
            toast({
              title: "🎵 Audio Element Captured",
              description: "Found and connected to audio element - may capture AI voice!",
              variant: "default"
            });
            
          } catch (elementError) {
            console.warn(`⚠️ Failed to capture audio element ${index}:`, elementError);
          }
        }
      });
      
      // Set up listener for new audio elements that might be created dynamically
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.tagName === 'AUDIO' || element.querySelector('audio')) {
                console.log('🎵 New audio element detected, attempting capture...');
                setTimeout(() => this.attemptAudioElementCapture(), 1000);
              }
            }
          });
        });
      });
      
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
      
      // Store observer for cleanup
      if (this.currentSession) {
        (this.currentSession as any).audioObserver = observer;
      }
      
    } catch (error) {
      console.warn('⚠️ Audio element capture failed:', error);
    }
  }

  /**
   * Handle fallback when system audio capture is not available
   */
  private handleSystemAudioFallback(): void {
    console.log('📝 Using microphone-only recording mode');
    console.log('💡 For complete conversation recording in future attempts:');
    console.log('   1. When "Share your screen" prompt appears');
    console.log('   2. Select "Browser tab" (this tab)');
    console.log('   3. ✅ Check "Share tab audio" checkbox');
    console.log('   4. Click "Share"');
    
    this.logSystemAudioInstructions();
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
   * Add memory ID to current conversation recording session
   */
  addMemoryId(memoryId: string): void {
    if (!this.currentSession?.isRecording) {
      console.warn('⚠️ Cannot add memory ID - no active recording session');
      return;
    }

    if (!this.currentSession.memoryIds.includes(memoryId)) {
      this.currentSession.memoryIds.push(memoryId);
      console.log('📝 Memory ID added to conversation recording:', { 
        sessionId: this.currentSession.sessionId,
        memoryId, 
        totalMemories: this.currentSession.memoryIds.length 
      });
    } else {
      console.log('📝 Memory ID already exists in recording:', memoryId);
    }
  }

  /**
   * Add memory ID and title to current conversation recording session
   */
  addMemory(memoryId: string, memoryTitle: string): void {
    if (!this.currentSession?.isRecording) {
      console.warn('⚠️ Cannot add memory - no active recording session');
      return;
    }

    // Add memory ID if not already present
    if (!this.currentSession.memoryIds.includes(memoryId)) {
      this.currentSession.memoryIds.push(memoryId);
    }
    
    // Add memory title if not already present
    if (!this.currentSession.memoryTitles.includes(memoryTitle)) {
      this.currentSession.memoryTitles.push(memoryTitle);
    }

    console.log('📝 Memory added to conversation recording:', { 
      sessionId: this.currentSession.sessionId,
      memoryId,
      memoryTitle, 
      totalMemories: this.currentSession.memoryIds.length,
      totalTitles: this.currentSession.memoryTitles.length
    });
  }

  /**
   * ABRUPT TERMINATION PROTECTION
   * Set up handlers to save recording even if call is terminated unexpectedly
   */
  private setupAbruptTerminationHandlers(): void {
    console.log('🛡️ Setting up abrupt termination protection...');

    // Auto-save interval - save recording periodically in case of crash
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    this.autoSaveInterval = setInterval(() => {
      if (this.currentSession?.isRecording && this.currentSession.audioChunks.length > 0) {
        console.log('💾 Auto-save checkpoint: Recording in progress with', 
          this.currentSession.audioChunks.length, 'chunks');
        // Note: Don't actually save here to avoid duplicates, just log status
      }
    }, 10000); // Check every 10 seconds

    // Page unload handler - save recording when user closes tab/window
    if (!this.hasRegisteredUnloadHandler) {
      const unloadHandler = (event: BeforeUnloadEvent) => {
        if (this.currentSession?.isRecording) {
          console.log('⚠️ Page unloading with active recording - forcing save...');
          this.forceImmediateSave('page_unload');
          
          // Show warning to user
          const message = 'Recording in progress - it will be saved automatically';
          event.preventDefault();
          event.returnValue = message;
          return message;
        }
      };

      window.addEventListener('beforeunload', unloadHandler);
      this.hasRegisteredUnloadHandler = true;
      console.log('✅ Page unload handler registered');
    }

    // Visibility change handler - save when tab becomes hidden
    const visibilityHandler = () => {
      if (document.hidden && this.currentSession?.isRecording) {
        console.log('👁️ Tab hidden with active recording - creating checkpoint...');
        // Don't force save on every tab switch, just log
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    // Error handlers - catch unexpected errors
    const errorHandler = (event: ErrorEvent) => {
      if (this.currentSession?.isRecording) {
        console.error('💥 Unhandled error with active recording:', event.error);
        this.forceImmediateSave('error_caught');
      }
    };
    window.addEventListener('error', errorHandler);

    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      if (this.currentSession?.isRecording) {
        console.error('💥 Unhandled promise rejection with active recording:', event.reason);
        this.forceImmediateSave('promise_rejection');
      }
    };
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);

    console.log('✅ Abrupt termination handlers set up successfully');
  }

  /**
   * Force immediate save of current recording regardless of state
   * Used when detecting abrupt termination scenarios
   */
  private forceImmediateSave(reason: string): void {
    if (!this.currentSession) {
      console.log('⚠️ Force save requested but no active session');
      return;
    }

    try {
      console.log(`🚨 FORCE IMMEDIATE SAVE triggered by: ${reason}`);
      
      const session = this.currentSession;
      
      // Stop MediaRecorder to trigger data collection
      if (session.mediaRecorder && session.mediaRecorder.state !== 'inactive') {
        session.mediaRecorder.stop();
      }

      // Even if MediaRecorder hasn't collected all data, save what we have
      if (session.audioChunks.length > 0) {
        const audioBlob = new Blob(session.audioChunks, { type: 'audio/webm;codecs=opus' });
        const duration = (Date.now() - session.startTime.getTime()) / 1000;

        console.log(`💾 Force saving partial recording: ${audioBlob.size} bytes, ${duration.toFixed(1)}s`);

        // Create emergency save metadata
        const transcriptText = session.conversationTranscript.length > 0
          ? session.conversationTranscript
              .map(entry => `[${entry.timestamp}s] ${entry.speaker.toUpperCase()}: ${entry.text}`)
              .join('\n')
          : '[Recording terminated abruptly - partial transcript]';

        const summaryText = `⚠️ Recording terminated abruptly (${reason}) - Duration: ${duration.toFixed(1)}s` +
          (session.memoryIds.length > 0 ? ` - ${session.memoryIds.length} memory(ies) created` : '') +
          (session.memoryTitles.length > 0 ? `: "${session.memoryTitles.join(', ')}"` : '');

        const filePath = `${session.userId}/${session.sessionId}_emergency.webm`;

        // Use synchronous-like approach for emergency save
        const saveEmergency = async () => {
          try {
            // Upload to storage
            const { error: uploadError } = await supabase.storage
              .from(this.STORAGE_BUCKET)
              .upload(filePath, audioBlob, {
                cacheControl: '3600',
                upsert: true
              });

            if (uploadError) {
              console.error('❌ Emergency upload failed:', uploadError);
              // Try to save at least the metadata
            } else {
              console.log('✅ Emergency audio file uploaded');
            }

            // Save metadata to database
            const { error: dbError } = await supabase
              .from('voice_recordings')
              .insert({
                user_id: session.userId,
                session_id: session.sessionId,
                recording_type: 'conversation_emergency',
                storage_path: uploadError ? null : filePath,
                duration_seconds: duration,
                file_size_bytes: audioBlob.size,
                transcript_text: transcriptText,
                conversation_summary: summaryText,
                memory_ids: session.memoryIds.length > 0 ? session.memoryIds : null,
                memory_titles: session.memoryTitles.length > 0 ? session.memoryTitles : null,
                session_mode: 'elevenlabs_conversation_emergency',
                mime_type: 'audio/webm',
                compression_type: 'opus',
                conversation_phase: 'abruptly_terminated',
                metadata: {
                  terminationReason: reason,
                  hasAudioFile: !uploadError,
                  chunkCount: session.audioChunks.length,
                  transcriptEntries: session.conversationTranscript.length
                }
              });

            if (dbError) {
              console.error('❌ Emergency database save failed:', dbError);
            } else {
              console.log('✅ Emergency recording metadata saved to database');
              
              toast({
                title: "💾 Recording Auto-Saved",
                description: `Call terminated - recording saved automatically (${duration.toFixed(1)}s)`,
                variant: "default"
              });
            }

          } catch (error) {
            console.error('❌ Emergency save completely failed:', error);
          }
        };

        // Execute emergency save
        saveEmergency();
      }

    } catch (error) {
      console.error('❌ Force immediate save failed:', error);
    }
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

      // Get the processing promise before stopping
      const processingPromise = this.currentSession.processingComplete;

      // Stop MediaRecorder
      this.currentSession.mediaRecorder?.stop();
      this.currentSession.isRecording = false;

      // Wait for processing to complete
      if (processingPromise) {
        console.log('⏳ Waiting for recording processing to complete...');
        await processingPromise;
        console.log('✅ Recording processing complete');
      }

      // Clean up auto-save interval
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
        console.log('✅ Auto-save interval cleared');
      }

      // Stop microphone stream
      if (this.currentSession.microphoneStream) {
        this.currentSession.microphoneStream.getTracks().forEach(track => track.stop());
      }

      // Stop display/system audio stream (if it was captured)
      if (this.currentSession.speakerSource) {
        // Check if it's a MediaStreamAudioSourceNode (has mediaStream property)
        if ('mediaStream' in this.currentSession.speakerSource) {
          const displayStream = this.currentSession.speakerSource.mediaStream;
          if (displayStream) {
            displayStream.getTracks().forEach(track => track.stop());
            console.log('🔊 System audio capture stopped');
          }
        }
      }

      // Stop audio element observer (if it was set up)
      const observer = (this.currentSession as any).audioObserver as MutationObserver;
      if (observer) {
        observer.disconnect();
        console.log('🔍 Audio element observer stopped');
      }

      // Unregister ElevenLabs audio callback (if it was set up)
      const audioCallback = (this.currentSession as any).elevenLabsAudioCallback;
      if (audioCallback) {
        voiceService.offAudioElementCreated(audioCallback);
        console.log('🎵 ElevenLabs audio callback unregistered');
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
      
      // ABRUPT TERMINATION PROTECTION: Handle case where no audio chunks were collected
      if (!session.audioChunks || session.audioChunks.length === 0) {
        console.warn('⚠️ No audio chunks available - conversation may have been very short or interrupted');
        
        // Still save metadata even without audio file
        const duration = (Date.now() - session.startTime.getTime()) / 1000;
        const transcriptText = session.conversationTranscript.length > 0
          ? session.conversationTranscript
              .map(entry => `[${entry.timestamp}s] ${entry.speaker.toUpperCase()}: ${entry.text}`)
              .join('\n')
          : '[No audio data collected - conversation interrupted]';
        
        const summaryText = `⚠️ Recording interrupted (no audio data) - Duration: ${duration.toFixed(1)}s` +
          (session.memoryIds.length > 0 ? ` - ${session.memoryIds.length} memory(ies) created` : '');

        // Save metadata only (no audio file)
        await supabase
          .from('voice_recordings')
          .insert({
            user_id: session.userId,
            session_id: session.sessionId,
            recording_type: 'conversation_interrupted',
            storage_path: null, // No audio file
            duration_seconds: duration,
            file_size_bytes: 0,
            transcript_text: transcriptText,
            conversation_summary: summaryText,
            memory_ids: session.memoryIds.length > 0 ? session.memoryIds : null,
            memory_titles: session.memoryTitles.length > 0 ? session.memoryTitles : null,
            session_mode: 'elevenlabs_conversation_interrupted',
            conversation_phase: 'interrupted_no_audio',
            metadata: {
              interruptionReason: 'no_audio_chunks',
              transcriptEntries: session.conversationTranscript.length
            }
          });

        console.log('✅ Saved metadata for interrupted conversation (no audio file)');
        
        toast({
          title: "💾 Conversation Metadata Saved",
          description: "Call interrupted - conversation details saved without audio",
          variant: "default"
        });
        
        return;
      }
      
      const audioBlob = new Blob(session.audioChunks, { type: 'audio/webm;codecs=opus' });
      const duration = (Date.now() - session.startTime.getTime()) / 1000; // seconds

      console.log('📈 Recording stats:', {
        sessionId: session.sessionId,
        duration: duration.toFixed(2) + 's',
        fileSize: (audioBlob.size / 1024).toFixed(2) + 'KB',
        transcriptEntries: session.conversationTranscript.length,
        memoriesCreated: session.memoryIds.length,
        memoryIds: session.memoryIds
      });

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
        console.error('❌ Conversation recording upload failed:', uploadError);
        console.error('❌ Upload error details:', {
          message: uploadError.message,
          bucket: this.STORAGE_BUCKET,
          path: filePath,
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
          title: "❌ Conversation Recording Failed",
          description: userFriendlyError,
          variant: "destructive"
        });
        
        throw new Error(userFriendlyError);
      }

      // Create transcript text
      const transcriptText = session.conversationTranscript
        .map(entry => `[${entry.timestamp}s] ${entry.speaker.toUpperCase()}: ${entry.text}`)
        .join('\n');

      // Create enhanced conversation summary with memory information
      const memoryCount = session.memoryIds.length;
      const titleCount = session.memoryTitles.length;
      
      let summaryText: string;
      
      // CRITICAL FIX: Use memory title directly when there's exactly one memory
      if (memoryCount === 1 && titleCount === 1) {
        summaryText = session.memoryTitles[0]; // Use the memory title as-is for easy matching
      } else if (memoryCount > 1 && titleCount > 0) {
        // Multiple memories - list them
        const titleList = session.memoryTitles.slice(0, 3).join(', ');
        const remainingCount = titleCount - 3;
        summaryText = `${memoryCount} memories: ${titleList}`;
        if (remainingCount > 0) {
          summaryText += ` +${remainingCount} more`;
        }
      } else {
        // No memories - use duration-based title
        summaryText = `ElevenLabs conversation recording (${duration.toFixed(1)}s)`;
      }

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
          conversation_summary: summaryText,
          memory_ids: session.memoryIds.length > 0 ? session.memoryIds : null,
          memory_titles: session.memoryTitles.length > 0 ? session.memoryTitles : null,
          session_mode: 'elevenlabs_conversation',
          conversation_phase: 'completed', // Mark as successfully completed
          mime_type: 'audio/webm',
          compression_type: 'opus',
          sample_rate: 48000,
          bit_rate: 64000,
          metadata: {
            recordingMethod: 'normal_completion',
            chunkCount: session.audioChunks.length,
            transcriptEntries: session.conversationTranscript.length
          }
        });

      if (dbError) {
        console.error('❌ Conversation recording database save failed:', dbError);
        toast({
          title: "❌ Conversation Recording Failed",
          description: `Failed to save conversation recording: ${dbError.message}`,
          variant: "destructive"
        });
        throw dbError;
      }

      console.log('✅ Conversation recording saved successfully');
      
      // Show success notification
      const fileExtension = '.webm';
      toast({
        title: "✅ Conversation Recording Saved",
        description: `ElevenLabs conversation ${session.sessionId}_conversation${fileExtension} saved! Duration: ${duration.toFixed(1)}s, Memories: ${session.memoryIds.length}`,
        variant: "default"
      });

      // Clean up session
      this.currentSession = null;

    } catch (error) {
      console.error('❌ Failed to process conversation recording:', error);
      
      // ABRUPT TERMINATION PROTECTION: Try to save metadata even if main save failed
      if (this.currentSession) {
        console.log('🆘 Attempting emergency metadata save after processing failure...');
        try {
          const session = this.currentSession;
          const duration = (Date.now() - session.startTime.getTime()) / 1000;
          const transcriptText = session.conversationTranscript.length > 0
            ? session.conversationTranscript
                .map(entry => `[${entry.timestamp}s] ${entry.speaker.toUpperCase()}: ${entry.text}`)
                .join('\n')
            : '[Recording failed during processing]';
          
          const summaryText = `⚠️ Recording processing failed - Duration: ${duration.toFixed(1)}s` +
            (session.memoryIds.length > 0 ? ` - ${session.memoryIds.length} memory(ies) created` : '');

          // Save metadata without audio file
          await supabase
            .from('voice_recordings')
            .insert({
              user_id: session.userId,
              session_id: session.sessionId,
              recording_type: 'conversation_failed',
              storage_path: null,
              duration_seconds: duration,
              file_size_bytes: 0,
              transcript_text: transcriptText,
              conversation_summary: summaryText,
              memory_ids: session.memoryIds.length > 0 ? session.memoryIds : null,
              memory_titles: session.memoryTitles.length > 0 ? session.memoryTitles : null,
              session_mode: 'elevenlabs_conversation_failed',
              conversation_phase: 'processing_failed',
              metadata: {
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                chunkCount: session.audioChunks.length,
                transcriptEntries: session.conversationTranscript.length
              }
            });

          console.log('✅ Emergency metadata save successful after processing failure');
          
          toast({
            title: "⚠️ Partial Save Successful",
            description: "Recording failed but conversation details were saved",
            variant: "default"
          });
          
        } catch (emergencyError) {
          console.error('❌ Emergency metadata save also failed:', emergencyError);
        }
      }
      
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
    memoryCount: number;
    memoryTitles: string[];
  } {
    if (!this.currentSession) {
      return {
        isRecording: false,
        sessionId: null,
        duration: null,
        transcriptEntries: 0,
        memoryCount: 0,
        memoryTitles: []
      };
    }

    return {
      isRecording: this.currentSession.isRecording,
      sessionId: this.currentSession.sessionId,
      duration: this.currentSession.startTime ? 
        (Date.now() - this.currentSession.startTime.getTime()) / 1000 : null,
      transcriptEntries: this.currentSession.conversationTranscript.length,
      memoryCount: this.currentSession.memoryIds.length,
      memoryTitles: this.currentSession.memoryTitles
    };
  }
}

// Export singleton instance
export const conversationRecordingService = new ConversationRecordingService();