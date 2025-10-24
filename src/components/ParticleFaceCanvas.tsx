import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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

interface MousePosition {
  x: number;
  y: number;
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
  particleCount = 10000,
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
  const mousePosition = useRef<MousePosition>({ x: 0, y: 0 });
  const targetPositions = useRef<Float32Array>(new Float32Array(particleCount * 3));
  const { camera } = useThree();

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mousePosition.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mousePosition.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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

  // Generate face mask and initial positions using anatomical proportions
  const { positions, colors, sizes, faceMask } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const faceMask = new Float32Array(particleCount);
    const palette = colorPalettes[colorPalette];

    // Helper function to sample points on face regions with anatomical accuracy
    const sampleFaceRegion = (region: string, t: number) => {
      const rand = Math.random;
      let x = 0, y = 0, z = 0, weight = 1.0;

      switch (region) {
        case 'cranium':
          // Upper head - spherical dome (30% of face)
          const theta = Math.acos(1 - rand() * 0.7); // Top hemisphere
          const phi = rand() * Math.PI * 2;
          const r = 0.95 + rand() * 0.15;
          x = r * Math.sin(theta) * Math.cos(phi) * 0.85;
          y = 0.6 + r * Math.cos(theta) * 0.5; // Elevated
          z = r * Math.sin(theta) * Math.sin(phi) * 0.65;
          weight = 0.7;
          break;

        case 'forehead':
          // Forehead - slightly curved plane
          x = (rand() - 0.5) * 1.3;
          y = 0.35 + rand() * 0.25; // Upper third
          z = 0.25 + rand() * 0.15 - Math.abs(x) * 0.1; // Slight curve
          weight = 0.85;
          break;

        case 'eyeLeft':
          // Left eye socket - almond shaped, at mid-face height
          const eyeAngleL = rand() * Math.PI * 2;
          const eyeRadiusL = rand() * 0.18;
          x = -0.35 + Math.cos(eyeAngleL) * eyeRadiusL * 1.4; // Wider
          y = 0.15 + Math.sin(eyeAngleL) * eyeRadiusL * 0.8; // Taller
          z = 0.32 + (rand() - 0.5) * 0.12; // Deep set
          weight = 1.0;
          break;

        case 'eyeRight':
          // Right eye socket - mirror of left
          const eyeAngleR = rand() * Math.PI * 2;
          const eyeRadiusR = rand() * 0.18;
          x = 0.35 + Math.cos(eyeAngleR) * eyeRadiusR * 1.4;
          y = 0.15 + Math.sin(eyeAngleR) * eyeRadiusR * 0.8;
          z = 0.32 + (rand() - 0.5) * 0.12;
          weight = 1.0;
          break;

        case 'eyebrowLeft':
          // Left eyebrow arc
          const browT = rand();
          x = -0.5 + browT * 0.3;
          y = 0.32 + Math.sin(browT * Math.PI) * 0.05;
          z = 0.28;
          weight = 0.9;
          break;

        case 'eyebrowRight':
          // Right eyebrow arc
          const browTR = rand();
          x = 0.2 + browTR * 0.3;
          y = 0.32 + Math.sin(browTR * Math.PI) * 0.05;
          z = 0.28;
          weight = 0.9;
          break;

        case 'noseBridge':
          // Nose bridge - straight line between eyes
          const bridgeT = rand();
          x = (rand() - 0.5) * 0.15;
          y = 0.15 - bridgeT * 0.2;
          z = 0.35 + bridgeT * 0.05;
          weight = 1.0;
          break;

        case 'noseTip':
          // Nose tip and nostrils - protruding
          const noseAngle = rand() * Math.PI * 2;
          const noseR = rand() * 0.18;
          x = Math.cos(noseAngle) * noseR * 0.8;
          y = -0.05 + Math.sin(noseAngle) * noseR * 0.5;
          z = 0.42 + rand() * 0.08;
          weight = 1.0;
          break;

        case 'cheekLeft':
          // Left cheekbone - volumetric prominence
          x = -0.55 - rand() * 0.2;
          y = 0.05 + (rand() - 0.5) * 0.25;
          z = 0.18 + rand() * 0.2;
          weight = 0.85;
          break;

        case 'cheekRight':
          // Right cheekbone - volumetric prominence
          x = 0.55 + rand() * 0.2;
          y = 0.05 + (rand() - 0.5) * 0.25;
          z = 0.18 + rand() * 0.2;
          weight = 0.85;
          break;

        case 'upperLip':
          // Upper lip - Cupid's bow shape
          const lipT = rand();
          const cupidBow = Math.sin(lipT * Math.PI * 2) * 0.03;
          x = (lipT - 0.5) * 0.5;
          y = -0.18 + cupidBow;
          z = 0.38 - Math.abs(x) * 0.1;
          weight = 0.95;
          break;

        case 'lowerLip':
          // Lower lip - fuller
          const lowerLipT = rand();
          x = (lowerLipT - 0.5) * 0.55;
          y = -0.25 + Math.sin(lowerLipT * Math.PI) * 0.02;
          z = 0.36 - Math.abs(x) * 0.12;
          weight = 0.95;
          break;

        case 'jaw':
          // Jaw line - curved from ear to chin
          const jawAngle = rand() * Math.PI - Math.PI * 0.5; // -90° to +90°
          const jawRadius = 0.75 + rand() * 0.15;
          x = Math.cos(jawAngle) * jawRadius;
          y = -0.45 - Math.pow(Math.abs(Math.sin(jawAngle)), 1.5) * 0.3;
          z = 0.15 + Math.sin(jawAngle) * 0.25;
          weight = 0.9;
          break;

        case 'chin':
          // Chin - rounded protrusion
          const chinAngle = rand() * Math.PI;
          const chinR = rand() * 0.22;
          x = Math.cos(chinAngle) * chinR * 0.5;
          y = -0.75 + Math.sin(chinAngle) * chinR * 0.3;
          z = 0.25 + rand() * 0.1;
          weight = 1.0;
          break;

        case 'temple':
          // Temples - sides of forehead
          const side = rand() < 0.5 ? -1 : 1;
          x = side * (0.7 + rand() * 0.2);
          y = 0.25 + rand() * 0.2;
          z = 0.1 + rand() * 0.15;
          weight = 0.75;
          break;

        case 'atmosphere':
          // Sparse atmospheric particles
          x = (rand() - 0.5) * 2.5;
          y = (rand() - 0.5) * 2.8;
          z = (rand() - 0.5) * 1.5;
          weight = 0.15;
          break;
      }

      return { x, y, z, weight };
    };

