import React from 'react';
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
  return (
    <button
      onClick={onClick}
      disabled={isActive}
      className="relative w-48 h-48 flex items-center justify-center group"
      aria-label="Start voice conversation"
    >
      {/* Outer glow ring */}
      <div 
        className={`absolute inset-0 rounded-full transition-all duration-700 ${
          isSpeaking ? 'opacity-100 scale-110 animate-pulse' : isActive ? 'opacity-80 scale-105' : 'opacity-60'
        }`}
        style={{
          background: 'var(--gradient-orb-glow)',
          filter: 'blur(40px)',
        }}
      />

      {/* Animated gradient ring */}
      <div 
        className={`absolute inset-4 rounded-full transition-all duration-500 ${
          isSpeaking ? 'scale-105' : isActive ? 'scale-100' : 'scale-95 group-hover:scale-100'
        }`}
        style={{
          background: 'var(--gradient-ring)',
          animation: isActive ? 'spin 3s linear infinite' : 'none',
        }}
      />

      {/* Inner white background */}
      <div 
        className={`absolute inset-8 rounded-full bg-white transition-all duration-300 ${
          isSpeaking ? 'shadow-[0_0_40px_rgba(59,130,246,0.5)]' : ''
        }`}
      />

      {/* Microphone icon */}
      <div className="relative z-10">
        <Mic 
          className={`w-16 h-16 transition-all duration-300 ${
            isSpeaking ? 'text-primary scale-110' : isActive ? 'text-primary' : 'text-primary/70 group-hover:text-primary group-hover:scale-110'
          }`}
        />
      </div>

      {/* Pulsing rings when listening */}
      {isActive && !isSpeaking && (
        <>
          <div 
            className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping"
            style={{ animationDuration: '2s' }}
          />
          <div 
            className="absolute inset-2 rounded-full border-2 border-primary/20 animate-ping"
            style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}
          />
        </>
      )}
    </button>
  );
};
