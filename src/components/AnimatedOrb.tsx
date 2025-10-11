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
      className="relative flex items-center justify-center pointer-events-none"
      style={{ width: size, height: size }}
    >
      {/* Core orb with metallic gradient */}
      <div 
        className={`absolute inset-0 rounded-full transition-all duration-500 ${
          isSpeaking ? 'scale-110' : isActive ? 'scale-105' : ''
        }`}
        style={{
          background: 'linear-gradient(135deg, hsl(220 80% 60%), hsl(210 90% 70%), hsl(220 80% 60%), hsl(210 70% 50%))',
          boxShadow: isSpeaking 
            ? '0 0 60px rgba(59, 130, 246, 0.9), 0 0 120px rgba(59, 130, 246, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.3)' 
            : isActive 
            ? '0 0 40px rgba(59, 130, 246, 0.7), 0 0 80px rgba(59, 130, 246, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.2)' 
            : '0 0 20px rgba(59, 130, 246, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2), inset 0 -1px 2px rgba(0, 0, 0, 0.2)'
        }}
      />

      {/* Ripple layers when active - metallic rings */}
      {isActive && (
        <>
          {/* Layer 1 - Blue metallic */}
          <div 
            className="absolute inset-0 rounded-full animate-ping"
            style={{ 
              animationDuration: '2s',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
            }}
          />
          
          {/* Layer 2 - Cyan metallic */}
          <div 
            className="absolute inset-0 rounded-full animate-ping"
            style={{ 
              animationDuration: '2.5s', 
              animationDelay: '0.3s',
              background: 'radial-gradient(circle, rgba(34, 211, 238, 0.25) 0%, transparent 70%)',
              boxShadow: '0 0 15px rgba(34, 211, 238, 0.3)'
            }}
          />
          
          {/* Layer 3 - Sky metallic */}
          <div 
            className="absolute inset-0 rounded-full animate-ping"
            style={{ 
              animationDuration: '3s', 
              animationDelay: '0.6s',
              background: 'radial-gradient(circle, rgba(125, 211, 252, 0.2) 0%, transparent 70%)',
              boxShadow: '0 0 10px rgba(125, 211, 252, 0.2)'
            }}
          />
        </>
      )}

      {/* Inner glow pulse when speaking */}
      {isSpeaking && (
        <div 
          className="absolute inset-4 rounded-full animate-pulse"
          style={{ 
            animationDuration: '1s',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%)',
            boxShadow: 'inset 0 0 20px rgba(255, 255, 255, 0.5)'
          }}
        />
      )}

      {/* Center dot with metallic shine */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className={`w-4 h-4 rounded-full transition-all duration-300 ${
            isSpeaking ? 'scale-150' : ''
          }`}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(200, 220, 255, 0.8))',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.5)'
          }}
        />
      </div>
    </div>
  );
};
