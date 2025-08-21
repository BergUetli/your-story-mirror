import { useState, useEffect } from 'react';
import { memoryService, type MemoryWithConversation } from '@/services/memoryService';
import type { Memory } from '@/services/solonService';

// Mock memories for fallback
const mockMemories: MemoryWithConversation[] = [
  {
    id: '1',
    title: 'First Day at New Job',
    content: 'I remember walking into that office, nervous but excited. The smell of fresh coffee and the sound of keyboards clicking. It was the beginning of something wonderful.',
    date: '2023-08-15',
    recipient: 'public'
  },
  {
    id: '2', 
    title: 'Mom\'s Secret Recipe',
    content: 'She never wrote it down, just showed me with her hands. "A pinch of this, a dash of that," she\'d say. Now I cook it for my own family, carrying her love forward.',
    date: '2023-09-02',
    recipient: 'family'
  },
  {
    id: '3',
    title: 'Late Night Conversations',
    content: 'Those 3 AM talks when the world was quiet and we shared our deepest thoughts. Sometimes the most profound connections happen in whispered voices.',
    date: '2023-10-18',
    recipient: 'close_friends'
  },
  {
    id: '4',
    title: 'Childhood Summer Days',
    content: 'Running barefoot through the sprinklers, ice cream melting faster than we could eat it. Those endless summer afternoons when time stood still and everything felt possible.',
    date: '2023-07-22',
    recipient: 'public'
  },
  {
    id: '5',
    title: 'The Day Everything Changed',
    content: 'It wasn\'t the big moments that mattered most, but the quiet realization that I had become someone I was proud of. Growth happens in whispers, not shouts.',
    date: '2023-11-05',
    recipient: 'family'
  }
];

export const useMemories = () => {
  const [memories, setMemories] = useState<MemoryWithConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const data = await memoryService.getMemories();
      if (data.length === 0) {
        // If no memories in database, use mock data for demo
        setMemories(mockMemories);
      } else {
        setMemories(data);
      }
    } catch (error) {
      console.error('Error loading memories:', error);
      setMemories(mockMemories);
    } finally {
      setIsLoading(false);
    }
  };

  const addMemory = async (memory: Omit<MemoryWithConversation, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newMemory = await memoryService.addMemory(memory);
      if (newMemory) {
        setMemories(prev => [newMemory, ...prev]);
        return newMemory;
      }
    } catch (error) {
      console.error('Error adding memory:', error);
    }
    return null;
  };

  const updateMemory = async (id: string, updates: Partial<MemoryWithConversation>) => {
    try {
      const updatedMemory = await memoryService.updateMemory(id, updates);
      if (updatedMemory) {
        setMemories(prev => prev.map(memory =>
          memory.id === id ? updatedMemory : memory
        ));
      }
    } catch (error) {
      console.error('Error updating memory:', error);
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      const success = await memoryService.deleteMemory(id);
      if (success) {
        setMemories(prev => prev.filter(memory => memory.id !== id));
      }
    } catch (error) {
      console.error('Error deleting memory:', error);
    }
  };

  const getMemoriesForVisitor = (permissions: string[] = ['public']) => {
    return memoryService.getMemoriesForVisitor(memories, permissions);
  };

  const addMemoryFromConversation = async (
    title: string,
    content: string,
    conversationText: string,
    recipient: string = 'public'
  ) => {
    const today = new Date().toISOString().split('T')[0];
    
    return await addMemory({
      title,
      content,
      date: today,
      recipient,
      conversation_text: conversationText
    });
  };

  return {
    memories,
    isLoading,
    addMemory,
    updateMemory,
    deleteMemory,
    getMemoriesForVisitor,
    addMemoryFromConversation,
    loadMemories,
  };
};

export type { Memory, MemoryWithConversation };