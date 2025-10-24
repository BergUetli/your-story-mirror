import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

interface ParticleFaceCanvasProps {
  particleCount?: number;
  flowSpeed?: number;
  expression?: 'neutral' | 'happy' | 'sad' | 'thinking' | 'speaking';
  colorPalette?: 'tron' | 'spectral' | 'cyber' | 'aurora';
  flowIntensity?: number;
  breathingSpeed?: number;
  ditherStyle?: 'none' | 'pixelated' | 'halftone';
  audioReactive?: boolean;
}

const colorPalettes = {
  tron: [
    new THREE.Color(0x00d9ff), // Cyan
    new THREE.Color(0x0099ff), // Blue
    new THREE.Color(0xff006e), // Pink
    new THREE.Color(0xffd700), // Gold
  ],
  spectral: [
    new THREE.Color(0x1e3a8a), // Deep Blue
    new THREE.Color(0x3b82f6), // Blue
    new THREE.Color(0x8b5cf6), // Purple
    new THREE.Color(0xec4899), // Pink
  ],
  cyber: [
    new THREE.Color(0x00ffff), // Cyan
    new THREE.Color(0xff00ff), // Magenta
    new THREE.Color(0xffff00), // Yellow
    new THREE.Color(0x00ff00), // Green
  ],
  aurora: [
    new THREE.Color(0x06b6d4), // Teal
    new THREE.Color(0x8b5cf6), // Purple
    new THREE.Color(0xf59e0b), // Amber
    new THREE.Color(0x10b981), // Emerald
  ],
};

