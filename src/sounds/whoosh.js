// Create a whooshing sound effect using Web Audio API
export const playWhooshSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create oscillators for the whoosh effect
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    // Configure the filter for a more natural whoosh
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.8);
    
    // Configure oscillators
    oscillator1.type = 'sawtooth';
    oscillator2.type = 'sine';
    
    // Create the whoosh frequency sweep
    oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.8);
    
    oscillator2.frequency.setValueAtTime(1200, audioContext.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.8);
    
    // Configure gain envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    
    // Connect the audio graph
    oscillator1.connect(filter);
    oscillator2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Start and stop the sound
    oscillator1.start(audioContext.currentTime);
    oscillator2.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 0.8);
    oscillator2.stop(audioContext.currentTime + 0.8);
    
  } catch (error) {
    console.warn('Audio playback not supported:', error);
  }
};

export const playMemorySaveSound = () => {
  playWhooshSound();
};