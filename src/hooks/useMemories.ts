import { useState, useEffect } from 'react';
import type { Memory } from '@/services/solonService';

// Mock memories that match the timeline and add memory functionality
const mockMemories: Memory[] = [
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
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading from local storage or API
    const loadMemories = () => {
      setIsLoading(true);
      
      // Try to load from localStorage first
      const stored = localStorage.getItem('memories');
      if (stored) {
        try {
          const parsedMemories = JSON.parse(stored);
          setMemories(parsedMemories);
        } catch (error) {
          console.error('Error parsing stored memories:', error);
          setMemories(mockMemories);
        }
      } else {
        setMemories(mockMemories);
      }
      
      setIsLoading(false);
    };

    loadMemories();
  }, []);

  const addMemory = (memory: Omit<Memory, 'id'>) => {
    const newMemory: Memory = {
      ...memory,
      id: Date.now().toString(),
    };
    
    const updatedMemories = [...memories, newMemory];
    setMemories(updatedMemories);
    
    // Save to localStorage
    localStorage.setItem('memories', JSON.stringify(updatedMemories));
    
    return newMemory;
  };

  const updateMemory = (id: string, updates: Partial<Memory>) => {
    const updatedMemories = memories.map(memory =>
      memory.id === id ? { ...memory, ...updates } : memory
    );
    
    setMemories(updatedMemories);
    localStorage.setItem('memories', JSON.stringify(updatedMemories));
  };

  const deleteMemory = (id: string) => {
    const updatedMemories = memories.filter(memory => memory.id !== id);
    setMemories(updatedMemories);
    localStorage.setItem('memories', JSON.stringify(updatedMemories));
  };

  const getMemoriesForVisitor = (permissions: string[] = ['public']) => {
    return memories.filter(memory => 
      !memory.recipient || permissions.includes(memory.recipient)
    );
  };

  return {
    memories,
    isLoading,
    addMemory,
    updateMemory,
    deleteMemory,
    getMemoriesForVisitor,
  };
};

export type { Memory };