function ParticleSystem({
  particleCount = 3000,
  flowSpeed = 1,
  expression = 'neutral',
  colorPalette = 'tron',
  flowIntensity = 1,
  breathingSpeed = 1,
  ditherStyle = 'none',
  audioReactive = false,
}: ParticleFaceCanvasProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const noise3D = useMemo(() => createNoise3D(), []);
  const timeRef = useRef(0);
  const audioLevelRef = useRef(0);

  // Audio setup
  useEffect(() => {
    if (!audioReactive) return;

    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Uint8Array;
    let animationId: number;

    const setupAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(new ArrayBuffer(bufferLength));

        const updateAudioLevel = () => {
          analyser.getByteFrequencyData(dataArray as Uint8Array<ArrayBuffer>);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          audioLevelRef.current = average / 255;
          animationId = requestAnimationFrame(updateAudioLevel);
        };
        updateAudioLevel();
      } catch (err) {
        console.warn('Audio access denied:', err);
      }
    };

    setupAudio();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioContext) audioContext.close();
    };
  }, [audioReactive]);

  // Generate face shape points
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const palette = colorPalettes[colorPalette];

    // Generate face shape
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const rand = Math.random();
      
      // Create face-like distribution
      let x, y, z;
      
      if (rand < 0.4) {
        // Face outline (oval)
        const ovalAngle = Math.random() * Math.PI * 2;
        const ovalRadius = 0.8 + Math.random() * 0.2;
        x = Math.cos(ovalAngle) * ovalRadius * 1.2;
        y = Math.sin(ovalAngle) * ovalRadius * 1.5;
        z = (Math.random() - 0.5) * 0.3;
      } else if (rand < 0.55) {
        // Left eye
        const eyeAngle = Math.random() * Math.PI * 2;
        const eyeRadius = Math.random() * 0.25;
        x = -0.5 + Math.cos(eyeAngle) * eyeRadius;
        y = 0.3 + Math.sin(eyeAngle) * eyeRadius;
        z = (Math.random() - 0.5) * 0.2;
      } else if (rand < 0.7) {
        // Right eye
        const eyeAngle = Math.random() * Math.PI * 2;
        const eyeRadius = Math.random() * 0.25;
        x = 0.5 + Math.cos(eyeAngle) * eyeRadius;
        y = 0.3 + Math.sin(eyeAngle) * eyeRadius;
        z = (Math.random() - 0.5) * 0.2;
      } else {
        // Mouth based on expression
        const mouthT = Math.random();
        const mouthWidth = 0.8;
        x = (mouthT - 0.5) * mouthWidth;
        
        if (expression === 'happy') {
          y = -0.5 - Math.abs(x) * 0.4;
        } else if (expression === 'sad') {
          y = -0.4 + Math.abs(x) * 0.3;
        } else {
          y = -0.5 - Math.sin(mouthT * Math.PI) * 0.1;
        }
        z = (Math.random() - 0.5) * 0.2;
      }

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      // Assign colors from palette
      const colorIndex = Math.floor(Math.random() * palette.length);
      const color = palette[colorIndex];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // Random sizes
      sizes[i] = Math.random() * 0.03 + 0.01;
    }

    return { positions, colors, sizes };
  }, [particleCount, expression, colorPalette]);

  // Animation
  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    timeRef.current += delta * flowSpeed;
    const time = timeRef.current;
    const breathe = Math.sin(time * breathingSpeed) * 0.05;
    const audioBoost = audioReactive ? audioLevelRef.current * 0.3 : 0;

    const positionAttribute = pointsRef.current.geometry.attributes.position;
    const colorAttribute = pointsRef.current.geometry.attributes.color;
    const positions = positionAttribute.array as Float32Array;
    const colors = colorAttribute.array as Float32Array;
    const palette = colorPalettes[colorPalette];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];

      // Curl noise for fluid motion
      const noiseScale = 0.5;
      const noiseTime = time * 0.2;
      
      const noise1 = noise3D(x * noiseScale, y * noiseScale, noiseTime);
      const noise2 = noise3D(x * noiseScale + 100, y * noiseScale + 100, noiseTime);
      const noise3Val = noise3D(x * noiseScale + 200, y * noiseScale + 200, noiseTime);

      // Apply curl noise (vector field)
      const curlX = noise2 - noise3Val;
      const curlY = noise3Val - noise1;
      const curlZ = noise1 - noise2;

      positions[i3] += curlX * flowIntensity * 0.002;
      positions[i3 + 1] += curlY * flowIntensity * 0.002;
      positions[i3 + 2] += curlZ * flowIntensity * 0.001;

      // Breathing effect
      const scale = 1 + breathe + audioBoost;
      positions[i3] = x * scale;
      positions[i3 + 1] = y * scale;

      // Color shifting
      const colorShift = (time * 0.1 + i * 0.01) % 1;
      const colorIndex = Math.floor(colorShift * palette.length);
      const nextColorIndex = (colorIndex + 1) % palette.length;
      const lerpFactor = (colorShift * palette.length) % 1;
      
      const color1 = palette[colorIndex];
      const color2 = palette[nextColorIndex];
      
      colors[i3] = THREE.MathUtils.lerp(color1.r, color2.r, lerpFactor);
      colors[i3 + 1] = THREE.MathUtils.lerp(color1.g, color2.g, lerpFactor);
      colors[i3 + 2] = THREE.MathUtils.lerp(color1.b, color2.b, lerpFactor);

      // Keep particles within bounds (soft containment)
      const distFromCenter = Math.sqrt(x * x + y * y + z * z);
      if (distFromCenter > 2.5) {
        positions[i3] *= 0.98;
        positions[i3 + 1] *= 0.98;
        positions[i3 + 2] *= 0.98;
      }
    }

    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;

    // Gentle rotation
    pointsRef.current.rotation.y = Math.sin(time * 0.1) * 0.1;
    pointsRef.current.rotation.x = Math.sin(time * 0.15) * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={`
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * 300.0 / -mvPosition.z;
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          
          void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            
            // Soft glow
            float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
            alpha = pow(alpha, 2.0);
            
            // Add bloom effect
            float glow = exp(-dist * 8.0);
            
            gl_FragColor = vec4(vColor * (1.0 + glow * 0.5), alpha * 0.8);
          }
        `}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function ParticleFaceCanvas(props: ParticleFaceCanvasProps) {
  return (
    <div className="w-full h-[500px] bg-gradient-to-b from-black via-gray-900 to-black rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 60 }}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.1} />
        <ParticleSystem {...props} />
      </Canvas>
    </div>
  );
}
