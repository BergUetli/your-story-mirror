import React, { useState } from 'react';
import { ParticleFaceCanvas } from '@/components/ParticleFaceCanvas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff } from 'lucide-react';

export default function ParticleFace() {
  const [particleCount, setParticleCount] = useState(3000);
  const [flowSpeed, setFlowSpeed] = useState(1);
  const [flowIntensity, setFlowIntensity] = useState(1);
  const [breathingSpeed, setBreathingSpeed] = useState(1);
  const [expression, setExpression] = useState<'neutral' | 'happy' | 'sad' | 'thinking' | 'speaking'>('neutral');
  const [colorPalette, setColorPalette] = useState<'tron' | 'spectral' | 'cyber' | 'aurora'>('tron');
  const [ditherStyle, setDitherStyle] = useState<'none' | 'pixelated' | 'halftone'>('none');
  const [audioReactive, setAudioReactive] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">Sci-Fi Particle Face</h1>
          <p className="text-gray-400">Interactive AI consciousness visualization</p>
        </div>

        {/* Canvas Display */}
        <Card className="bg-black/50 border-gray-800">
          <CardContent className="p-6">
            <ParticleFaceCanvas
              particleCount={particleCount}
              flowSpeed={flowSpeed}
              flowIntensity={flowIntensity}
              breathingSpeed={breathingSpeed}
              expression={expression}
              colorPalette={colorPalette}
              ditherStyle={ditherStyle}
              audioReactive={audioReactive}
            />
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Visual Controls */}
          <Card className="bg-black/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Visual Controls</CardTitle>
              <CardDescription className="text-gray-400">
                Adjust particle behavior and appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Particle Density */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-300">Particle Density</label>
                  <Badge variant="secondary" className="bg-gray-800 text-gray-300">{particleCount}</Badge>
                </div>
                <Slider
                  value={[particleCount]}
                  onValueChange={(value) => setParticleCount(value[0])}
                  min={500}
                  max={8000}
                  step={500}
                  className="w-full"
                />
              </div>

              {/* Flow Speed */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-300">Flow Speed</label>
                  <Badge variant="secondary" className="bg-gray-800 text-gray-300">{flowSpeed.toFixed(1)}x</Badge>
                </div>
                <Slider
                  value={[flowSpeed]}
                  onValueChange={(value) => setFlowSpeed(value[0])}
                  min={0.1}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Flow Intensity */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-300">Flow Intensity</label>
                  <Badge variant="secondary" className="bg-gray-800 text-gray-300">{flowIntensity.toFixed(1)}x</Badge>
                </div>
                <Slider
                  value={[flowIntensity]}
                  onValueChange={(value) => setFlowIntensity(value[0])}
                  min={0}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Breathing Speed */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-300">Breathing Speed</label>
                  <Badge variant="secondary" className="bg-gray-800 text-gray-300">{breathingSpeed.toFixed(1)}x</Badge>
                </div>
                <Slider
                  value={[breathingSpeed]}
                  onValueChange={(value) => setBreathingSpeed(value[0])}
                  min={0.1}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Color Palette */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Color Palette</label>
                <Select value={colorPalette} onValueChange={(value: any) => setColorPalette(value)}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="tron" className="text-gray-300">Tron (Cyan/Gold)</SelectItem>
                    <SelectItem value="spectral" className="text-gray-300">Spectral (Blue/Purple)</SelectItem>
                    <SelectItem value="cyber" className="text-gray-300">Cyberpunk (Neon Mix)</SelectItem>
                    <SelectItem value="aurora" className="text-gray-300">Aurora (Teal/Purple)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expression */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Expression</label>
                <Select value={expression} onValueChange={(value: any) => setExpression(value)}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="neutral" className="text-gray-300">Neutral</SelectItem>
                    <SelectItem value="happy" className="text-gray-300">Happy</SelectItem>
                    <SelectItem value="sad" className="text-gray-300">Sad</SelectItem>
                    <SelectItem value="thinking" className="text-gray-300">Thinking</SelectItem>
                    <SelectItem value="speaking" className="text-gray-300">Speaking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dither Style */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Dither Style</label>
                <Select value={ditherStyle} onValueChange={(value: any) => setDitherStyle(value)}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="none" className="text-gray-300">None (Smooth)</SelectItem>
                    <SelectItem value="pixelated" className="text-gray-300">Pixelated</SelectItem>
                    <SelectItem value="halftone" className="text-gray-300">Halftone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Audio Reactive */}
              <div className="pt-2">
                <Button
                  onClick={() => setAudioReactive(!audioReactive)}
                  className={`w-full ${audioReactive ? 'bg-primary' : 'bg-gray-800'} text-white`}
                  variant={audioReactive ? 'default' : 'outline'}
                >
                  {audioReactive ? <Mic className="mr-2 h-4 w-4" /> : <MicOff className="mr-2 h-4 w-4" />}
                  Audio Reactive: {audioReactive ? 'ON' : 'OFF'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Panel */}
          <Card className="bg-black/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Current Configuration</CardTitle>
              <CardDescription className="text-gray-400">
                Active settings and information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-gray-300">
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-sm">Expression</span>
                  <Badge className="bg-primary/20 text-primary border-primary/30 capitalize">{expression}</Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-sm">Particles</span>
                  <span className="text-sm font-mono">{particleCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-sm">Color Palette</span>
                  <Badge variant="outline" className="border-gray-700 text-gray-300 capitalize">{colorPalette}</Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-sm">Dither Style</span>
                  <Badge variant="outline" className="border-gray-700 text-gray-300 capitalize">{ditherStyle}</Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-sm">Audio Reactive</span>
                  <Badge className={audioReactive ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}>
                    {audioReactive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                <h4 className="text-sm font-semibold text-white mb-2">About</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  This particle system uses Three.js with simplex noise to create fluid, organic motion. 
                  Particles flow using curl noise forces, creating ethereal patterns reminiscent of digital consciousness. 
                  The breathing effect adds life-like pulsing, while color gradients shift smoothly through sci-fi palettes 
                  inspired by Tron: Legacy and Spectral.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
