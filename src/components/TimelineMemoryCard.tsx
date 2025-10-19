import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Music } from 'lucide-react';
import { useArtifactImage } from '@/hooks/useArtifactImage';

interface TimelineMemoryCardProps {
  memory: any;
  artifact: any | null;
  onClick: () => void;
  isMaterializing?: boolean;
  hasVoiceRecording?: boolean;
}

export const TimelineMemoryCard: React.FC<TimelineMemoryCardProps> = ({ 
  memory, 
  artifact, 
  onClick, 
  isMaterializing,
  hasVoiceRecording = false
}) => {
  const { signedUrl } = useArtifactImage(artifact?.storage_path || null);
  


  return (
    <Card
      id={`memory-${memory.id}`}
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
        isMaterializing
          ? 'ring-2 ring-primary border-primary animate-pulse'
          : 'border-border hover:border-primary/50'
      }`}
      style={{
        boxShadow: isMaterializing 
          ? 'var(--shadow-elevated)' 
          : 'var(--shadow-soft)',
        transform: isMaterializing ? 'scale(1.02)' : 'scale(1)'
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
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-medium text-card-foreground truncate flex-1">
                {memory.title}
              </h3>
              
              {/* Media indicators - Made more visible */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Voice recording indicator */}
                {hasVoiceRecording && (
                  <div className="w-4 h-4 rounded-sm bg-purple-100 flex items-center justify-center" title="This memory has voice recording">
                    <Music className="w-3 h-3 text-purple-600" />
                  </div>
                )}
                
                {/* Image indicator */}
                {(memory.image_urls?.length > 0 || artifact?.artifact_type === 'image') && (
                  <div className="w-4 h-4 rounded-sm bg-blue-100 flex items-center justify-center" title="This memory has images">
                    <span className="text-[10px] text-blue-600 font-bold">📷</span>
                  </div>
                )}
                
                {/* Audio file indicator (different from voice recording) */}
                {artifact?.artifact_type === 'audio' && (
                  <div className="w-4 h-4 rounded-sm bg-green-100 flex items-center justify-center" title="This memory has audio files">
                    <span className="text-[10px] text-green-600 font-bold">🎵</span>
                  </div>
                )}
                

              </div>
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">
                {new Date(memory.memory_date || memory.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
              {hasVoiceRecording && (
                <span className="text-primary font-medium text-[9px]">
                  🎤
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
