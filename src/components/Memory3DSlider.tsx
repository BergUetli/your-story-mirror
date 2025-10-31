import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useMemoryImages } from '@/hooks/useMemoryImages';
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
      <div className="memory-slider" aria-label="3D memory slider">
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
