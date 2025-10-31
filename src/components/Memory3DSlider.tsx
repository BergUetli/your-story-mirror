import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useMemoryImages } from '@/hooks/useMemoryImages';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import './Memory3DSlider.css';

interface Memory {
  id: string;
  title: string;
  date: string;
  text?: string;
  image_urls?: string[];
  onClick: () => void;
}

interface Memory3DSliderProps {
  memories: Memory[];
}

export function Memory3DSlider({ memories }: Memory3DSliderProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [rotateX, setRotateX] = useState(-15);
  const [rotateY, setRotateY] = useState(20);
  const [rotateZ, setRotateZ] = useState(0);
  const [cardRotateX, setCardRotateX] = useState(-15);
  const [cardRotateY, setCardRotateY] = useState(20);
  const [cardRotateZ, setCardRotateZ] = useState(0);

  // Get signed URLs for all memory images
  const allImageUrls = memories
    .map(m => m.image_urls?.[0])
    .filter((url): url is string => !!url);
  
  const { signedUrls, loading } = useMemoryImages(allImageUrls);

  if (memories.length === 0) return null;

  const handleMouseEnter = (memoryId: string) => {
    setHoveredCard(memoryId);
  };

  const handleMouseLeave = () => {
    setHoveredCard(null);
  };

  return (
    <div className="memory-slider-container">
      {showControls && (
        <div className="absolute top-2 right-2 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 z-50 min-w-[280px]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold">3D Controls</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowControls(false)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
          
          <div className="space-y-3 text-xs">
            <div>
              <Label className="text-xs">Container Rotate X: {rotateX}°</Label>
              <Slider value={[rotateX]} onValueChange={([v]) => setRotateX(v)} min={-180} max={180} step={1} />
            </div>
            <div>
              <Label className="text-xs">Container Rotate Y: {rotateY}°</Label>
              <Slider value={[rotateY]} onValueChange={([v]) => setRotateY(v)} min={-180} max={180} step={1} />
            </div>
            <div>
              <Label className="text-xs">Container Rotate Z: {rotateZ}°</Label>
              <Slider value={[rotateZ]} onValueChange={([v]) => setRotateZ(v)} min={-180} max={180} step={1} />
            </div>
            
            <div className="border-t border-border pt-3 mt-3">
              <div>
                <Label className="text-xs">Card Rotate X: {cardRotateX}°</Label>
                <Slider value={[cardRotateX]} onValueChange={([v]) => setCardRotateX(v)} min={-180} max={180} step={1} />
              </div>
              <div className="mt-2">
                <Label className="text-xs">Card Rotate Y: {cardRotateY}°</Label>
                <Slider value={[cardRotateY]} onValueChange={([v]) => setCardRotateY(v)} min={-180} max={180} step={1} />
              </div>
              <div className="mt-2">
                <Label className="text-xs">Card Rotate Z: {cardRotateZ}°</Label>
                <Slider value={[cardRotateZ]} onValueChange={([v]) => setCardRotateZ(v)} min={-180} max={180} step={1} />
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowControls(!showControls)}
        className="absolute top-2 left-2 z-50 h-7 px-2 text-xs"
      >
        3D Controls
      </Button>
      
      <div 
        className="memory-slider" 
        aria-label="3D memory slider"
        style={{
          transform: `translateY(-50%) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`
        }}
      >
        {memories.map((memory, index) => {
          // Find the signed URL for this memory's image
          const imageUrl = memory.image_urls?.[0];
          const signedUrl = imageUrl ? signedUrls[allImageUrls.indexOf(imageUrl)] : null;

          return (
            <div
              key={memory.id}
              className={cn('memory-card', hoveredCard === memory.id && 'memory-card-hover')}
              onMouseEnter={() => handleMouseEnter(memory.id)}
              onMouseLeave={handleMouseLeave}
              onClick={memory.onClick}
              style={{
                transform: hoveredCard === memory.id 
                  ? `rotateX(${cardRotateX}deg) rotateY(${cardRotateY}deg) rotateZ(${cardRotateZ}deg) translateY(-8px) translateZ(20px) scale(1.08)`
                  : `rotateX(${cardRotateX}deg) rotateY(${cardRotateY}deg) rotateZ(${cardRotateZ}deg)`
              }}
            >
              {signedUrl && !loading ? (
                <img 
                  src={signedUrl} 
                  alt={memory.title}
                  className="memory-card-image"
                />
              ) : (
                <div className="memory-card-content">
                  <h3 className="memory-card-title">
                    {memory.title}
                  </h3>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
