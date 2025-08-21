import { createClient } from '@supabase/supabase-js';
import type { Memory } from './solonService';

interface MemoryWithConversation extends Memory {
  conversation_text?: string;
  created_at?: string;
  updated_at?: string;
}

class MemoryService {
  private supabase;

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  async getMemories(): Promise<MemoryWithConversation[]> {
    try {
      const { data, error } = await this.supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching memories:', error);
      return [];
    }
  }

  async addMemory(memory: Omit<MemoryWithConversation, 'id' | 'created_at' | 'updated_at'>): Promise<MemoryWithConversation | null> {
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
      console.error('Error adding memory:', error);
      return null;
    }
  }

  async updateMemory(id: string, updates: Partial<MemoryWithConversation>): Promise<MemoryWithConversation | null> {
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
      console.error('Error updating memory:', error);
      return null;
    }
  }

  async deleteMemory(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('memories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting memory:', error);
      return false;
    }
  }

  async searchMemories(query: string): Promise<MemoryWithConversation[]> {
    try {
      const { data, error } = await this.supabase
        .from('memories')
        .select('*')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,conversation_text.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching memories:', error);
      return [];
    }
  }

  getMemoriesForVisitor(memories: MemoryWithConversation[], permissions: string[] = ['public']): MemoryWithConversation[] {
    return memories.filter(memory => 
      !memory.recipient || permissions.includes(memory.recipient)
    );
  }
}

export const memoryService = new MemoryService();
export type { MemoryWithConversation };