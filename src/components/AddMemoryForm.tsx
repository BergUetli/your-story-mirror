import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUpload } from '@/components/ImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export const AddMemoryForm: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    text: '',
    memory_date: '',
    memory_location: '',
    tags: '',
  });
  const [images, setImages] = useState<File[]>([]);

  const uploadImages = async (userId: string): Promise<string[]> => {
    const uploadPromises = images.map(async (file, index) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}_${index}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('memory-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      return fileName;
    });

    return await Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to add memories',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images first
      const imageUrls = images.length > 0 ? await uploadImages(user.id) : [];

      // Insert memory with image URLs
      const { error } = await supabase
        .from('memories')
        .insert([{
          user_id: user.id,
          title: formData.title,
          text: formData.text,
          memory_date: formData.memory_date || null,
          memory_location: formData.memory_location || null,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
          image_urls: imageUrls,
        }]);

      if (error) throw error;

      toast({
        title: 'Memory saved',
        description: 'Your memory has been added to your timeline',
      });

      // Reset form
      setFormData({
        title: '',
        text: '',
        memory_date: '',
        memory_location: '',
        tags: '',
      });
      setImages([]);

      // Navigate to timeline to see the new memory
      setTimeout(() => {
        navigate('/timeline');
      }, 500);
    } catch (error) {
      console.error('Error saving memory:', error);
      toast({
        title: 'Failed to save memory',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-light">Add New Memory</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-light text-foreground">
              Title *
            </label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Give your memory a title"
              className="font-light"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="text" className="text-sm font-light text-foreground">
              Memory *
            </label>
            <Textarea
              id="text"
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              required
              placeholder="Describe your memory in detail..."
              rows={6}
              className="font-light resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="memory_date" className="text-sm font-light text-foreground">
                Date
              </label>
              <Input
                id="memory_date"
                type="date"
                value={formData.memory_date}
                onChange={(e) => setFormData({ ...formData, memory_date: e.target.value })}
                className="font-light"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="memory_location" className="text-sm font-light text-foreground">
                Location
              </label>
              <Input
                id="memory_location"
                value={formData.memory_location}
                onChange={(e) => setFormData({ ...formData, memory_location: e.target.value })}
                placeholder="Where did this happen?"
                className="font-light"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="tags" className="text-sm font-light text-foreground">
              Tags
            </label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="family, travel, milestone (comma-separated)"
              className="font-light"
            />
          </div>

          <ImageUpload
            images={images}
            onImagesChange={setImages}
            maxImages={5}
          />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  title: '',
                  text: '',
                  memory_date: '',
                  memory_location: '',
                  tags: '',
                });
                setImages([]);
              }}
              disabled={isSubmitting}
              className="font-light"
            >
              Clear
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="font-light"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Memory'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
