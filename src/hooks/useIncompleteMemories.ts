import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface IncompleteMemory {
  id: string;
  title: string;
  text: string;
  memory_date: string | null;
  memory_location: string | null;
  tags: string[];
  source_type: string;
  status: string;
  needs_review: boolean;
  created_at: string;
  metadata?: {
    auto_saved?: boolean;
    saved_at?: string;
    completion_status?: string;
  };
}

export function useIncompleteMemories() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<IncompleteMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    loadIncompleteMemories();

    // Set up realtime subscription for incomplete memories
    const channel = supabase
      .channel('incomplete-memories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memories',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const memory = payload.new as IncompleteMemory;
          
          if (payload.eventType === 'INSERT' && memory.status === 'incomplete') {
            setMemories((prev) => [memory, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            // If status changed to complete, remove from list
            if (memory.status === 'complete') {
              setMemories((prev) => prev.filter((m) => m.id !== memory.id));
            } else {
              setMemories((prev) =>
                prev.map((m) => (m.id === memory.id ? memory : m))
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setMemories((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  async function loadIncompleteMemories() {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'incomplete')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setMemories(data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading incomplete memories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load incomplete memories');
    } finally {
      setLoading(false);
    }
  }

  async function completeMemory(memoryId: string, updates: {
    memory_date?: string;
    memory_location?: string;
    title?: string;
  }) {
    try {
      const hasRequiredFields = updates.memory_date && updates.memory_location;
      
      const { error: updateError } = await supabase
        .from('memories')
        .update({
          ...updates,
          status: hasRequiredFields ? 'complete' : 'incomplete',
          needs_review: !hasRequiredFields,
          show_on_timeline: !!hasRequiredFields,
          metadata: {
            completed_at: new Date().toISOString(),
            completed_manually: true
          }
        })
        .eq('id', memoryId);

      if (updateError) throw updateError;

      // Refresh list
      await loadIncompleteMemories();
    } catch (err) {
      console.error('Error completing memory:', err);
      throw err;
    }
  }

  async function deleteMemory(memoryId: string) {
    try {
      const { error: deleteError } = await supabase
        .from('memories')
        .delete()
        .eq('id', memoryId);

      if (deleteError) throw deleteError;

      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch (err) {
      console.error('Error deleting memory:', err);
      throw err;
    }
  }

  return {
    memories,
    loading,
    error,
    refresh: loadIncompleteMemories,
    completeMemory,
    deleteMemory,
  };
}
