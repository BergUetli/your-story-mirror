import { supabase } from '@/integrations/supabase/client';
import type { Memory } from './solinService';

interface MemoryWithConversation extends Memory {
  conversation_text?: string;
  created_at?: string;
  updated_at?: string;
}

class MemoryService {
  // Use shared Supabase client instead of creating a new one
  private supabase = supabase;
  private isSupabaseAvailable = true;

  async getMemories(): Promise<MemoryWithConversation[]> {
    if (!this.isSupabaseAvailable) {
      return this.getMemoriesFromLocalStorage();
    }

    try {
      const { data, error } = await this.supabase
        .from('memories')
        .select('*')
        // Only get complete memories for Timeline - must have date AND location
        .not('memory_date', 'is', null)
        .not('memory_location', 'is', null)
        .eq('chunk_sequence', 1) // Only primary chunks to avoid duplicates
        .order('memory_date', { ascending: false });

      if (error) throw error;
      
      console.log(`📊 Timeline memories loaded: ${data?.length || 0} complete memories`);
      
      // Map database schema (text) to interface schema (content)
      return (data || []).map((mem: any) => ({
        ...mem,
        content: mem.text,
        date: mem.memory_date || mem.created_at, // Use memory_date for Timeline ordering
        location: mem.memory_location
      }));
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
      // Get current user or use placeholder for testing
      const { data: { user } } = await this.supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';
      
      const { data, error } = await this.supabase
        .from('memories')
        .insert([{
          user_id: userId,
          title: memory.title,
          text: memory.content, // Map content -> text for database
          recipient: memory.recipient || 'public',
          tags: []
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Map database schema back to interface schema
      return {
        ...data,
        content: data.text,
        date: data.created_at
      };
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
      // Map interface fields to database fields
      const dbUpdates: any = { ...updates };
      if (updates.content !== undefined) {
        dbUpdates.text = updates.content;
        delete dbUpdates.content;
      }
      delete dbUpdates.date; // date is read-only (created_at)
      
      const { data, error } = await this.supabase
        .from('memories')
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Map back to interface schema
      return {
        ...data,
        content: data.text,
        date: data.created_at
      };
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
        .or(`title.ilike.%${query}%,text.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database schema to interface schema
      return (data || []).map((mem: any) => ({
        ...mem,
        content: mem.text,
        date: mem.created_at
      }));
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