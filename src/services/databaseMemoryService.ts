import { supabase } from '@/integrations/supabase/client';

export interface DatabaseMemory {
  id: string;
  user_id: string;
  title: string;
  text: string;
  tags: string[];
  recipient: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMemoryData {
  title: string;
  text: string;
  tags?: string[];
  recipient?: string;
}

class DatabaseMemoryService {
  async saveMemory(memoryData: CreateMemoryData): Promise<DatabaseMemory | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('memory-operations', {
        body: {
          action: 'save',
          memory: memoryData,
          userId: user.user.id
        }
      });

      if (error) {
        console.error('Error saving memory:', error);
        throw error;
      }

      return data.memory;
    } catch (error) {
      console.error('Failed to save memory:', error);
      return null;
    }
  }

  async getUserMemories(): Promise<DatabaseMemory[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('memory-operations', {
        body: {
          action: 'fetch',
          userId: user.user.id
        }
      });

      if (error) {
        console.error('Error fetching memories:', error);
        throw error;
      }

      return data.memories || [];
    } catch (error) {
      console.error('Failed to fetch memories:', error);
      return [];
    }
  }

  async getPublicMemories(userId: string): Promise<DatabaseMemory[]> {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId)
        .eq('recipient', 'public')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching public memories:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch public memories:', error);
      return [];
    }
  }

  async logMemoryView(memoryId: string, userId: string, visitorId: string): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('memory-operations', {
        body: {
          action: 'logView',
          memoryId,
          userId,
          visitorId
        }
      });

      if (error) {
        console.error('Error logging memory view:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to log memory view:', error);
      return false;
    }
  }

  // Convert from legacy Memory format to DatabaseMemory
  memoryToDatabase(memory: any, userId: string): CreateMemoryData {
    return {
      title: memory.title || 'Untitled Memory',
      text: memory.content || memory.text || '',
      tags: memory.tags || [],
      recipient: memory.recipient || 'private'
    };
  }

  // Convert from DatabaseMemory to legacy Memory format
  databaseToMemory(dbMemory: DatabaseMemory): any {
    return {
      id: dbMemory.id,
      title: dbMemory.title,
      content: dbMemory.text,
      date: new Date(dbMemory.created_at).toISOString().split('T')[0],
      recipient: dbMemory.recipient
    };
  }
}

export const databaseMemoryService = new DatabaseMemoryService();
export default databaseMemoryService;