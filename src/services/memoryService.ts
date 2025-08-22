import { createClient } from '@supabase/supabase-js';
import type { Memory } from './solonService';

interface MemoryWithConversation extends Memory {
  conversation_text?: string;
  created_at?: string;
  updated_at?: string;
}

class MemoryService {
  private supabase: any = null;
  private isSupabaseAvailable = false;

  constructor() {
    this.initializeSupabase();
  }

  private initializeSupabase() {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseAnonKey) {
        this.supabase = createClient(supabaseUrl, supabaseAnonKey);
        this.isSupabaseAvailable = true;
      } else {
        console.warn('Supabase environment variables not found. Using localStorage fallback.');
        this.isSupabaseAvailable = false;
      }
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      this.isSupabaseAvailable = false;
    }
  }

  async getMemories(): Promise<MemoryWithConversation[]> {
    if (!this.isSupabaseAvailable) {
      return this.getMemoriesFromLocalStorage();
    }

    try {
      const { data, error } = await this.supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching memories from Supabase, falling back to localStorage:', error);
      return this.getMemoriesFromLocalStorage();
    }
  }

  private getMemoriesFromLocalStorage(): MemoryWithConversation[] {
    try {
      const stored = localStorage.getItem('memories');
      const memories = stored ? JSON.parse(stored) : [];
      console.log('📖 Loading memories from localStorage:', memories.length, 'memories found');
      return memories;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  private saveMemoriesToLocalStorage(memories: MemoryWithConversation[]) {
    try {
      localStorage.setItem('memories', JSON.stringify(memories));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  async addMemory(memory: Omit<MemoryWithConversation, 'id' | 'created_at' | 'updated_at'>): Promise<MemoryWithConversation | null> {
    if (!this.isSupabaseAvailable) {
      return this.addMemoryToLocalStorage(memory);
    }

    try {
      const { data, error } = await this.supabase
        .from('memories')
        .insert([{
          title: memory.title,
          content: memory.content,
          date: memory.date,
          recipient: memory.recipient || 'public',
          conversation_text: memory.conversation_text || null
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding memory to Supabase, falling back to localStorage:', error);
      return this.addMemoryToLocalStorage(memory);
    }
  }

  private addMemoryToLocalStorage(memory: Omit<MemoryWithConversation, 'id' | 'created_at' | 'updated_at'>): MemoryWithConversation {
    const newMemory: MemoryWithConversation = {
      ...memory,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('💾 Adding memory to localStorage:', newMemory.title);
    const memories = this.getMemoriesFromLocalStorage();
    console.log('📊 Current memories count before add:', memories.length);
    const updatedMemories = [newMemory, ...memories];
    this.saveMemoriesToLocalStorage(updatedMemories);
    console.log('✅ Memory saved to localStorage, new count:', updatedMemories.length);
    
    return newMemory;
  }

  async updateMemory(id: string, updates: Partial<MemoryWithConversation>): Promise<MemoryWithConversation | null> {
    if (!this.isSupabaseAvailable) {
      return this.updateMemoryInLocalStorage(id, updates);
    }

    try {
      const { data, error } = await this.supabase
        .from('memories')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating memory in Supabase, falling back to localStorage:', error);
      return this.updateMemoryInLocalStorage(id, updates);
    }
  }

  private updateMemoryInLocalStorage(id: string, updates: Partial<MemoryWithConversation>): MemoryWithConversation | null {
    const memories = this.getMemoriesFromLocalStorage();
    const memoryIndex = memories.findIndex(m => m.id === id);
    
    if (memoryIndex === -1) return null;
    
    const updatedMemory = {
      ...memories[memoryIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    memories[memoryIndex] = updatedMemory;
    this.saveMemoriesToLocalStorage(memories);
    
    return updatedMemory;
  }

  async deleteMemory(id: string): Promise<boolean> {
    if (!this.isSupabaseAvailable) {
      return this.deleteMemoryFromLocalStorage(id);
    }

    try {
      const { error } = await this.supabase
        .from('memories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting memory from Supabase, falling back to localStorage:', error);
      return this.deleteMemoryFromLocalStorage(id);
    }
  }

  private deleteMemoryFromLocalStorage(id: string): boolean {
    try {
      const memories = this.getMemoriesFromLocalStorage();
      const filteredMemories = memories.filter(m => m.id !== id);
      this.saveMemoriesToLocalStorage(filteredMemories);
      return true;
    } catch (error) {
      console.error('Error deleting from localStorage:', error);
      return false;
    }
  }

  async searchMemories(query: string): Promise<MemoryWithConversation[]> {
    if (!this.isSupabaseAvailable) {
      return this.searchMemoriesInLocalStorage(query);
    }

    try {
      const { data, error } = await this.supabase
        .from('memories')
        .select('*')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,conversation_text.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching memories in Supabase, falling back to localStorage:', error);
      return this.searchMemoriesInLocalStorage(query);
    }
  }

  private searchMemoriesInLocalStorage(query: string): MemoryWithConversation[] {
    const memories = this.getMemoriesFromLocalStorage();
    const lowercaseQuery = query.toLowerCase();
    
    return memories.filter(memory => 
      memory.title.toLowerCase().includes(lowercaseQuery) ||
      memory.content.toLowerCase().includes(lowercaseQuery) ||
      (memory.conversation_text && memory.conversation_text.toLowerCase().includes(lowercaseQuery))
    );
  }

  getMemoriesForVisitor(memories: MemoryWithConversation[], permissions: string[] = ['public']): MemoryWithConversation[] {
    return memories.filter(memory => 
      !memory.recipient || permissions.includes(memory.recipient)
    );
  }
}

export const memoryService = new MemoryService();
export type { MemoryWithConversation };