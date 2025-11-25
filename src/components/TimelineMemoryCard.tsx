import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Music } from 'lucide-react';

interface TimelineMemoryCardProps {
  memory: any;
  artifact: any | null;
  onClick: () => void;
  isMaterializing?: boolean;
  hasVoiceRecording?: boolean;
  memoryImageUrl?: string | null; // Signed URL for memory's image_urls
}

export const TimelineMemoryCard: React.FC<TimelineMemoryCardProps> = ({ 
  memory, 
  artifact, 
  onClick, 
  isMaterializing,
  hasVoiceRecording = false,
  memoryImageUrl = null
}) => {
  // Use artifact signedUrl OR memory image URL (prefer artifact)
  const signedUrl = artifact?.signedUrl || memoryImageUrl || null;
  const hasImage = !!(artifact?.artifact_type === 'image' && artifact?.signedUrl) || !!memoryImageUrl;
  


  return (
    <Card
      id={`memory-${memory.id}`}
      data-testid="memory-item"
      className={`group cursor-pointer transition-all duration-300 ease-out hover:shadow-xl ${
        isMaterializing
          ? 'ring-2 ring-primary border-primary animate-pulse'
          : 'border-border/40 hover:border-primary/60 hover:-translate-y-1'
      }`}
      style={{
        boxShadow: isMaterializing 
          ? '0 8px 32px rgba(96, 165, 250, 0.25)' 
          : '0 2px 8px rgba(0, 0, 0, 0.04)',
        transform: isMaterializing ? 'scale(1.02)' : 'scale(1)',
        borderRadius: '12px'
      }}
      onClick={onClick}
    >
      <CardContent className="p-3 bg-gradient-to-br from-white to-gray-50/50">
        <div className="flex items-center gap-3">
          {/* Thumbnail with enhanced styling - shows artifact image OR memory image_urls */}
          {hasImage && signedUrl && (
            <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 ring-1 ring-black/5 group-hover:ring-primary/20 transition-all duration-300">
              <img
                src={signedUrl}
                alt=""
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 data-testid="memory-label" className="text-sm font-semibold text-gray-900 truncate flex-1 group-hover:text-primary transition-colors">
                {memory.title}
              </h3>
              
              {/* Media indicators - Enhanced with better visibility */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Voice recording indicator */}
                {hasVoiceRecording && (
                  <div className="w-5 h-5 rounded-md bg-purple-50 border border-purple-200 flex items-center justify-center group-hover:bg-purple-100 transition-colors" title="Voice recording">
                    <Music className="w-3 h-3 text-purple-600" />
                  </div>
                )}
                
                {/* Image indicator */}
                {(memory.image_urls?.length > 0 || artifact?.artifact_type === 'image') && (
                  <div className="w-5 h-5 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center group-hover:bg-blue-100 transition-colors" title="Has images">
                    <span className="text-xs text-blue-600">📷</span>
                  </div>
                )}
                
                {/* Audio file indicator */}
                {artifact?.artifact_type === 'audio' && (
                  <div className="w-5 h-5 rounded-md bg-green-50 border border-green-200 flex items-center justify-center group-hover:bg-green-100 transition-colors" title="Audio file">
                    <span className="text-xs text-green-600">🎵</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2 mt-1.5">
              <Calendar className="w-3 h-3 flex-shrink-0 opacity-60" />
              <span className="truncate font-medium">
                {new Date(memory.memory_date || memory.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
