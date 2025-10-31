import React, { useState, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { PulsingBorder } from '@paper-design/shaders-react';

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
    <div className="relative flex flex-col items-center justify-center min-h-[600px] w-full">
      {/* PulsingBorder shader wrapper for the mic bubble */}
      <div className="relative">
        <PulsingBorder
          colors={["#5800FF", "#BEECFF", "#E77EDC", "#FF4C3E"]}
          colorBack="#00000000"
          speed={isSpeaking ? 2.5 : isActive ? 1.8 : 1.2}
          roundness={1}
          thickness={0.08}
          softness={0.15}
          intensity={isSpeaking ? 1.5 : isActive ? 1.2 : 0.8}
          spotSize={0.12}
          pulse={isSpeaking ? 0.4 : isActive ? 0.3 : 0.1}
          smoke={0.6}
          smokeSize={2.2}
          scale={0.7}
          rotation={0}
          style={{
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            position: "relative",
          }}
        >
          {/* Main orb button inside shader */}
          <button
            onClick={onClick}
            disabled={isActive}
            className="absolute inset-0 m-auto w-72 h-72 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 disabled:cursor-not-allowed"
            style={{
              background: state === 'speaking' 
                ? 'radial-gradient(circle, rgba(88,0,255,0.3) 0%, rgba(231,126,220,0.2) 50%, rgba(190,236,255,0.1) 100%)'
                : state === 'listening'
                ? 'radial-gradient(circle, rgba(190,236,255,0.3) 0%, rgba(88,0,255,0.2) 50%, rgba(231,126,220,0.1) 100%)'
                : 'radial-gradient(circle, rgba(88,0,255,0.15) 0%, rgba(231,126,220,0.1) 50%, rgba(190,236,255,0.05) 100%)',
              backdropFilter: 'blur(20px)',
              boxShadow: state === 'speaking'
                ? '0 0 60px rgba(88,0,255,0.4), inset 0 0 40px rgba(231,126,220,0.2)'
                : state === 'listening'
                ? '0 0 50px rgba(190,236,255,0.3), inset 0 0 30px rgba(88,0,255,0.2)'
                : '0 0 30px rgba(88,0,255,0.2), inset 0 0 20px rgba(231,126,220,0.1)'
            }}
            aria-label={getAriaLabel()}
            aria-pressed={isActive}
          >
            {/* Microphone icon */}
            <Mic 
              className="w-20 h-20 transition-all duration-300"
              style={{
                color: state === 'speaking' ? '#E77EDC' : state === 'listening' ? '#BEECFF' : '#5800FF',
                filter: `drop-shadow(0 0 ${state === 'speaking' ? '15px' : state === 'listening' ? '10px' : '5px'} currentColor)`,
                animation: state === 'speaking' ? 'pulse 1s infinite' : state === 'listening' ? 'pulse 2s infinite' : 'none'
              }}
            />
          </button>
        </PulsingBorder>
      </div>

      {/* Caption card */}
      {state !== 'idle' && (
        <div 
          className="mt-8 px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 animate-fade-in"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '2px solid',
            borderColor: state === 'speaking' ? '#E77EDC' : '#BEECFF',
            color: state === 'speaking' ? '#5800FF' : '#5800FF',
            boxShadow: `0 4px 20px ${state === 'speaking' ? 'rgba(231,126,220,0.3)' : 'rgba(190,236,255,0.3)'}`
          }}
          aria-live="polite"
        >
          {state === 'listening' && '🎤 Listening...'}
          {state === 'speaking' && '💬 Speaking...'}
        </div>
      )}

      {/* Provenance chip */}
      <div 
        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
        style={{
          background: 'rgba(88,0,255,0.1)',
          border: '1px solid rgba(88,0,255,0.2)',
          color: '#5800FF'
        }}
      >
        <div 
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: '#5800FF' }}
        />
        <span>Solin AI</span>
      </div>
    </div>
  );
};
