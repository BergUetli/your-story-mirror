import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WhatsAppMemory {
  id: string;
  title: string;
  text: string;
  memory_date: string | null;
  memory_location: string | null;
  tags: string[];
  source_type: string;
  created_at: string;
  metadata?: {
    summary?: string;
    ai_extracted?: boolean;
    confidence?: {
      date: number;
      location: number;
    };
  };
}

export function useWhatsAppMemories() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<WhatsAppMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    loadWhatsAppMemories();

    // Set up realtime subscription for new memories
    const channel = supabase
      .channel('whatsapp-memories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memories',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMemory = payload.new as WhatsAppMemory;
            if (newMemory.source_type === 'whatsapp') {
              setMemories((prev) => [newMemory, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            setMemories((prev) =>
              prev.map((m) =>
                m.id === payload.new.id ? (payload.new as WhatsAppMemory) : m
              )
            );
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

  async function loadWhatsAppMemories() {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', user!.id)
        .eq('source_type', 'whatsapp')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setMemories(data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading WhatsApp memories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  }

  return {
    memories,
    loading,
    error,
    refresh: loadWhatsAppMemories,
  };
}
