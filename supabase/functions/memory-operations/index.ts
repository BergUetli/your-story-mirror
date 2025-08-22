import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MemoryRequest {
  action: 'save' | 'fetch' | 'logView';
  memory?: {
    title: string;
    text: string;
    tags?: string[];
    recipient?: string;
  };
  userId?: string;
  memoryId?: string;
  visitorId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, memory, userId, memoryId, visitorId }: MemoryRequest = await req.json();
    
    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader && action !== 'logView') {
      throw new Error('No authorization header');
    }

    let result;

    switch (action) {
      case 'save':
        if (!memory) throw new Error('Memory data required for save action');
        
        const { data: savedMemory, error: saveError } = await supabase
          .from('memories')
          .insert({
            title: memory.title,
            text: memory.text,
            tags: memory.tags || [],
            recipient: memory.recipient || 'private',
            user_id: userId
          })
          .select()
          .single();

        if (saveError) throw saveError;
        result = { memory: savedMemory };
        break;

      case 'fetch':
        const { data: memories, error: fetchError } = await supabase
          .from('memories')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        result = { memories };
        break;

      case 'logView':
        if (!memoryId || !visitorId || !userId) {
          throw new Error('Memory ID, visitor ID, and user ID required for log action');
        }
        
        const { data: logEntry, error: logError } = await supabase
          .from('visitor_logs')
          .insert({
            visitor_id: visitorId,
            user_id: userId,
            memory_id: memoryId
          })
          .select()
          .single();

        if (logError) throw logError;
        result = { logged: true };
        break;

      default:
        throw new Error('Invalid action');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in memory-operations function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});