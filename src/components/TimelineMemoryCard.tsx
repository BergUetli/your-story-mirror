import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { useArtifactImage } from '@/hooks/useArtifactImage';

interface TimelineMemoryCardProps {
  memory: any;
  artifact: any | null;
  onClick: () => void;
  isMaterializing?: boolean;
}

export const TimelineMemoryCard: React.FC<TimelineMemoryCardProps> = ({ 
  memory, 
  artifact, 
  onClick, 
  isMaterializing 
}) => {
  const { signedUrl } = useArtifactImage(artifact?.storage_path || null);

  return (
    <Card
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
        isMaterializing
          ? 'ring-2 ring-primary border-primary'
          : 'border-border hover:border-primary/50'
      }`}
      style={{
        boxShadow: isMaterializing 
          ? 'var(--shadow-elevated)' 
          : 'var(--shadow-soft)'
      }}
      onClick={onClick}
    >
      <CardContent className="p-2 bg-card">
        <div className="flex items-center gap-2">
          {/* Thumbnail */}
          {artifact?.artifact_type === 'image' && signedUrl && (
            <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-muted">
              <img
                src={signedUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium text-card-foreground truncate">
              {memory.title}
            </h3>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">
                {new Date(memory.memory_date || memory.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
