import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useIncompleteMemories } from '@/hooks/useIncompleteMemories';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, CheckCircle, Calendar, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function IncompleteMemoriesPanel() {
  const { memories, loading, deleteMemory, completeMemory, refresh } = useIncompleteMemories();
  const { toast } = useToast();
  const [editingMemory, setEditingMemory] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    memory_date: '',
    memory_location: '',
  });

  const handleEdit = (memory: any) => {
    setEditingMemory(memory.id);
    setEditForm({
      title: memory.title,
      memory_date: memory.memory_date || '',
      memory_location: memory.memory_location || '',
    });
  };

  const handleComplete = async () => {
    if (!editingMemory) return;

    try {
      await completeMemory(editingMemory, {
        title: editForm.title,
        memory_date: editForm.memory_date || undefined,
        memory_location: editForm.memory_location || undefined,
      });

      toast({
        title: 'Memory updated! ✅',
        description: editForm.memory_date && editForm.memory_location 
          ? 'Memory is now complete and will appear on your timeline'
          : 'Memory updated but still incomplete',
      });

      setEditingMemory(null);
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Could not update memory',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (memoryId: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

    try {
      await deleteMemory(memoryId);
      toast({
        title: 'Memory deleted',
        description: 'The incomplete memory has been removed',
      });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Could not delete memory',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Incomplete Memories</CardTitle>
          <CardDescription>Auto-saved memories that need date or location details</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Incomplete Memories</CardTitle>
              <CardDescription>
                Auto-saved memories that need date or location details
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {memories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No incomplete memories</p>
              <p className="text-sm mt-2">All your memories are complete! 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="border rounded-lg p-4 space-y-3 bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{memory.title}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {memory.source_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {memory.text.substring(0, 150)}...
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {memory.memory_date || 'No date'}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {memory.memory_location || 'No location'}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created: {format(new Date(memory.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(memory)}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(memory.id, memory.title)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingMemory} onOpenChange={(open) => !open && setEditingMemory(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Memory</DialogTitle>
            <DialogDescription>
              Add date and location to make this memory appear on your timeline
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Memory title"
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={editForm.memory_date}
                onChange={(e) => setEditForm({ ...editForm, memory_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={editForm.memory_location}
                onChange={(e) => setEditForm({ ...editForm, memory_location: e.target.value })}
                placeholder="City, Country"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingMemory(null)}>
                Cancel
              </Button>
              <Button onClick={handleComplete}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
