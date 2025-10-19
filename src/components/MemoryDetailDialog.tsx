import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, MapPin, Upload, X, FileAudio, FileVideo, Image as ImageIcon, Edit2, Save, Trash2, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { TagsInput } from '@/components/TagsInput';
import { getSignedUrl } from '@/lib/storage';

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
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Signed URLs for memory images and artifacts
  const [memoryImageUrls, setMemoryImageUrls] = useState<(string | null)[]>([]);
  const [loadingMemoryImages, setLoadingMemoryImages] = useState(true);
  const [artifactUrls, setArtifactUrls] = useState<Record<string, string | null>>({});
  
  // Editable fields
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Voice recording and audio playback state
  const [voiceRecordings, setVoiceRecordings] = useState<any[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Load voice recordings for this memory
  const loadVoiceRecordings = async () => {
    if (!memory?.id) return;
    
    setLoadingRecordings(true);
    try {
      // Check both memory_id and memory_ids fields
      const { data: recordingsById, error: error1 } = await supabase
        .from('voice_recordings')
        .select('*')
        .eq('memory_id', memory.id);
        
      const { data: recordingsByIds, error: error2 } = await supabase
        .from('voice_recordings')
        .select('*')
        .contains('memory_ids', [memory.id]);

      if (error1 && error2) {
        console.error('Failed to load voice recordings:', error1, error2);
        return;
      }

      const allRecordings = [
        ...(recordingsById || []),
        ...(recordingsByIds || [])
      ];

      // Remove duplicates based on ID
      const uniqueRecordings = allRecordings.filter((recording, index, self) =>
        index === self.findIndex((r) => r.id === recording.id)
      );

      setVoiceRecordings(uniqueRecordings);
      console.log('🎤 Loaded voice recordings for memory:', uniqueRecordings);
    } catch (error) {
      console.error('Failed to load voice recordings:', error);
    } finally {
      setLoadingRecordings(false);
    }
  };

  // Load artifacts and their signed URLs when dialog opens
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

      // Fetch signed URLs for all artifacts
      const urlsMap: Record<string, string | null> = {};
      for (const artifact of loadedArtifacts) {
        const url = await getSignedUrl('memory-images', artifact.storage_path, 3600);
        urlsMap[artifact.id] = url;
      }
      setArtifactUrls(urlsMap);
    } catch (error) {
      console.error('Failed to load artifacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load signed URLs for memory images
  useEffect(() => {
    async function fetchMemoryImageUrls() {
      if (!memory.image_urls || memory.image_urls.length === 0) {
        setMemoryImageUrls([]);
        setLoadingMemoryImages(false);
        return;
      }

      setLoadingMemoryImages(true);
      const urls: (string | null)[] = [];
      for (const imagePath of memory.image_urls) {
        const url = await getSignedUrl('memory-images', imagePath, 3600);
        urls.push(url);
      }
      setMemoryImageUrls(urls);
      setLoadingMemoryImages(false);
    }

    fetchMemoryImageUrls();
  }, [memory.image_urls]);

  // Initialize edit fields when memory changes
  useEffect(() => {
    if (memory) {
      setEditTitle(memory.title || '');
      setEditText(memory.text || '');
      setEditDate(memory.memory_date || '');
      setEditLocation(memory.memory_location || '');
      setEditTags(memory.tags || []);
      setIsEditing(false);
    }
  }, [memory]);

  // Load artifacts and voice recordings when dialog opens
  useEffect(() => {
    if (open && memory?.id) {
      loadArtifacts();
      loadVoiceRecordings();
    }
  }, [open, memory?.id]);

  // Keyboard shortcut for saving (Ctrl/Cmd + S)
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isEditing && (event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      handleSaveEdit();
    }
  }, [isEditing]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

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

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editText.trim()) {
      toast({
        title: 'Validation error',
        description: 'Title and memory text are required',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('memories')
        .update({
          title: editTitle.trim(),
          text: editText.trim(),
          memory_date: editDate || null,
          memory_location: editLocation.trim() || null,
          tags: editTags.length > 0 ? editTags : null,
        })
        .eq('id', memory.id);

      if (error) throw error;

      toast({
        title: 'Memory updated',
        description: 'Your changes have been saved',
      });

      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteArtifact = async (artifactId: string) => {
    if (!confirm('Delete this file? This cannot be undone.')) return;

    try {
      // Get artifact details
      const artifact = artifacts.find(a => a.id === artifactId);
      if (!artifact) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('memory-images')
        .remove([artifact.storage_path]);

      if (storageError) throw storageError;

      // Delete artifact record (memory_artifacts will cascade)
      const { error: deleteError } = await supabase
        .from('artifacts')
        .delete()
        .eq('id', artifactId);

      if (deleteError) throw deleteError;

      setArtifacts(prev => prev.filter(a => a.id !== artifactId));

      toast({
        title: 'File deleted',
        description: 'The file has been removed from this memory',
      });

      onUpdate?.();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMemory = async () => {
    if (!memory?.id || !confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      // Delete the memory (cascading deletes will handle artifacts and chunks)
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('id', memory.id);

      if (error) throw error;

      toast({
        title: 'Memory deleted',
        description: 'The memory has been permanently removed',
      });

      onUpdate?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Delete memory error:', error);
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete memory',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Audio playback functions
  const playAudio = async (audioPath: string, recordingId: string) => {
    try {
      // Stop any currently playing audio
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }

      // Get signed URL for the audio file
      const { data: urlData } = await supabase.storage
        .from('voice-recordings')
        .createSignedUrl(audioPath, 3600);

      if (!urlData?.signedUrl) {
        throw new Error('Failed to get audio URL');
      }

      // Create new audio element
      const audio = new Audio(urlData.signedUrl);
      audio.onended = () => {
        setPlayingAudio(null);
        setAudioElement(null);
      };
      
      audio.onerror = () => {
        toast({
          title: 'Audio Error',
          description: 'Failed to play audio recording',
          variant: 'destructive'
        });
        setPlayingAudio(null);
        setAudioElement(null);
      };

      await audio.play();
      setPlayingAudio(recordingId);
      setAudioElement(audio);

      toast({
        title: 'Playing Audio',
        description: 'Voice recording is now playing',
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      toast({
        title: 'Playback Error', 
        description: 'Unable to play audio recording',
        variant: 'destructive'
      });
    }
  };

  const stopAudio = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    setPlayingAudio(null);
    setAudioElement(null);
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
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">
              {isEditing ? 'Edit Memory' : memory.title}
            </DialogTitle>
            {!isEditing && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2 border-2 border-primary/40 text-primary hover:border-primary hover:bg-primary/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Memory
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteMemory}
                  disabled={isDeleting}
                  className="gap-2 border-2 border-red-200 text-red-600 hover:border-red-500 hover:bg-red-50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            )}
            {isEditing && (
              <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 px-3 py-2 rounded-md border border-blue-200 dark:border-blue-800">
                💡 <strong>Editing mode:</strong> Make your changes below and click "Save Memory" when finished.
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isEditing ? (
            /* Edit Mode */
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Memory title"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Memory *</label>
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Describe your memory..."
                  rows={6}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Where did this happen?"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <TagsInput
                  tags={editTags}
                  onTagsChange={setEditTags}
                  placeholder="family, travel, milestone..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border/50">
                <Button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none gap-2 bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-primary hover:border-primary/80 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg font-medium"
                  size="lg"
                >
                  <Save className="w-5 h-5" />
                  {isSaving ? 'Saving Changes...' : 'Save Memory'}
                </Button>
                <div className="hidden sm:block text-xs text-muted-foreground ml-2">
                  Ctrl/Cmd + S
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle(memory.title || '');
                    setEditText(memory.text || '');
                    setEditDate(memory.memory_date || '');
                    setEditLocation(memory.memory_location || '');
                    setEditTags(memory.tags || []);
                  }}
                  disabled={isSaving}
                  className="border-2 border-muted-foreground/30 hover:border-muted-foreground hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            /* View Mode */
            <>
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
            </>
          )}

          {/* Voice Recordings Section */}
          {voiceRecordings.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <FileAudio className="w-4 h-4" />
                Voice Recordings ({voiceRecordings.length})
              </h3>
              <div className="space-y-2">
                {voiceRecordings.map((recording) => (
                  <div key={recording.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => playingAudio === recording.id ? stopAudio() : playAudio(recording.audio_path, recording.id)}
                      className="flex-shrink-0"
                    >
                      {playingAudio === recording.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        Recording from {new Date(recording.created_at).toLocaleString()}
                      </div>
                      {recording.duration_ms && (
                        <div className="text-xs text-muted-foreground">
                          Duration: {Math.round(recording.duration_ms / 1000)}s
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing Images */}
          {memory.image_urls && memory.image_urls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {!loadingMemoryImages && memoryImageUrls.map((signedUrl, idx) => {
                if (!signedUrl) return null;
                
                return (
                  <div key={idx} className="relative group aspect-square">
                    <img
                      src={signedUrl}
                      alt={`Memory image ${idx + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Attachments Section */}
          <div className="border-t pt-4">
            {/* Single Upload Button with Better Styling */}
            <div className="mb-4">
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
                size="default"
                onClick={() => document.getElementById('artifact-upload')?.click()}
                disabled={uploading}
                className="w-full sm:w-auto border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Add Attachments'}
              </Button>
            </div>

            {/* Artifacts List */}
            {artifacts.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {artifacts.map((artifact) => {
                  const signedUrl = artifactUrls[artifact.id];
                  if (!signedUrl) return null;

                  if (artifact.artifact_type === 'image') {
                    return (
                      <div
                        key={artifact.id}
                        className="relative aspect-square group"
                      >
                        <img
                          src={signedUrl}
                          alt={artifact.file_name}
                          className="w-full h-full object-cover rounded-lg cursor-pointer transition-transform group-hover:scale-105"
                          onClick={() => setEnlargedImage(signedUrl)}
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteArtifact(artifact.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  }

                  // Handle audio artifacts with playback
                  if (artifact.artifact_type === 'audio') {
                    return (
                      <div
                        key={artifact.id}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => playingAudio === `artifact-${artifact.id}` ? stopAudio() : playAudio(artifact.storage_path, `artifact-${artifact.id}`)}
                          className="flex-shrink-0"
                        >
                          {playingAudio === `artifact-${artifact.id}` ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm block truncate">{artifact.file_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(artifact.file_size / 1024).toFixed(1)} KB • Audio File
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                          onClick={() => handleDeleteArtifact(artifact.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  }

                  // Handle other artifact types
                  return (
                    <div
                      key={artifact.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group"
                    >
                      {getArtifactIcon(artifact.artifact_type)}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm block truncate">{artifact.file_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(artifact.file_size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        onClick={() => handleDeleteArtifact(artifact.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
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

      {/* Image Enlargement Dialog */}
      <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="relative">
            <img
              src={enlargedImage || ''}
              alt="Enlarged view"
              className="w-full h-auto"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setEnlargedImage(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
