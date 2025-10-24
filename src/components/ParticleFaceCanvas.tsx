import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
}

interface ParticleFaceCanvasProps {
  particleCount: number;
  flowSpeed: number;
  expression: 'neutral' | 'happy' | 'sad' | 'thinking' | 'speaking';
  ditherStyle: 'none' | 'bayer' | 'halftone' | 'noise';
  holographicIntensity: number;
  audioReactive: boolean;
}

export const ParticleFaceCanvas: React.FC<ParticleFaceCanvasProps> = ({
  particleCount,
  flowSpeed,
  expression,
  ditherStyle,
  holographicIntensity,
  audioReactive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const [audioLevel, setAudioLevel] = useState(0);

  // Initialize audio monitoring
  useEffect(() => {
    if (!audioReactive) return;

    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Uint8Array<ArrayBuffer>;
    let animationId: number;

    const setupAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateAudioLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = Array.from(dataArray).reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(average / 255);
          animationId = requestAnimationFrame(updateAudioLevel);
        };
        updateAudioLevel();
      } catch (err) {
        console.log('Audio access denied or not available');
      }
    };

    setupAudio();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioContext) audioContext.close();
    };
  }, [audioReactive]);

  // Generate face points based on expression
  const generateFacePoints = (
    width: number,
    height: number,
    expr: string
  ): { x: number; y: number; intensity: number }[] => {
    const points: { x: number; y: number; intensity: number }[] = [];
    const centerX = width / 2;
    const centerY = height / 2;

    // Face outline (circle)
    for (let i = 0; i < 360; i += 2) {
      const angle = (i * Math.PI) / 180;
      const radius = Math.min(width, height) * 0.35;
      points.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        intensity: 0.8,
      });
    }

    // Eyes
    const eyeY = centerY - height * 0.08;
    const eyeSpacing = width * 0.12;
    
    // Left eye
    for (let i = 0; i < 360; i += 8) {
      const angle = (i * Math.PI) / 180;
      const radius = width * 0.04;
      points.push({
        x: centerX - eyeSpacing + Math.cos(angle) * radius,
        y: eyeY + Math.sin(angle) * radius,
        intensity: 1,
      });
    }

    // Right eye
    for (let i = 0; i < 360; i += 8) {
      const angle = (i * Math.PI) / 180;
      const radius = width * 0.04;
      points.push({
        x: centerX + eyeSpacing + Math.cos(angle) * radius,
        y: eyeY + Math.sin(angle) * radius,
        intensity: 1,
      });
    }

    // Mouth based on expression
    const mouthY = centerY + height * 0.12;
    const mouthWidth = width * 0.2;
    
    if (expr === 'happy') {
      // Smile curve
      for (let i = 0; i < 100; i++) {
        const t = i / 100;
        const x = centerX + (t - 0.5) * mouthWidth * 2;
        const curve = Math.sin(t * Math.PI) * height * 0.06;
        points.push({ x, y: mouthY + curve, intensity: 0.9 });
      }
    } else if (expr === 'sad') {
      // Frown curve
      for (let i = 0; i < 100; i++) {
        const t = i / 100;
        const x = centerX + (t - 0.5) * mouthWidth * 2;
        const curve = -Math.sin(t * Math.PI) * height * 0.06;
        points.push({ x, y: mouthY + curve, intensity: 0.9 });
      }
    } else if (expr === 'thinking') {
      // Neutral line with thinking dots
      for (let i = 0; i < 50; i++) {
        const t = i / 50;
        const x = centerX + (t - 0.5) * mouthWidth * 1.5;
        points.push({ x, y: mouthY, intensity: 0.7 });
      }
      // Thinking dots above head
      for (let i = 0; i < 3; i++) {
        const dotX = centerX + width * 0.15 + i * 15;
        const dotY = centerY - height * 0.25 - i * 20;
        for (let j = 0; j < 360; j += 30) {
          const angle = (j * Math.PI) / 180;
          const radius = 8;
          points.push({
            x: dotX + Math.cos(angle) * radius,
            y: dotY + Math.sin(angle) * radius,
            intensity: 0.8 - i * 0.2,
          });
        }
      }
    } else if (expr === 'speaking') {
      // Open mouth (oval)
      const mouthHeight = height * 0.08;
      for (let i = 0; i < 360; i += 6) {
        const angle = (i * Math.PI) / 180;
        points.push({
          x: centerX + Math.cos(angle) * mouthWidth,
          y: mouthY + Math.sin(angle) * mouthHeight,
          intensity: 0.9,
        });
      }
    } else {
      // Neutral straight line
      for (let i = 0; i < 50; i++) {
        const t = i / 50;
        const x = centerX + (t - 0.5) * mouthWidth * 2;
        points.push({ x, y: mouthY, intensity: 0.8 });
      }
    }

    return points;
  };

  // Apply dithering effect
  const applyDithering = (
    x: number,
    y: number,
    intensity: number,
    style: string,
    time: number
  ): number => {
    if (style === 'none') return intensity;

    if (style === 'bayer') {
      const bayerMatrix = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5],
      ];
      const threshold = bayerMatrix[Math.floor(y) % 4][Math.floor(x) % 4] / 16;
      return intensity > threshold ? 1 : 0.3;
    }

    if (style === 'halftone') {
      const dotSize = 12;
      const dotX = Math.floor(x / dotSize) * dotSize + dotSize / 2;
      const dotY = Math.floor(y / dotSize) * dotSize + dotSize / 2;
      const dist = Math.sqrt((x - dotX) ** 2 + (y - dotY) ** 2);
      const maxDist = (dotSize / 2) * intensity;
      return dist < maxDist ? 1 : 0.2;
    }

    if (style === 'noise') {
      const noise = (Math.sin(x * 0.1 + time) * Math.cos(y * 0.1 + time) + 1) / 2;
      return intensity * (0.5 + noise * 0.5);
    }

    return intensity;
  };

  // Initialize and animate particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Initialize particles
    if (particlesRef.current.length !== particleCount) {
      particlesRef.current = Array.from({ length: particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        targetX: 0,
        targetY: 0,
        vx: 0,
        vy: 0,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.5,
        hue: Math.random() * 60 + 180, // Blue-cyan range
      }));
    }

    let time = 0;

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);

      time += 0.01 * flowSpeed;

      // Generate face points
      const facePoints = generateFacePoints(width, height, expression);

      // Update and draw particles
      particlesRef.current.forEach((particle, i) => {
        // Assign target point
        const targetPoint = facePoints[i % facePoints.length];
        particle.targetX = targetPoint.x;
        particle.targetY = targetPoint.y;

        // Apply audio reactivity
        const reactivity = audioReactive ? audioLevel * 50 : 0;
        const flowOffset = Math.sin(time + i * 0.1) * reactivity;

        // Move towards target with flow
        const dx = particle.targetX - particle.x + flowOffset;
        const dy = particle.targetY - particle.y + flowOffset;
        particle.vx += dx * 0.01 * flowSpeed;
        particle.vy += dy * 0.01 * flowSpeed;
        particle.vx *= 0.95;
        particle.vy *= 0.95;
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Apply dithering
        const ditheredOpacity = applyDithering(
          particle.x,
          particle.y,
          targetPoint.intensity * particle.opacity,
          ditherStyle,
          time
        );

        // Holographic color shifting
        const hueShift = Math.sin(time + i * 0.01) * 30 * holographicIntensity;
        const finalHue = particle.hue + hueShift;

        // Draw particle with glow
        const glowSize = particle.size * (1 + audioLevel * 2);
        
        // Outer glow
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, glowSize * 2
        );
        gradient.addColorStop(0, `hsla(${finalHue}, 80%, 60%, ${ditheredOpacity * 0.8})`);
        gradient.addColorStop(0.5, `hsla(${finalHue}, 70%, 50%, ${ditheredOpacity * 0.4})`);
        gradient.addColorStop(1, `hsla(${finalHue}, 60%, 40%, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, glowSize * 2, 0, Math.PI * 2);
        ctx.fill();

        // Core particle
        ctx.fillStyle = `hsla(${finalHue}, 90%, 70%, ${ditheredOpacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [particleCount, flowSpeed, expression, ditherStyle, holographicIntensity, audioReactive, audioLevel]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="w-full h-auto rounded-lg"
      style={{ maxHeight: '600px' }}
    />
  );
};
