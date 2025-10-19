import React, { useState, useEffect } from 'react';
import { Mic } from 'lucide-react';

interface ModernVoiceAgentProps {
  isActive: boolean;
  isSpeaking: boolean;
  onClick?: () => void;
}

export const ModernVoiceAgent: React.FC<ModernVoiceAgentProps> = ({ 
  isActive, 
  isSpeaking,
  onClick 
}) => {
  // Determine current state for styling
  const getState = () => {
    if (isSpeaking) return 'speaking';
    if (isActive) return 'listening';
    return 'idle';
  };

  const state = getState();
  
  // Generate aria-label based on state
  const getAriaLabel = () => {
    switch (state) {
      case 'listening': return 'Listening - Solin is ready to hear you';
      case 'speaking': return 'Speaking - Solin is responding';
      default: return 'Tap or press Space to talk to Solin';
    }
  };

  return (
    <div className="solin-voice-agent-container">
      {/* Main orb button */}
      <button
        onClick={onClick}
        disabled={isActive}
        className={`solin-orb solin-orb--${state} ${isActive ? 'solin-orb--disabled' : ''}`}
        aria-label={getAriaLabel()}
        aria-pressed={isActive}
      >
        {/* Ground reflection shadow */}
        <div className="solin-orb__reflection" />
        
        {/* Energy ring system */}
        <div className={`solin-orb__energy-ring solin-orb__energy-ring--${state}`} />
        
        {/* Orbit lines for thinking state */}
        {isActive && !isSpeaking && (
          <div className="solin-orb__orbit-container">
            <svg className="solin-orb__orbit solin-orb__orbit--outer" viewBox="0 0 100 100">
              <circle 
                cx="50" 
                cy="50" 
                r="45" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="0.5" 
                strokeDasharray="8 4"
                className="solin-orb__orbit-line"
              />
            </svg>
            <svg className="solin-orb__orbit solin-orb__orbit--inner" viewBox="0 0 100 100">
              <circle 
                cx="50" 
                cy="50" 
                r="35" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="0.5" 
                strokeDasharray="6 3"
                className="solin-orb__orbit-line"
              />
            </svg>
          </div>
        )}

        {/* Main orb body */}
        <div className={`solin-orb__body solin-orb__body--${state}`}>
          {/* Shimmer effect for speaking state */}
          {isSpeaking && <div className="solin-orb__shimmer" />}
          
          {/* Microphone icon */}
          <div className="solin-orb__icon-container">
            <Mic className={`solin-orb__icon solin-orb__icon--${state}`} />
          </div>
        </div>

        {/* Breathing rings for listening */}
        {isActive && !isSpeaking && (
          <div className="solin-orb__breathing-rings">
            <div className="solin-orb__breathing-ring solin-orb__breathing-ring--1" />
            <div className="solin-orb__breathing-ring solin-orb__breathing-ring--2" />
          </div>
        )}
      </button>

      {/* Caption card - only show for non-idle states to save space */}
      {state !== 'idle' && (
        <div className={`solin-caption solin-caption--${state}`} aria-live="polite">
          <div className="solin-caption__content">
            {state === 'listening' && 'Listening...'}
            {state === 'speaking' && 'Speaking...'}
          </div>
        </div>
      )}

      {/* Provenance chip - smaller and more subtle */}
      <div className="solin-provenance">
        <div className="solin-provenance__dot" />
        <span className="solin-provenance__text">Solin AI</span>
      </div>
    </div>
  );
};
