import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Save, Trash2, Edit } from 'lucide-react';
import databaseMemoryService, { DatabaseMemory, CreateMemoryData } from '@/services/databaseMemoryService';
import { useAuth } from '@/contexts/AuthContext';

const Journal = () => {
  const [memories, setMemories] = useState<DatabaseMemory[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Form state
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [recipient, setRecipient] = useState<string>('private');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const userMemories = await databaseMemoryService.getUserMemories();
      setMemories(userMemories);
    } catch (error) {
      console.error('Failed to load memories:', error);
      toast({
        title: "Error",
        description: "Failed to load memories. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setText('');
    setRecipient('private');
    setTags([]);
    setTagInput('');
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!title.trim() || !text.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and content for your memory.",
        variant: "destructive",
      });
      return;
    }

    const memoryData: CreateMemoryData = {
      title: title.trim(),
      text: text.trim(),
      tags,
      recipient
    };

    try {
      const savedMemory = await databaseMemoryService.saveMemory(memoryData);
      if (savedMemory) {
        await loadMemories(); // Refresh the list
        resetForm();
        toast({
          title: "Memory Saved",
          description: "Your memory has been successfully saved.",
        });
      }
    } catch (error) {
      console.error('Failed to save memory:', error);
      toast({
        title: "Error",
        description: "Failed to save memory. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (memory: DatabaseMemory) => {
    setTitle(memory.title);
    setText(memory.text);
    setRecipient(memory.recipient);
    setTags(memory.tags);
    setEditingId(memory.id);
    setIsCreating(true);
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Please log in to access your journal.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Life Journal</h1>
        <p className="text-muted-foreground">
          Capture and preserve your precious memories for yourself and future generations.
        </p>
      </div>

      {/* Create/Edit Memory Form */}
      {isCreating && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Memory' : 'New Memory'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Memory title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            
            <Textarea
              placeholder="Tell your story..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
            />

            <div className="flex flex-col space-y-2">
              <div className="flex space-x-2">
                <Input
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  className="flex-1"
                />
                <Button onClick={addTag} variant="outline" size="sm">
                  Add Tag
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>

            <Select value={recipient} onValueChange={setRecipient}>
              <SelectTrigger>
                <SelectValue placeholder="Who can see this memory?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private (Only me)</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="close_friends">Close Friends</SelectItem>
                <SelectItem value="friends">Friends</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex space-x-2">
              <Button onClick={handleSave} className="flex items-center space-x-2">
                <Save className="w-4 h-4" />
                <span>{editingId ? 'Update' : 'Save'} Memory</span>
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Bar */}
      {!isCreating && (
        <div className="flex justify-between items-center mb-6">
          <Button 
            onClick={() => setIsCreating(true)} 
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Memory</span>
          </Button>
          
          <div className="text-sm text-muted-foreground">
            {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
          </div>
        </div>
      )}

      {/* Memories List */}
      {isLoading ? (
        <div className="text-center py-8">Loading your memories...</div>
      ) : memories.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">No memories yet</h3>
            <p className="text-muted-foreground mb-4">
              Start capturing your life's precious moments today.
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Memory
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {memories.map((memory) => (
            <Card key={memory.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{memory.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(memory.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(memory)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3 whitespace-pre-wrap">{memory.text}</p>
                
                <div className="flex flex-wrap gap-2 mb-2">
                  {memory.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Visible to: {memory.recipient}</span>
                  <span>
                    Updated: {new Date(memory.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Journal;