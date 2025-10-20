/**
 * MEMORY ARCHIVE COMPONENT
 * 
 * Displays both complete and incomplete memories
 * - Complete memories: Have title, date, and location (appear on Timeline)
 * - Incomplete memories: Missing date/location or auto-saved (appear only in Archive)
 * - Allows users to complete incomplete memories
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Calendar,
  MapPin, 
  Edit,
  Search, 
  Filter,
  SortDesc,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Memory {
  id: string;
  title: string;
  text: string;
  memory_date: string | null;
  memory_location: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  chunk_sequence: number;
  is_primary_chunk: boolean;
  source_type: string | null;
}

interface MemoryArchiveProps {
  className?: string;
}

export const MemoryArchive: React.FC<MemoryArchiveProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'updated' | 'title'>('updated');
  
  // Load memories
  const loadMemories = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📚 Loading memories for archive...');
      
      const { data: memoryData, error: memoryError } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', user.id)
        .eq('chunk_sequence', 1) // Only get primary chunks to avoid duplicates
        .order('updated_at', { ascending: false });

      if (memoryError) {
        throw memoryError;
      }

      console.log(`✅ Loaded ${memoryData.length} memories`);
      setMemories(memoryData || []);
      
    } catch (error) {
      console.error('❌ Failed to load memories:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load memories';
      setError(errorMessage);
      toast({
        title: 'Memory Load Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort memories
  const filterMemories = () => {
    let filtered = memories;
    
    // Apply completion filter
    if (filter === 'complete') {
      filtered = memories.filter(memory => 
        memory.memory_date && 
        memory.memory_location && 
        memory.title && 
        memory.title !== 'Incomplete Conversation Memory'
      );
    } else if (filter === 'incomplete') {
      filtered = memories.filter(memory => 
        !memory.memory_date || 
        !memory.memory_location || 
        memory.title === 'Incomplete Conversation Memory' ||
        memory.tags?.includes('incomplete') ||
        memory.tags?.includes('auto-saved')
      );
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      filtered = filtered.filter(memory => {
        const searchText = [
          memory.title || '',
          memory.text || '',
          memory.memory_location || '',
          ...(memory.tags || [])
        ].join(' ').toLowerCase();
        
        return searchText.includes(queryLower);
      });
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title || 'Untitled').localeCompare(b.title || 'Untitled');
        case 'date':
          const dateA = new Date(a.memory_date || a.created_at).getTime();
          const dateB = new Date(b.memory_date || b.created_at).getTime();
          return dateB - dateA;
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
    
    setFilteredMemories(sorted);
  };

  // Effects
  useEffect(() => {
    loadMemories();
  }, [user?.id]);

  useEffect(() => {
    filterMemories();
  }, [searchQuery, memories, filter, sortBy]);

  // Helper functions
  const isIncompleteMemory = (memory: Memory) => {
    return !memory.memory_date || 
           !memory.memory_location || 
           memory.title === 'Incomplete Conversation Memory' ||
           memory.tags?.includes('incomplete') ||
           memory.tags?.includes('auto-saved');
  };

  const isAutoSavedMemory = (memory: Memory) => {
    return memory.tags?.includes('auto-saved') || 
           memory.source_type === 'conversation_auto_save';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate stats
  const completeMemories = memories.filter(m => !isIncompleteMemory(m));
  const incompleteMemories = memories.filter(m => isIncompleteMemory(m));
  const autoSavedMemories = memories.filter(m => isAutoSavedMemory(m));

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Memory Archive</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>{completeMemories.length} complete</span>
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <span>{incompleteMemories.length} incomplete</span>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories by title, content, location, or tags..."
            className="pl-10"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border rounded px-2 py-1 bg-background"
            >
              <option value="all">All Memories</option>
              <option value="complete">Complete Only</option>
              <option value="incomplete">Incomplete Only</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <SortDesc className="w-4 h-4 text-muted-foreground" />
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border rounded px-2 py-1 bg-background"
            >
              <option value="updated">Recently Updated</option>
              <option value="date">Memory Date</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 text-sm bg-muted/30 p-3 rounded-lg">
          <span className="font-medium">
            {filteredMemories.length} of {memories.length} memories
          </span>
          {autoSavedMemories.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3" />
              {autoSavedMemories.length} auto-saved
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="outline" className="gap-1">
              <Filter className="w-3 h-3" />
              Filtered
            </Badge>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading memories...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert className="border-red-500/20 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200">
            Failed to load memories: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* No Memories State */}
      {!isLoading && !error && memories.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Memories Found</h3>
          <p className="text-muted-foreground">
            Start conversations with Solin to create your first memories!
          </p>
        </div>
      )}

      {/* No Filtered Results */}
      {!isLoading && !error && memories.length > 0 && filteredMemories.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Matching Memories</h3>
          <p className="text-muted-foreground">
            No memories found matching your search and filter criteria.
          </p>
        </div>
      )}

      {/* Memories List */}
      {!isLoading && !error && filteredMemories.length > 0 && (
        <div className="space-y-3">
          {filteredMemories.map((memory) => {
            const isIncomplete = isIncompleteMemory(memory);
            const isAutoSaved = isAutoSavedMemory(memory);
            
            return (
              <Card 
                key={memory.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedMemory?.id === memory.id 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-primary/30'
                } ${isIncomplete ? 'border-l-4 border-l-yellow-500' : 'border-l-4 border-l-green-500'}`}
                onClick={() => setSelectedMemory(selectedMemory?.id === memory.id ? null : memory)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-sm">
                            {memory.title || 'Untitled Memory'}
                          </h3>
                          {isIncomplete && (
                            <Badge variant="secondary" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Incomplete
                            </Badge>
                          )}
                          {isAutoSaved && (
                            <Badge variant="outline" className="text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Auto-saved
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(memory.memory_date)}
                          </div>
                          {memory.memory_location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {memory.memory_location}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Updated {new Date(memory.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="sm">
                        {isIncomplete ? <Edit className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </Button>
                    </div>

                    {/* Preview Text */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {memory.text}
                    </p>

                    {/* Tags */}
                    {memory.tags && memory.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {memory.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Expanded Content */}
                    {selectedMemory?.id === memory.id && (
                      <div className="pt-3 border-t space-y-3">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Full Content:</h4>
                          <div className="text-sm bg-muted/50 p-3 rounded max-h-60 overflow-y-auto">
                            {memory.text.split('\n').map((line, idx) => (
                              <p key={idx} className="mb-1">{line}</p>
                            ))}
                          </div>
                        </div>
                        
                        {isIncomplete && (
                          <Alert className="border-yellow-500/20 bg-yellow-500/10">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription>
                              <strong>Complete this memory:</strong> Add a date and location to make it appear on your Timeline.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MemoryArchive;