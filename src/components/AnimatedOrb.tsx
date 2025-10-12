import React from 'react';

interface AnimatedOrbProps {
  isActive: boolean;
  isSpeaking: boolean;
  size?: number;
}

export const AnimatedOrb: React.FC<AnimatedOrbProps> = ({ 
  isActive, 
  isSpeaking,
  size = 200 
}) => {
  return (
    <div 
      className="relative flex items-center justify-center pointer-events-none"
      style={{ width: size, height: size }}
    >
      {/* Outer glow - state-based */}
      <div 
        className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 ${
          isSpeaking ? 'opacity-80 scale-110' : isActive ? 'opacity-60 scale-105' : 'opacity-40'
        }`}
        style={{
          background: 'var(--gradient-orb-glow)',
        }}
      />

      {/* Core orb - radial gradient from deep to light blue */}
      <div 
        className={`absolute inset-0 rounded-full transition-all duration-700 ${
          isSpeaking ? 'scale-110' : isActive ? 'scale-105' : ''
        }`}
        style={{
          background: 'var(--gradient-orb)',
          boxShadow: isSpeaking 
            ? '0 0 48px hsl(210 70% 55% / 0.6), 0 0 96px hsl(210 60% 60% / 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.3)' 
            : isActive 
            ? '0 0 32px hsl(210 70% 55% / 0.5), 0 0 64px hsl(210 60% 60% / 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.2)' 
            : '0 0 24px hsl(210 70% 55% / 0.3), inset 0 1px 4px rgba(255, 255, 255, 0.2)'
        }}
      />

      {/* Breathing animation when listening */}
      {isActive && !isSpeaking && (
        <div 
          className="absolute inset-0 rounded-full animate-pulse"
          style={{ 
            animationDuration: '2.5s',
            background: 'radial-gradient(circle, hsl(210 70% 60% / 0.3) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Concentric rings when speaking */}
      {isSpeaking && (
        <>
          <div 
            className="absolute inset-0 rounded-full animate-ping"
            style={{ 
              animationDuration: '1.5s',
              background: 'radial-gradient(circle, hsl(210 70% 60% / 0.4) 0%, transparent 60%)',
            }}
          />
          <div 
            className="absolute inset-0 rounded-full animate-ping"
            style={{ 
              animationDuration: '2s', 
              animationDelay: '0.3s',
              background: 'radial-gradient(circle, hsl(210 60% 65% / 0.3) 0%, transparent 60%)',
            }}
          />
          <div 
            className="absolute inset-0 rounded-full animate-ping"
            style={{ 
              animationDuration: '2.5s', 
              animationDelay: '0.6s',
              background: 'radial-gradient(circle, hsl(210 50% 70% / 0.2) 0%, transparent 60%)',
            }}
          />
        </>
      )}

      {/* Center highlight */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className={`w-5 h-5 rounded-full transition-all duration-300 ${
            isSpeaking ? 'scale-150 opacity-90' : 'opacity-70'
          }`}
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.95), rgba(210, 230, 255, 0.7))',
            boxShadow: '0 2px 12px hsl(210 70% 60% / 0.5)'
          }}
        />
      </div>
    </div>
  );
};
