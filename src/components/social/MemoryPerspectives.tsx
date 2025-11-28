import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Plus, Save, X, Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MemoryPerspective } from '@/types/social';

interface PerspectiveWithAuthor extends MemoryPerspective {
  author_name?: string;
}

interface MemoryPerspectivesProps {
  memoryId: string;
  isSharedMemory?: boolean; // Whether this is a shared memory (not owned by user)
}

export const MemoryPerspectives = ({ memoryId, isSharedMemory = false }: MemoryPerspectivesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [perspectives, setPerspectives] = useState<PerspectiveWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');

  useEffect(() => {
    loadPerspectives();
  }, [memoryId]);

  const loadPerspectives = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('memory_perspectives')
        .select('*')
        .eq('memory_id', memoryId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch author names
      const userIds = [...new Set(data?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, preferred_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name || p.preferred_name]));

      const enriched = data?.map(p => ({
        ...p,
        author_name: profileMap.get(p.user_id) || 'Anonymous'
      })) || [];

      setPerspectives(enriched);
    } catch (error) {
      console.error('Error loading perspectives:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id || !newText.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('memory_perspectives')
        .insert({
          memory_id: memoryId,
          user_id: user.id,
          perspective_title: newTitle.trim() || null,
          perspective_text: newText.trim()
        });

      if (error) throw error;

      toast({
        title: 'Perspective added',
        description: 'Your perspective has been saved.'
      });

      setNewTitle('');
      setNewText('');
      setIsAdding(false);
      loadPerspectives();
    } catch (error) {
      console.error('Error saving perspective:', error);
      toast({
        title: 'Failed to save',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const userHasPerspective = perspectives.some(p => p.user_id === user?.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Perspectives ({perspectives.length})
        </h4>
        {isSharedMemory && !userHasPerspective && !isAdding && (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Your Perspective
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <Input
              placeholder="Title (optional)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Textarea
              placeholder="Share your perspective on this memory..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!newText.trim() || isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {perspectives.length === 0 && !isAdding ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No perspectives yet. {isSharedMemory ? 'Add yours!' : 'People you share this memory with can add their perspectives.'}
        </p>
      ) : (
        <div className="space-y-3">
          {perspectives.map((perspective) => (
            <Card key={perspective.id} className="bg-muted/30">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{perspective.author_name}</span>
                  {perspective.user_id === user?.id && (
                    <span className="text-xs text-muted-foreground">(You)</span>
                  )}
                </div>
                {perspective.perspective_title && (
                  <CardTitle className="text-base">{perspective.perspective_title}</CardTitle>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{perspective.perspective_text}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(perspective.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
