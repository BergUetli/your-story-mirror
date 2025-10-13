import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Upload, X, FileAudio, FileVideo, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface MemoryDetailDialogProps {
  memory: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export const MemoryDetailDialog = ({ memory, open, onOpenChange, onUpdate }: MemoryDetailDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const userIdFolder = user?.id || '00000000-0000-0000-0000-000000000000';
  const [uploading, setUploading] = useState(false);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load artifacts when dialog opens
  const loadArtifacts = async () => {
    if (!memory?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('memory_artifacts')
        .select(`
          artifact_id,
          artifacts (
            id,
            file_name,
            artifact_type,
            storage_path,
            file_size,
            mime_type
          )
        `)
        .eq('memory_id', memory.id);

      if (error) throw error;

      const loadedArtifacts = data?.map(ma => ma.artifacts).filter(Boolean) || [];
      setArtifacts(loadedArtifacts);
    } catch (error) {
      console.error('Failed to load artifacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load artifacts when dialog opens
  if (open && memory?.id && artifacts.length === 0 && !loading) {
    loadArtifacts();
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Determine artifact type
        let artifactType = 'other';
        if (file.type.startsWith('image/')) artifactType = 'image';
        else if (file.type.startsWith('audio/')) artifactType = 'audio';
        else if (file.type.startsWith('video/')) artifactType = 'video';

        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${userIdFolder}/${memory.id}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('memory-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Create artifact record
        const { data: artifactData, error: artifactError } = await supabase
          .from('artifacts')
          .insert({
            file_name: file.name,
            artifact_type: artifactType,
            storage_path: uploadData.path,
            file_size: file.size,
            mime_type: file.type,
          })
          .select()
          .single();

        if (artifactError) throw artifactError;

        // Link artifact to memory
        const { error: linkError } = await supabase
          .from('memory_artifacts')
          .insert({
            memory_id: memory.id,
            artifact_id: artifactData.id,
          });

        if (linkError) throw linkError;

        setArtifacts(prev => [...prev, artifactData]);
      }

      toast({
        title: 'Files uploaded',
        description: `${files.length} file(s) added to this memory.`,
      });

      onUpdate?.();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'audio': return <FileAudio className="w-4 h-4" />;
      case 'video': return <FileVideo className="w-4 h-4" />;
      default: return <Upload className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{memory.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Date & Location */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(memory.memory_date || memory.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
            {memory.memory_location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {memory.memory_location}
              </div>
            )}
          </div>

          {/* Memory Text */}
          <div className="prose prose-sm max-w-none">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{memory.text}</p>
          </div>

          {/* Tags */}
          {memory.tags && memory.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {memory.tags.map((tag: string, idx: number) => (
                <span key={idx} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Existing Images */}
          {memory.image_urls && memory.image_urls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {memory.image_urls.map((url: string, idx: number) => {
                const publicUrl = supabase.storage
                  .from('memory-images')
                  .getPublicUrl(url).data.publicUrl;
                
                return (
                  <div key={idx} className="relative group aspect-square">
                    <img
                      src={publicUrl}
                      alt={`Memory image ${idx + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Artifacts Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Attachments
            </h3>
            
            {/* Upload Button */}
            <div className="mb-3">
              <input
                type="file"
                id="artifact-upload"
                multiple
                accept="image/*,audio/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('artifact-upload')?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Add Files'}
              </Button>
            </div>

            {/* Artifacts List */}
            {artifacts.length > 0 && (
              <div className="space-y-2">
                {artifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                  >
                    {getArtifactIcon(artifact.artifact_type)}
                    <span className="text-sm flex-1 truncate">{artifact.file_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(artifact.file_size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conversation */}
          {memory.conversation_text && (
            <details className="border-t pt-4">
              <summary className="text-sm font-medium cursor-pointer hover:text-primary">
                View conversation with Solin
              </summary>
              <div className="mt-3 p-4 bg-muted/50 rounded-lg text-sm whitespace-pre-line">
                {memory.conversation_text}
              </div>
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
