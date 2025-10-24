import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Verify the JWT token
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl) throw new Error('SUPABASE_URL not configured');
    if (!supabaseServiceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { agentId } = await req.json();
    
    if (!agentId) {
      return new Response(
        JSON.stringify({ error: 'Agent ID is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      console.error('❌ ElevenLabs API key not found in environment');
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🔑 Generating personalized session for user:', user.id, 'agent:', agentId);

    // Fetch user profile for personalization
    const { data: profileData } = await supabaseClient
      .from('user_profiles')
      .select('preferred_name, age, location, occupation, hobbies_interests, family_members, cultural_background, core_values')
      .eq('user_id', user.id)
      .single();

    // Fetch recent memories (last 5)
    const { data: memories } = await supabaseClient
      .from('memories')
      .select('title, text, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Fetch recent conversation history (last 10 exchanges)
    const { data: conversationHistory } = await supabaseClient
      .from('conversation_turns')
      .select('user_message, ai_response, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build personalized context for system prompt
    let personalizedPrompt = `You are Solin, a warm and empathetic AI biographer. This is a returning conversation with someone you know well.\n\n`;

    if (profileData) {
      personalizedPrompt += `## About ${profileData.preferred_name || 'the user'}:\n`;
      if (profileData.preferred_name) personalizedPrompt += `- Name: ${profileData.preferred_name}\n`;
      if (profileData.age && profileData.location) personalizedPrompt += `- ${profileData.age} years old, living in ${profileData.location}\n`;
      if (profileData.occupation) personalizedPrompt += `- Occupation: ${profileData.occupation}\n`;
      if (profileData.hobbies_interests?.length > 0) {
        personalizedPrompt += `- Interests: ${profileData.hobbies_interests.join(', ')}\n`;
      }
      if (profileData.family_members?.length > 0) {
        const familyStr = profileData.family_members.map((fm: any) => `${fm.name} (${fm.relationship})`).join(', ');
        personalizedPrompt += `- Family: ${familyStr}\n`;
      }
      if (profileData.cultural_background?.length > 0) {
        personalizedPrompt += `- Cultural background: ${profileData.cultural_background.join(', ')}\n`;
      }
      if (profileData.core_values?.length > 0) {
        personalizedPrompt += `- Values: ${profileData.core_values.join(', ')}\n`;
      }
      personalizedPrompt += `\n`;
    }

    if (memories && memories.length > 0) {
      personalizedPrompt += `## Recent memories shared:\n`;
      memories.forEach((memory: any, idx: number) => {
        personalizedPrompt += `${idx + 1}. "${memory.title || memory.text?.substring(0, 60)}..."\n`;
      });
      personalizedPrompt += `\n`;
    }

    if (conversationHistory && conversationHistory.length > 0) {
      personalizedPrompt += `## Conversation context (most recent first):\n`;
      conversationHistory.slice(0, 3).forEach((turn: any, idx: number) => {
        personalizedPrompt += `${idx + 1}. User: "${turn.user_message?.substring(0, 80)}..."\n`;
        personalizedPrompt += `   You: "${turn.ai_response?.substring(0, 80)}..."\n`;
      });
      personalizedPrompt += `\n`;
    }

    personalizedPrompt += `## Your approach:
- Greet them warmly as someone you already know (avoid "nice to meet you" - you've spoken before!)
- Reference their previous stories and experiences naturally when relevant
- Build on past conversations rather than starting from scratch
- Show you remember what matters to them
- Be conversational, empathetic, and curious about updates to their life
- Ask thoughtful follow-up questions that demonstrate continuity

Welcome them back and ask what's been on their mind lately, or if there's anything new they'd like to share.`;

    // Build a personalized first message
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
      const title = lastMemory.title || '';
      
      // Use OpenAI to intelligently transform the memory title into natural conversational language
      try {
        if (OPENAI_API_KEY) {
          const transformResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: `Transform memory titles into natural conversational phrases. Remove dates. Make it sound like you're referring to something they shared with you.

Examples:
"Moving into New Apartment - 2024" → "the time you moved into your new apartment"
"Remembering My Best Friend Asim" → "your best friend Asim"
"Trip to Paris - June 2023" → "when you visited Paris"
"Mom's Birthday Celebration" → "celebrating your mom's birthday"
"First Day at New Job" → "your first day at your new job"

Return ONLY the transformed phrase, nothing else.`
                },
                {
                  role: 'user',
                  content: title
                }
              ],
              temperature: 0.3,
              max_tokens: 50,
            }),
          });

          if (transformResponse.ok) {
            const transformData = await transformResponse.json();
            const memoryReference = transformData.choices[0]?.message?.content?.trim() || title.toLowerCase();
            firstMessage += `I've been thinking about ${memoryReference}. `;
          } else {
            // Fallback: simple cleanup
            const cleanTitle = title.replace(/\s*-\s*\d{4}.*$/i, '').trim();
            firstMessage += `I've been thinking about ${cleanTitle.toLowerCase()}. `;
          }
        } else {
          // No OpenAI key - use simple fallback
          const cleanTitle = title.replace(/\s*-\s*\d{4}.*$/i, '').trim();
          firstMessage += `I've been thinking about ${cleanTitle.toLowerCase()}. `;
        }
      } catch (error) {
        console.warn('Failed to transform memory title:', error);
        const cleanTitle = title.replace(/\s*-\s*\d{4}.*$/i, '').trim();
        firstMessage += `I've been thinking about ${cleanTitle.toLowerCase()}. `;
      }
    }
    
    firstMessage += `What's been on your mind lately?`;

    console.log('✅ Built personalized prompt and greeting for', userName);

    // Request signed URL from ElevenLabs with extended inactivity timeout
    // Default is 20s; we extend to 180s to handle natural pauses in conversation
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}&inactivity_timeout=180`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ElevenLabs API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `ElevenLabs API error: ${response.status}`,
          details: errorText
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('✅ Signed URL generated successfully');

    return new Response(
      JSON.stringify({
        ...data,
        personalizedPrompt, // Include the personalized prompt for override
        firstMessage // Include the personalized first message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in elevenlabs-agent-token function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
