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
    <div className="relative flex flex-col items-center justify-center min-h-[600px] w-full">
      <style>{`
        @keyframes pulsing-border {
          0%, 100% {
            background-position: 0% 50%;
            filter: blur(8px) brightness(1);
          }
          50% {
            background-position: 100% 50%;
            filter: blur(12px) brightness(1.2);
          }
        }
        
        @keyframes rotate-gradient {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .pulsing-border-wrapper {
          position: relative;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          padding: 10px;
        }
        
        .pulsing-border-wrapper::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          padding: 3px;
          background: linear-gradient(
            45deg,
            #5800FF,
            #BEECFF,
            #E77EDC,
            #FF4C3E,
            #5800FF
          );
          background-size: 300% 300%;
          animation: pulsing-border 4s ease infinite, rotate-gradient 8s linear infinite;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }
      `}</style>
      
      {/* Custom pulsing border wrapper */}
      <div className="pulsing-border-wrapper" style={{
        animation: state === 'speaking' ? 'pulse-scale 1s ease-in-out infinite' : 'none'
      }}>
        {/* Main orb button */}
        <button
          onClick={onClick}
          disabled={isActive}
          className="relative w-full h-full rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 disabled:cursor-not-allowed overflow-hidden"
          style={{
            background: state === 'speaking' 
              ? 'radial-gradient(circle, rgba(88,0,255,0.4) 0%, rgba(231,126,220,0.3) 50%, rgba(190,236,255,0.2) 100%)'
              : state === 'listening'
              ? 'radial-gradient(circle, rgba(190,236,255,0.4) 0%, rgba(88,0,255,0.3) 50%, rgba(231,126,220,0.2) 100%)'
              : 'radial-gradient(circle, rgba(88,0,255,0.2) 0%, rgba(231,126,220,0.15) 50%, rgba(190,236,255,0.1) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: state === 'speaking'
              ? '0 0 80px rgba(88,0,255,0.5), 0 0 40px rgba(231,126,220,0.4), inset 0 0 60px rgba(231,126,220,0.3)'
              : state === 'listening'
              ? '0 0 60px rgba(190,236,255,0.4), 0 0 30px rgba(88,0,255,0.3), inset 0 0 40px rgba(88,0,255,0.2)'
              : '0 0 40px rgba(88,0,255,0.3), inset 0 0 30px rgba(231,126,220,0.15)'
          }}
          aria-label={getAriaLabel()}
          aria-pressed={isActive}
        >
          {/* Animated gradient overlay */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)',
              animation: state === 'speaking' ? 'pulse 1.5s ease-in-out infinite' : 'none'
            }}
          />
          
          {/* Microphone icon */}
          <Mic 
            className="relative z-10 w-24 h-24 transition-all duration-300"
            style={{
              color: state === 'speaking' ? '#E77EDC' : state === 'listening' ? '#BEECFF' : '#5800FF',
              filter: `drop-shadow(0 0 ${state === 'speaking' ? '20px' : state === 'listening' ? '15px' : '8px'} currentColor)`,
              animation: state === 'speaking' ? 'pulse 1s ease-in-out infinite' : state === 'listening' ? 'pulse 2s ease-in-out infinite' : 'none'
            }}
          />
        </button>
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
