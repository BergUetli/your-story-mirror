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
        
        // Extract date from title or text (e.g., "Visit 2022", "Trip in 2018", "December 2020")
        const extractDate = (title: string, text: string): string | null => {
          const combined = `${title} ${text}`;
          
          // Match year patterns (2000-2099)
          const yearMatch = combined.match(/\b(20\d{2})\b/);
          if (yearMatch) {
            const year = yearMatch[1];
            
            // Try to find month names
            const monthMatch = combined.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i);
            if (monthMatch) {
              const monthNames: {[key: string]: string} = {
                january: '01', jan: '01', february: '02', feb: '02',
                march: '03', mar: '03', april: '04', apr: '04',
                may: '05', june: '06', jun: '06',
                july: '07', jul: '07', august: '08', aug: '08',
                september: '09', sep: '09', october: '10', oct: '10',
                november: '11', nov: '11', december: '12', dec: '12'
              };
              const month = monthNames[monthMatch[1].toLowerCase()];
              return `${year}-${month}-01`;
            }
            
            // Default to January 1st of that year
            return `${year}-01-01`;
          }
          
          return null;
        };
        
        const extractedDate = extractDate(memory.title, memory.text);
        
        const { data: savedMemory, error: saveError } = await supabase
          .from('memories')
          .insert({
            title: memory.title,
            text: memory.text,
            tags: memory.tags || [],
            recipient: memory.recipient || 'private',
            user_id: userId,
            memory_date: extractedDate
          })
          .select()
          .single();

        if (saveError) throw saveError;
        console.log('✅ Memory saved with extracted date:', { title: memory.title, extractedDate });
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