import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
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
        {memories.map((memory) => (
          <div
            key={memory.id}
            className={cn('memory-card', hoveredCard === memory.id && 'memory-card-hover')}
            onMouseEnter={() => handleMouseEnter(memory.id)}
            onMouseLeave={handleMouseLeave}
            onClick={memory.onClick}
          >
            {memory.image_urls && memory.image_urls.length > 0 ? (
              <img 
                src={memory.image_urls[0]} 
                alt={memory.title}
                className="memory-card-image"
              />
            ) : (
              <div className="memory-card-content">
                <h3 className="memory-card-title">
                  {memory.title}
                </h3>
                <p className="memory-card-date">{memory.date}</p>
                {memory.text && (
                  <p className="memory-card-text">
                    {memory.text}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
