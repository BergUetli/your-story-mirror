import React from 'react';

/**
 * AnimatedOrb Component - Visual AI Assistant Indicator
 * 
 * This component creates an animated spherical visual that represents the AI assistant's state.
 * It's designed to provide visual feedback to users about whether the AI is:
 * - Idle (inactive): Dim, static appearance
 * - Listening (active): Breathing animation, moderate glow
 * - Speaking (responding): Pulsing rings, bright glow, larger scale
 * 
 * Business Purpose: Enhances user experience by making AI interactions feel more 
 * natural and responsive through visual cues that match human communication patterns.
 */

// Define the properties this component accepts
interface AnimatedOrbProps {
  isActive: boolean;    // Whether the AI is currently listening/processing
  isSpeaking: boolean;  // Whether the AI is currently speaking/responding
  size?: number;        // Optional size override (defaults to 200px)
}

export const AnimatedOrb: React.FC<AnimatedOrbProps> = ({ 
  isActive, 
  isSpeaking,
  size = 200 
}) => {
  return (
    // Main container - sets up the orb's dimensions and positioning
    <div 
      className="relative flex items-center justify-center pointer-events-none"
      style={{ width: size, height: size }}
    >
      {/* 
        OUTER GLOW LAYER - Creates the atmospheric metallic reflection around the orb
        This layer provides the soft, diffused lighting that simulates metal reflecting ambient light
        The intensity and scale change based on the AI's current state:
        - Speaking: Most intense (80% opacity, 110% scale)
        - Active/Listening: Medium intensity (60% opacity, 105% scale)  
        - Idle: Dim (40% opacity, normal scale)
      */}
      <div 
        className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 ${
          isSpeaking ? 'opacity-80 scale-110' : isActive ? 'opacity-60 scale-105' : 'opacity-40'
        }`}
        style={{
          background: `
            radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(220, 220, 230, 0.4) 30%, 
                           rgba(180, 180, 200, 0.3) 60%, rgba(150, 150, 170, 0.2) 100%)
          `,
        }}
      />

      {/* 
        CORE ORB - The main spherical body with metallic appearance
        This is the primary visual element that users focus on
        Features:
        - Metallic gradient from bright silver/white to darker steel
        - Reflective highlights and shadows for realistic metal look
        - Dynamic box-shadow that intensifies when speaking
        - Subtle scaling animation when active or speaking
        - Smooth transitions between states (700ms duration)
      */}
      <div 
        className={`absolute inset-0 rounded-full transition-all duration-700 ${
          isSpeaking ? 'scale-110' : isActive ? 'scale-105' : ''
        }`}
        style={{
          background: `
            radial-gradient(ellipse at 30% 30%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 20%, 
                           rgba(200, 200, 210, 0.8) 40%, rgba(150, 150, 160, 0.9) 70%, rgba(100, 100, 110, 1) 100%),
            linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(220, 220, 230, 0.9) 50%, rgba(120, 120, 130, 1) 100%)
          `,
          boxShadow: isSpeaking 
            ? '0 0 48px rgba(200, 200, 220, 0.6), 0 0 96px rgba(180, 180, 200, 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.4), inset 0 -2px 8px rgba(100, 100, 110, 0.3)' 
            : isActive 
            ? '0 0 32px rgba(200, 200, 220, 0.5), 0 0 64px rgba(180, 180, 200, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.3), inset 0 -2px 6px rgba(100, 100, 110, 0.2)' 
            : '0 0 24px rgba(200, 200, 220, 0.3), inset 0 1px 4px rgba(255, 255, 255, 0.2), inset 0 -1px 4px rgba(100, 100, 110, 0.2)'
        }}
      />

      {/* 
        BREATHING ANIMATION - Only shows when AI is listening but not speaking
        Creates a gentle "breathing" effect to indicate the AI is actively listening
        This subtle animation reassures users that their input is being processed
        - Slow 2.5-second cycle mimics natural breathing rhythm
        - Soft metallic shimmer that fades from center outward
        - Only visible when isActive=true AND isSpeaking=false
      */}
      {isActive && !isSpeaking && (
        <div 
          className="absolute inset-0 rounded-full animate-pulse"
          style={{ 
            animationDuration: '2.5s',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(200, 200, 210, 0.2) 50%, transparent 70%)',
          }}
        />
      )}

      {/* 
        SPEAKING ANIMATION - Concentric pulsing metallic rings when AI is responding
        Creates dynamic, outward-expanding rings to indicate active speech/response
        This animation draws attention and clearly communicates "AI is speaking now"
        Features:
        - Three overlapping rings with different timing delays (0s, 0.3s, 0.6s)
        - Different animation durations (1.5s, 2s, 2.5s) create complex wave pattern
        - Decreasing opacity from inner to outer rings for depth effect
        - Metallic shimmer effects that simulate light reflecting off polished metal
        - Only visible when isSpeaking=true
      */}
      {isSpeaking && (
        <>
          {/* Inner ring - fastest, most prominent */}
          <div 
            className="absolute inset-0 rounded-full animate-ping"
            style={{ 
              animationDuration: '1.5s',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(200, 200, 210, 0.3) 50%, transparent 60%)',
            }}
          />
          {/* Middle ring - medium speed, slight delay */}
          <div 
            className="absolute inset-0 rounded-full animate-ping"
            style={{ 
              animationDuration: '2s', 
              animationDelay: '0.3s',
              background: 'radial-gradient(circle, rgba(220, 220, 230, 0.3) 0%, rgba(180, 180, 190, 0.2) 50%, transparent 60%)',
            }}
          />
          {/* Outer ring - slowest, longest delay */}
          <div 
            className="absolute inset-0 rounded-full animate-ping"
            style={{ 
              animationDuration: '2.5s', 
              animationDelay: '0.6s',
              background: 'radial-gradient(circle, rgba(200, 200, 210, 0.2) 0%, rgba(150, 150, 160, 0.1) 50%, transparent 60%)',
            }}
          />
        </>
      )}

      {/* 
        CENTER HIGHLIGHT - The focal point that draws the eye
        A small bright metallic dot at the center that acts as the "eye" of the orb
        This creates the impression of a living, aware presence with a polished metal surface
        Features:
        - Grows larger and brighter when speaking (150% scale, 90% opacity)
        - Subtle when idle (normal scale, 70% opacity)
        - Bright silver-to-steel gradient for realistic metallic appearance
        - Soft shadow with metallic reflection for depth and realism
      */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className={`w-5 h-5 rounded-full transition-all duration-300 ${
            isSpeaking ? 'scale-150 opacity-90' : 'opacity-70'
          }`}
          style={{
            background: `
              radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(240, 240, 250, 0.9) 30%, 
                             rgba(200, 200, 210, 0.8) 70%, rgba(160, 160, 170, 0.9) 100%)
            `,
            boxShadow: '0 2px 12px rgba(200, 200, 220, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.8)'
          }}
        />
      </div>
    </div>
  );
};