    // Distribute particles across anatomical regions with proper proportions
    const regions = [
      { name: 'cranium', ratio: 0.12 },
      { name: 'forehead', ratio: 0.10 },
      { name: 'eyeLeft', ratio: 0.08 },
      { name: 'eyeRight', ratio: 0.08 },
      { name: 'eyebrowLeft', ratio: 0.03 },
      { name: 'eyebrowRight', ratio: 0.03 },
      { name: 'noseBridge', ratio: 0.06 },
      { name: 'noseTip', ratio: 0.07 },
      { name: 'cheekLeft', ratio: 0.09 },
      { name: 'cheekRight', ratio: 0.09 },
      { name: 'upperLip', ratio: 0.04 },
      { name: 'lowerLip', ratio: 0.04 },
      { name: 'jaw', ratio: 0.10 },
      { name: 'chin', ratio: 0.04 },
      { name: 'temple', ratio: 0.05 },
      { name: 'atmosphere', ratio: 0.08 },
    ];

    let particleIndex = 0;
    for (const { name, ratio } of regions) {
      const count = Math.floor(particleCount * ratio);
      for (let j = 0; j < count && particleIndex < particleCount; j++) {
        const i = particleIndex++;
        const i3 = i * 3;
        const { x, y, z, weight } = sampleFaceRegion(name, j / count);

        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;
        faceMask[i] = weight;

        // Store target positions for reformation
        targetPositions.current[i3] = x;
        targetPositions.current[i3 + 1] = y;
        targetPositions.current[i3 + 2] = z;

        // Assign colors with depth variation
        const colorIndex = Math.floor(Math.random() * palette.length);
        const color = palette[colorIndex];
        const depthFade = 0.6 + (1 - Math.abs(z)) * 0.4;
        colors[i3] = color.r * depthFade;
        colors[i3 + 1] = color.g * depthFade;
        colors[i3 + 2] = color.b * depthFade;

        // Particle sizes based on importance
        sizes[i] = (Math.random() * 0.08 + 0.06) * (1 + Math.abs(z) * 0.5) * weight;
      }
    }

