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
    <div className="relative flex flex-col items-center justify-center min-h-[550px] w-full max-w-full py-8">
      {/* Background gradient enhancements */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 via-transparent to-purple-50/20 pointer-events-none rounded-2xl" />
      <div className="absolute inset-0 bg-gradient-radial from-blue-100/20 via-transparent to-transparent pointer-events-none" />
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
          50% { transform: scale(1.02); }
        }

        .pulsing-border-wrapper {
          position: relative;
          width: min(280px, 70vw);
          height: min(280px, 70vw);
          max-width: 100%;
          border-radius: 50%;
          padding: 8px;
          flex-shrink: 1;
          filter: drop-shadow(0 15px 30px rgba(0, 102, 255, 0.2));
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .pulsing-border-wrapper:hover {
          filter: drop-shadow(0 20px 40px rgba(0, 102, 255, 0.3));
          transform: scale(1.05);
        }
        
        .pulsing-border-wrapper::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          padding: 3px;
          background: linear-gradient(
            45deg,
            #0066FF,
            #00BFFF,
            #4169E1,
            #1E90FF,
            #0066FF
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
          className="relative w-full h-full rounded-full flex items-center justify-center transition-all duration-500 hover:scale-105 disabled:cursor-not-allowed overflow-hidden"
          style={{
            background: state === 'speaking' 
              ? 'radial-gradient(circle at 30% 30%, rgba(0,102,255,0.5) 0%, rgba(30,144,255,0.35) 40%, rgba(0,191,255,0.25) 100%)'
              : state === 'listening'
              ? 'radial-gradient(circle at 30% 30%, rgba(0,191,255,0.5) 0%, rgba(0,102,255,0.35) 40%, rgba(65,105,225,0.25) 100%)'
              : 'radial-gradient(circle at 30% 30%, rgba(0,102,255,0.25) 0%, rgba(30,144,255,0.18) 40%, rgba(0,191,255,0.12) 100%)',
            backdropFilter: 'blur(24px) saturate(1.2)',
            boxShadow: state === 'speaking'
              ? '0 0 100px rgba(0,102,255,0.6), 0 0 50px rgba(30,144,255,0.45), 0 10px 40px rgba(0,102,255,0.3), inset 0 0 80px rgba(0,191,255,0.35)'
              : state === 'listening'
              ? '0 0 80px rgba(0,191,255,0.5), 0 0 40px rgba(0,102,255,0.35), 0 10px 35px rgba(0,191,255,0.25), inset 0 0 60px rgba(0,102,255,0.25)'
              : '0 0 50px rgba(0,102,255,0.35), 0 5px 25px rgba(0,102,255,0.2), inset 0 0 40px rgba(30,144,255,0.18)'
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
            className="relative z-10 w-20 h-20 transition-all duration-300"
            style={{
              color: state === 'speaking' ? '#00BFFF' : state === 'listening' ? '#1E90FF' : '#0066FF',
              filter: `drop-shadow(0 0 ${state === 'speaking' ? '20px' : state === 'listening' ? '15px' : '8px'} currentColor)`,
              animation: state === 'speaking' ? 'pulse 1s ease-in-out infinite' : state === 'listening' ? 'pulse 2s ease-in-out infinite' : 'none'
            }}
          />
        </button>
      </div>

      {/* Caption card - Enhanced design */}
      {state !== 'idle' && (
        <div 
          className="mt-6 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.95))',
            backdropFilter: 'blur(16px) saturate(1.1)',
            border: '2px solid',
            borderColor: state === 'speaking' ? 'rgba(0, 191, 255, 0.5)' : 'rgba(30, 144, 255, 0.5)',
            color: state === 'speaking' ? '#0066FF' : '#0066FF',
            boxShadow: `0 8px 24px ${state === 'speaking' ? 'rgba(0,191,255,0.25)' : 'rgba(30,144,255,0.25)'}, 0 2px 8px rgba(0,0,0,0.08)`,
            transform: 'translateY(0)',
            letterSpacing: '0.01em'
          }}
          aria-live="polite"
        >
          {state === 'listening' && '🎤 Listening...'}
          {state === 'speaking' && '💬 Speaking...'}
        </div>
      )}

      {/* Provenance chip - Enhanced design */}
      <div 
        className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(249, 250, 251, 0.88))',
          backdropFilter: 'blur(12px)',
          border: '1.5px solid rgba(0,102,255,0.25)',
          color: '#0066FF',
          boxShadow: '0 4px 12px rgba(0, 102, 255, 0.12), 0 1px 3px rgba(0,0,0,0.06)',
          letterSpacing: '0.02em'
        }}
      >
        <div 
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: '#0066FF' }}
        />
        <span>Solin AI</span>
      </div>
    </div>
  );
};
