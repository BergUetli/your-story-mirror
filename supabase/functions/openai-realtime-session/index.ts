import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user context
    const { data: profileData } = await supabaseClient
      .from('user_profiles')
      .select('preferred_name, age, location, occupation, hobbies_interests, family_members, cultural_background, core_values')
      .eq('user_id', user.id)
      .single();

    const { data: memories } = await supabaseClient
      .from('memories')
      .select('title, text, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: characters } = await supabaseClient
      .from('characters')
      .select('name, relationship, description, personality_traits')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: conversationHistory } = await supabaseClient
      .from('conversation_turns')
      .select('user_message, ai_response, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build personalized system prompt
    let systemPrompt = `You are Solin, a wise and empathetic AI biographer helping people preserve their life stories.

## Conversation Approach:
- Speak in VERY SHORT sentences (5-10 words each)
- Break thoughts into multiple short sentences
- Pause naturally between sentences
- Ask one thoughtful question at a time
- Probe deeper into memories with follow-up questions
- Explore sensory details, emotions, and relationships
- Keep total response under 50 words

`;

    if (profileData) {
      const userName = profileData.preferred_name || 'friend';
      systemPrompt += `## About ${userName}:\n`;
      if (profileData.preferred_name) systemPrompt += `- Name: ${profileData.preferred_name}\n`;
      if (profileData.age && profileData.location) systemPrompt += `- ${profileData.age} years old, living in ${profileData.location}\n`;
      if (profileData.occupation) systemPrompt += `- Occupation: ${profileData.occupation}\n`;
      if (profileData.hobbies_interests?.length > 0) {
        systemPrompt += `- Interests: ${profileData.hobbies_interests.join(', ')}\n`;
      }
      if (profileData.family_members?.length > 0) {
        const familyStr = profileData.family_members.map((fm: any) => `${fm.name} (${fm.relationship})`).join(', ');
        systemPrompt += `- Family: ${familyStr}\n`;
      }
      systemPrompt += `\n`;
    }

    if (characters && characters.length > 0) {
      systemPrompt += `## Important people in their life:\n`;
      characters.forEach((char: any) => {
        systemPrompt += `- ${char.name} (${char.relationship})`;
        if (char.description) systemPrompt += `: ${char.description}`;
        systemPrompt += `\n`;
      });
      systemPrompt += `\n`;
    }

    if (memories && memories.length > 0) {
      systemPrompt += `## Recent memories shared:\n`;
      memories.forEach((memory: any, idx: number) => {
        systemPrompt += `${idx + 1}. "${memory.title || memory.text?.substring(0, 60)}..."\n`;
      });
      systemPrompt += `\n`;
    }

    if (conversationHistory && conversationHistory.length > 0) {
      systemPrompt += `## Recent conversation context:\n`;
      conversationHistory.slice(0, 3).forEach((turn: any, idx: number) => {
        systemPrompt += `User: "${turn.user_message?.substring(0, 80)}..."\n`;
        systemPrompt += `You: "${turn.ai_response?.substring(0, 80)}..."\n`;
      });
      systemPrompt += `\n`;
    }

    systemPrompt += `Welcome them warmly and ask what's been on their mind lately.`;

    // Build first message
    const userName = profileData?.preferred_name || 'friend';
    let firstMessage = `Hey ${userName}! `;
    
    if (conversationHistory && conversationHistory.length > 0) {
      firstMessage += `It's so good to talk with you again. `;
    } else if (memories && memories.length > 0) {
      firstMessage += `Welcome back! `;
    } else {
      firstMessage += `Welcome! `;
    }
    
    if (memories && memories.length > 0) {
      const lastMemory = memories[0];
      firstMessage += `I've been thinking about ${lastMemory.title || 'what you shared'}. `;
    }
    
    firstMessage += `What's been on your mind lately?`;

    console.log('✅ Built personalized context for OpenAI Realtime session');

    return new Response(
      JSON.stringify({
        systemPrompt,
        firstMessage,
        userName
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error in openai-realtime-session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