    return { positions, colors, sizes, faceMask };
  }, [particleCount, expression, colorPalette]);

  // Animation
  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    timeRef.current += delta * flowSpeed;
    const time = timeRef.current;
    
    // Stronger dispersion and reformation cycle - particles really flow away
    const reformationCycle = (Math.sin(time * 0.12) + 1) * 0.5; // 0 to 1
    const dispersionAmount = Math.pow(1 - reformationCycle, 2.5) * 4.5;
    
    const breathe = Math.sin(time * breathingSpeed) * 0.08;
    const audioBoost = audioReactive ? audioLevelRef.current * 0.4 : 0;
    
    // Mouse influence
    const mouseInfluence = 0.3;
    const mouseX = mousePosition.current.x * mouseInfluence;
    const mouseY = mousePosition.current.y * mouseInfluence;

    const positionAttribute = pointsRef.current.geometry.attributes.position;
    const colorAttribute = pointsRef.current.geometry.attributes.color;
    const sizeAttribute = pointsRef.current.geometry.attributes.size;
    const positions = positionAttribute.array as Float32Array;
    const colors = colorAttribute.array as Float32Array;
    const sizes = sizeAttribute.array as Float32Array;
    const palette = colorPalettes[colorPalette];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const targetX = targetPositions.current[i3];
      const targetY = targetPositions.current[i3 + 1];
      const targetZ = targetPositions.current[i3 + 2];
      const weight = faceMask[i];

      // Curl noise for fluid motion
      const noiseScale = 0.4;
      const noiseTime = time * 0.25;
      
      const noise1 = noise3D(targetX * noiseScale, targetY * noiseScale, noiseTime);
      const noise2 = noise3D(targetX * noiseScale + 100, targetY * noiseScale + 100, noiseTime);
      const noise3Val = noise3D(targetX * noiseScale + 200, targetY * noiseScale + 200, noiseTime);

      // Curl noise vector field
      const curlX = (noise2 - noise3Val) * flowIntensity * 0.015;
      const curlY = (noise3Val - noise1) * flowIntensity * 0.015;
      const curlZ = (noise1 - noise2) * flowIntensity * 0.01;

      // Dispersion effect - particles drift away and return
      const disperseX = noise1 * dispersionAmount * (1 - weight * 0.7);
      const disperseY = noise2 * dispersionAmount * (1 - weight * 0.7);
      const disperseZ = noise3Val * dispersionAmount * 0.5;

      // Mouse reaction - particles lean toward/away
      const distToMouse = Math.sqrt(
        Math.pow(targetX - mouseX, 2) + Math.pow(targetY - mouseY, 2)
      );
      const mouseForce = Math.max(0, 1 - distToMouse * 0.5) * 0.3;
      const mouseDirectionX = (targetX - mouseX) * mouseForce;
      const mouseDirectionY = (targetY - mouseY) * mouseForce;

      // Breathing and audio reaction
      const scale = 1 + breathe * weight + audioBoost * weight;

      // Combine all forces
      positions[i3] = (targetX + disperseX + curlX + mouseDirectionX) * scale;
      positions[i3 + 1] = (targetY + disperseY + curlY + mouseDirectionY) * scale;
      positions[i3 + 2] = (targetZ + disperseZ + curlZ) * scale;

      // Dynamic color shifting with depth-based fade
      const z = positions[i3 + 2];
      const depthFade = THREE.MathUtils.clamp(0.3 + (1 - Math.abs(z) * 0.5), 0.2, 1.0);
      const colorShift = (time * 0.08 + i * 0.005) % 1;
      const colorIndex = Math.floor(colorShift * palette.length);
      const nextColorIndex = (colorIndex + 1) % palette.length;
      const lerpFactor = (colorShift * palette.length) % 1;
      
      const color1 = palette[colorIndex];
      const color2 = palette[nextColorIndex];
      
      colors[i3] = THREE.MathUtils.lerp(color1.r, color2.r, lerpFactor) * depthFade;
      colors[i3 + 1] = THREE.MathUtils.lerp(color1.g, color2.g, lerpFactor) * depthFade;
      colors[i3 + 2] = THREE.MathUtils.lerp(color1.b, color2.b, lerpFactor) * depthFade;

      // Bigger size variation with dispersion and depth
      const baseSize = 0.07 + Math.random() * 0.05;
      const depthSizeBoost = 1 + Math.abs(z) * 0.6;
      const dispersionSizeBoost = 1 + dispersionAmount * 0.3 * (1 - weight);
      sizes[i] = baseSize * depthSizeBoost * dispersionSizeBoost * (1 + audioBoost * 0.5);
    }

    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
    sizeAttribute.needsUpdate = true;

    // Slow camera orbit for depth perception
    const orbitRadius = 4.5;
    const orbitSpeed = time * 0.08;
    camera.position.x = Math.sin(orbitSpeed) * orbitRadius * 0.3;
    camera.position.y = Math.sin(orbitSpeed * 0.5) * 0.4;
    camera.position.z = orbitRadius + Math.cos(orbitSpeed) * 0.8;
    camera.lookAt(0, 0, 0);

    // Subtle rotation based on mouse
    pointsRef.current.rotation.y = mouseX * 0.2;
    pointsRef.current.rotation.x = -mouseY * 0.15;
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
          varying float vDepth;
          
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vDepth = -mvPosition.z;
            gl_PointSize = size * 400.0 / vDepth;
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform float ditherIntensity;
          uniform float time;
          varying vec3 vColor;
          varying float vDepth;
          
          // Dither pattern
          float dither8x8(vec2 position, float brightness) {
            int x = int(mod(position.x, 8.0));
            int y = int(mod(position.y, 8.0));
            int index = x + y * 8;
            float limit = 0.0;
            
            if (index == 0) limit = 1.0 / 65.0;
            if (index == 1) limit = 49.0 / 65.0;
            if (index == 2) limit = 13.0 / 65.0;
            if (index == 3) limit = 61.0 / 65.0;
            if (index == 4) limit = 4.0 / 65.0;
            if (index == 5) limit = 52.0 / 65.0;
            if (index == 6) limit = 16.0 / 65.0;
            if (index == 7) limit = 64.0 / 65.0;
            
            return brightness < limit ? 0.0 : 1.0;
          }
          
          void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            
            // Sharper particle edges - tighter falloff
            float alpha = 1.0 - smoothstep(0.0, 0.45, dist);
            alpha = pow(alpha, 2.5); // Sharper edge
            
            // Depth-based fade
            float depthFade = clamp(1.0 - vDepth * 0.12, 0.4, 1.0);
            alpha *= depthFade;
            
            // Sharper core with defined edge
            float core = 1.0 - smoothstep(0.0, 0.3, dist);
            core = pow(core, 3.0);
            
            // Crisp bloom
            float bloom = exp(-dist * 8.0) * 0.6;
            vec3 finalColor = vColor * (1.0 + bloom + core * 0.5);
            
            // Apply dither effect
            if (ditherIntensity > 0.0) {
              vec2 pixelPos = gl_FragCoord.xy * (1.0 + ditherIntensity * 3.0);
              float brightness = (finalColor.r + finalColor.g + finalColor.b) / 3.0;
              float ditherValue = dither8x8(pixelPos, brightness);
              finalColor *= mix(1.0, ditherValue * 1.5, ditherIntensity);
            }
            
            // Discard very faint pixels for sharper edges
            if (alpha < 0.05) discard;
            
            // Final crisp output
            gl_FragColor = vec4(finalColor, alpha * 0.95);
          }
        `}
        uniforms={{
          ditherIntensity: { 
            value: ditherStyle === 'pixelated' ? 0.6 : ditherStyle === 'halftone' ? 0.4 : 0.0 
          },
          time: { value: 0 }
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function ParticleFaceCanvas(props: ParticleFaceCanvasProps) {
  return (
    <div className="w-full h-[500px] bg-gradient-to-b from-background via-background/95 to-background rounded-lg overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 65 }}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
      >
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 3, 10]} />
        <ambientLight intensity={0.05} />
        <pointLight position={[0, 0, 2]} intensity={0.3} color="#00d9ff" />
        <ParticleSystem {...props} />
      </Canvas>
    </div>
  );
}
