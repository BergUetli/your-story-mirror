import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MemoryMediaUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  memoryId: string;
  memoryTitle: string;
}

export const MemoryMediaUploadDialog: React.FC<MemoryMediaUploadDialogProps> = ({
  isOpen,
  onClose,
  memoryId,
  memoryTitle
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validate file types (images and videos only)
    const validFiles = selectedFiles.filter(file => {
      const isValid = file.type.startsWith('image/') || file.type.startsWith('video/');
      if (!isValid) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} must be an image or video`,
          variant: 'destructive',
        });
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({
          title: 'File too large',
          description: `${file.name} is larger than 50MB`,
          variant: 'destructive',
        });
        return false;
      }
      return isValid;
    });

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);

      // Generate previews
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      onClose();
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const file of files) {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('memory-images')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Create artifact record
        const { data: artifactData, error: artifactError } = await supabase
          .from('artifacts')
          .insert({
            artifact_type: file.type.startsWith('image/') ? 'image' : 'video',
            storage_path: uploadData.path,
            mime_type: file.type,
            file_name: file.name,
            file_size: file.size
          })
          .select('id')
          .single();

        if (artifactError) throw artifactError;

        // Link to memory
        const { error: linkError } = await supabase
          .from('memory_artifacts')
          .insert({
            memory_id: memoryId,
            artifact_id: artifactData.id
          });

        if (linkError) throw linkError;
      }

      toast({
        title: 'Media uploaded! 📸',
        description: `${files.length} file(s) added to your memory`,
      });

      onClose();
    } catch (error) {
      console.error('Error uploading media:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not upload your media. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-card/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">Add Photos or Videos 📸</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Do you have any pictures or videos of "{memoryTitle}"?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            Choose Files
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  {files[index].type.startsWith('video/') ? (
                    <video
                      src={preview}
                      className="w-full h-24 object-cover rounded border border-border"
                    />
                  ) : (
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded border border-border"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                    className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-3 justify-end">
            <Button 
              variant="ghost" 
              onClick={onClose}
              disabled={isUploading}
              className="text-muted-foreground hover:text-foreground"
            >
              {files.length > 0 ? 'Skip' : 'No, thanks'}
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={isUploading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : files.length > 0 ? (
                `Upload ${files.length} file(s)`
              ) : (
                'Done'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
