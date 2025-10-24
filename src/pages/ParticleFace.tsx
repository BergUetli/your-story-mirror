import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ParticleFaceCanvas } from '@/components/ParticleFaceCanvas';

const ParticleFace = () => {
  const [particleCount, setParticleCount] = useState(3000);
  const [flowSpeed, setFlowSpeed] = useState(1);
  const [expression, setExpression] = useState<'neutral' | 'happy' | 'sad' | 'thinking' | 'speaking'>('neutral');
  const [ditherStyle, setDitherStyle] = useState<'none' | 'bayer' | 'halftone' | 'noise'>('halftone');
  const [holographicIntensity, setHolographicIntensity] = useState(0.7);
  const [audioReactive, setAudioReactive] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Solin's Particle Face
          </h1>
          <p className="text-muted-foreground">
            Experimental generative art interface - adjust parameters in real-time
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Canvas */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-black/40 border-primary/20 backdrop-blur-sm">
              <ParticleFaceCanvas
                particleCount={particleCount}
                flowSpeed={flowSpeed}
                expression={expression}
                ditherStyle={ditherStyle}
                holographicIntensity={holographicIntensity}
                audioReactive={audioReactive}
              />
            </Card>
          </div>

          {/* Controls Panel */}
          <div className="space-y-4">
            <Card className="p-6 bg-card/80 backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4">Visual Controls</h2>
              
              <div className="space-y-6">
                {/* Particle Count */}
                <div className="space-y-2">
                  <Label>Particle Count: {particleCount}</Label>
                  <Slider
                    value={[particleCount]}
                    onValueChange={(val) => setParticleCount(val[0])}
                    min={500}
                    max={5000}
                    step={100}
                  />
                </div>

                {/* Flow Speed */}
                <div className="space-y-2">
                  <Label>Flow Speed: {flowSpeed.toFixed(1)}x</Label>
                  <Slider
                    value={[flowSpeed]}
                    onValueChange={(val) => setFlowSpeed(val[0])}
                    min={0.1}
                    max={3}
                    step={0.1}
                  />
                </div>

                {/* Holographic Intensity */}
                <div className="space-y-2">
                  <Label>Holographic Intensity: {(holographicIntensity * 100).toFixed(0)}%</Label>
                  <Slider
                    value={[holographicIntensity]}
                    onValueChange={(val) => setHolographicIntensity(val[0])}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </div>

                {/* Dither Style */}
                <div className="space-y-2">
                  <Label>Dithering Pattern</Label>
                  <Select value={ditherStyle} onValueChange={(val: any) => setDitherStyle(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="bayer">Bayer Matrix</SelectItem>
                      <SelectItem value="halftone">Halftone Dots</SelectItem>
                      <SelectItem value="noise">Perlin Noise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Expression Control */}
                <div className="space-y-2">
                  <Label>Expression (Manual Override)</Label>
                  <Select value={expression} onValueChange={(val: any) => setExpression(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="happy">Happy</SelectItem>
                      <SelectItem value="sad">Sad</SelectItem>
                      <SelectItem value="thinking">Thinking</SelectItem>
                      <SelectItem value="speaking">Speaking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Audio Reactive Toggle */}
                <div className="flex items-center justify-between">
                  <Label>Audio Reactive</Label>
                  <Button
                    variant={audioReactive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAudioReactive(!audioReactive)}
                  >
                    {audioReactive ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Info Card */}
            <Card className="p-6 bg-card/80 backdrop-blur-sm">
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Current State</h3>
              <div className="space-y-1 text-sm">
                <p>Expression: <span className="text-primary font-medium">{expression}</span></p>
                <p>Particles: <span className="text-primary font-medium">{particleCount}</span></p>
                <p>Pattern: <span className="text-primary font-medium">{ditherStyle}</span></p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticleFace;
