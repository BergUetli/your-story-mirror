import React from 'react';

interface AnimatedOrbProps {
  isActive: boolean;
  isSpeaking: boolean;
  size?: number;
}

export const AnimatedOrb: React.FC<AnimatedOrbProps> = ({ 
  isActive, 
  isSpeaking,
  size = 160 
}) => {
  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Core orb */}
      <div 
        className={`absolute inset-0 rounded-full bg-gradient-to-br from-primary via-accent to-purple-600 transition-all duration-500 ${
          isSpeaking ? 'scale-110' : isActive ? 'scale-105' : ''
        }`}
        style={{
          boxShadow: isSpeaking 
            ? '0 0 60px rgba(168,85,247,0.8), 0 0 120px rgba(168,85,247,0.4)' 
            : isActive 
            ? '0 0 40px rgba(168,85,247,0.6)' 
            : '0 0 20px rgba(168,85,247,0.3)'
        }}
      />

      {/* Ripple layers when active */}
      {isActive && (
        <>
          {/* Layer 1 - Purple */}
          <div 
            className="absolute inset-0 rounded-full bg-primary/20 animate-ping"
            style={{ animationDuration: '2s' }}
          />
          
          {/* Layer 2 - Blue */}
          <div 
            className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"
            style={{ animationDuration: '2.5s', animationDelay: '0.3s' }}
          />
          
          {/* Layer 3 - Pink */}
          <div 
            className="absolute inset-0 rounded-full bg-pink-500/20 animate-ping"
            style={{ animationDuration: '3s', animationDelay: '0.6s' }}
          />

          {/* Layer 4 - Cyan */}
          <div 
            className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping"
            style={{ animationDuration: '2.8s', animationDelay: '0.9s' }}
          />
        </>
      )}

      {/* Inner glow pulse when speaking */}
      {isSpeaking && (
        <div 
          className="absolute inset-4 rounded-full bg-white/30 animate-pulse"
          style={{ animationDuration: '1s' }}
        />
      )}

      {/* Center dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`w-4 h-4 rounded-full bg-white transition-all duration-300 ${
          isSpeaking ? 'scale-150' : ''
        }`} />
      </div>
    </div>
  );
};
