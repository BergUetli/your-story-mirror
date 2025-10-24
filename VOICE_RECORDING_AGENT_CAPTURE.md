# Agent Voice Capture - Technical Documentation

## Current Status

**Issue**: Voice recordings only capture the user's microphone input, not the AI agent's voice responses.

**User Request**: "The agent voice is not captured. Please see how call centers that are digital do this without telex. There must be a better way."

## Problem Analysis

Currently, the system records:
- ✅ User's microphone input (via `MediaRecorder`)
- ❌ Agent's voice output (ElevenLabs TTS audio)

This creates incomplete conversation recordings that are missing half of the dialogue.

## Digital Call Center Approach

Professional call center solutions capture both sides of a conversation using several approaches:

### 1. **Server-Side Recording** (Most Common)
- Both audio streams are mixed and recorded on the server
- Requires backend infrastructure
- Examples: Twilio, AWS Connect, Genesys

### 2. **Browser Audio API Mixing** (Web-Based)
- Use Web Audio API to create a mixed stream
- Capture both microphone and audio output
- Limited browser support for system audio capture

### 3. **Dual Stream Recording** (Hybrid)
- Record both streams separately
- Mix them post-processing
- More flexible but requires more storage

## Recommended Solutions

### Solution A: Web Audio API Mixing (Recommended for Current Setup)

```javascript
// Create audio context
const audioContext = new AudioContext();

// 1. Capture microphone
const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
const micSource = audioContext.createMediaStreamSource(micStream);

// 2. Create destination for mixed audio
const mixedDestination = audioContext.createMediaStreamDestination();

// 3. Connect microphone to mixer
micSource.connect(mixedDestination);

// 4. When AI speaks, connect TTS audio to mixer
const audioElement = new Audio(ttsAudioUrl);
const ttsSource = audioContext.createMediaElementSource(audioElement);
ttsSource.connect(mixedDestination);

// 5. Record the mixed stream
const recorder = new MediaRecorder(mixedDestination.stream);
```

**Pros**:
- Client-side solution
- No server changes needed
- Real-time mixing

**Cons**:
- More complex setup
- Higher CPU usage
- Some browser limitations

### Solution B: Dual Recording with Post-Processing

```javascript
// Record user voice
const userRecorder = new MediaRecorder(micStream);

// Save AI responses as audio files
const agentAudioUrls = [];
agentResponses.forEach(response => {
  // Get TTS audio from ElevenLabs
  const audioUrl = await elevenLabs.textToSpeech(response.text);
  agentAudioUrls.push({ timestamp, audioUrl });
});

// Backend: Mix both streams into final recording
await mixAudioStreams({
  userAudio: userRecordingBlob,
  agentAudios: agentAudioUrls
});
```

**Pros**:
- Simpler client implementation
- Better quality control
- Easier to edit/process

**Cons**:
- Requires backend processing
- Slightly delayed final output
- More storage needed temporarily

### Solution C: ElevenLabs Conversational AI Full Recording

ElevenLabs Conversational AI may support recording the entire conversation including both sides. Check their API documentation for:

```javascript
// If supported by ElevenLabs API
const conversation = await elevenLabs.startConversation({
  agentId: 'your-agent-id',
  recordFullConversation: true // Check if this exists
});
```

**Pros**:
- Handled by ElevenLabs
- Professional quality
- No client-side complexity

**Cons**:
- Depends on ElevenLabs features
- May have additional costs
- Less control over processing

## Implementation Priority

1. **Immediate** (Quick Fix): Document to users that only their voice is captured
2. **Short Term** (2-4 weeks): Implement Solution B (Dual Recording)
3. **Long Term** (1-2 months): Explore Solution A or C for seamless full recording

## Technical Considerations

### Browser Compatibility
- **MediaStream Recording**: Chrome, Firefox, Edge (✅ Good)
- **System Audio Capture**: Limited support (⚠️ Requires `getDisplayMedia` with audio)
- **Web Audio API**: Chrome, Firefox, Edge (✅ Good)

### Storage Impact
- **Current**: ~500KB per 5-minute conversation (user only)
- **With Agent Voice**: ~1-1.5MB per 5-minute conversation (both sides)
- **Recommendation**: Implement cleanup policies (auto-delete after 90 days)

### Performance Impact
- Audio mixing adds ~5-10% CPU usage
- Negligible on modern devices
- May affect older mobile devices

## Next Steps

1. Review ElevenLabs API documentation for built-in recording features
2. Prototype Solution B (Dual Recording) in development environment
3. Test audio quality and synchronization
4. Implement user notifications about recording capabilities
5. Add toggle for users to enable/disable agent voice recording (privacy)

## Resources

- [MDN: MediaStream Recording API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API)
- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [ElevenLabs API Docs](https://elevenlabs.io/docs)
