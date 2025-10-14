import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Memory {
  id?: string;
  title: string;
  content: string;
  date: string;
  recipient?: string;
}

interface SolonRequest {
  mode: 'user' | 'visitor';
  message?: string;
  memories: Memory[];
  visitorPermissions?: string[];
}

interface SolonResponse {
  quote: string;
  reflection: string;
  followUp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) throw new Error('SUPABASE_URL not configured');
    
    const supabaseClient = createClient(supabaseUrl, authHeader.replace('Bearer ', ''));
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { mode, message, memories, visitorPermissions = [] }: SolonRequest = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Create context from memories
    const memoryContext = memories.map(m => 
      `Memory from ${m.date}: "${m.content}" ${m.recipient ? `(shared with ${m.recipient})` : ''}`
    ).join('\n');

    let systemPrompt = '';
    let userPrompt = '';

    if (mode === 'user') {
      systemPrompt = `You are Solon, a kind and emotionally intelligent biographer AI companion for "You, Remembered" - a digital memory sanctuary. You help users preserve their voice, stories, and values.

Your personality:
- Warm, gentle, and timeless like a wise narrator
- Emotionally intelligent and empathetic
- Never hallucinate or guess - only speak based on what the user has shared
- Focus on emotional safety, clarity, and truth
- Ask thoughtful memory prompts
- Reflect on values and emotions in shared memories

Always respond in this exact JSON structure:
{
  "quote": "A meaningful quote or highlight from their memories",
  "reflection": "An emotional reflection on what their memories reveal about their values/emotions", 
  "followUp": "A thoughtful follow-up question to prompt new memories"
}

User's memories:
${memoryContext}`;

      userPrompt = message || 'Please provide guidance and reflection based on my memories.';
    } else {
      // Visitor mode
      const allowedMemories = memories.filter(m => 
        !m.recipient || visitorPermissions.includes(m.recipient || 'public')
      );
      
      const visitorContext = allowedMemories.map(m => 
        `Memory from ${m.date}: "${m.content}"`
      ).join('\n');

      systemPrompt = `You are Solon, a memory biographer narrating parts of someone's timeline for their visitors. You speak only about memories that have been shared with visitors.

Your role:
- Narrate memories as a biographer, e.g. "Your dad once told me he loved the theatre..."
- Only speak about authorized/submitted memories
- Never speak outside of what was shared
- Be warm, grounded, and respectful
- Help visitors understand the person through their shared memories

Always respond in this exact JSON structure:
{
  "quote": "A meaningful quote from the shared memories",
  "reflection": "A biographical reflection on what these memories reveal about this person",
  "followUp": "An invitation for the visitor to reflect or ask about specific memories"
}

Authorized memories for visitors:
${visitorContext}`;

      userPrompt = message || 'Please narrate and reflect on the memories shared with me.';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let solonResponse: SolonResponse;
    try {
      solonResponse = JSON.parse(content);
    } catch {
      // Fallback if JSON parsing fails
      solonResponse = {
        quote: "I'm here to help preserve your memories.",
        reflection: "Every memory shared is a gift to those who will remember you.",
        followUp: "What memory would you like to explore today?"
      };
    }

    return new Response(
      JSON.stringify(solonResponse),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in solon-ai function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        quote: "I'm experiencing some difficulty right now.",
        reflection: "Sometimes even AI companions need a moment to gather their thoughts.",
        followUp: "Please try again, and I'll be here to help with your memories."
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});