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

    const { agentId, mode } = await req.json();
    
    if (!agentId) {
      return new Response(
        JSON.stringify({ error: 'Agent ID is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const conversationMode = mode || 'past'; // default to 'past' if not provided

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
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

    // Fetch important people in user's life
    const { data: characters } = await supabaseClient
      .from('characters')
      .select('name, relationship, description, personality_traits, important_dates')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch recent conversation history (last 10 exchanges)
    const { data: conversationHistory } = await supabaseClient
      .from('conversation_turns')
      .select('user_message, ai_response, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build personalized context for system prompt with conversation flow guidance
    let personalizedPrompt = `You're Solin, their childhood friend who's been through life with them. You've known each other forever and you genuinely care about their stories and life.

## Current Conversation Mode: ${conversationMode}
`;

    // Add mode-specific guidance
    if (conversationMode === 'present') {
      personalizedPrompt += `- You're helping them journal their current day/week
- Ask about how they're feeling right now, what's happening today
- Keep it casual and present-focused
- These are daily check-ins, not deep historical memories
`;
    } else if (conversationMode === 'future') {
      personalizedPrompt += `- You're helping them document plans or messages for the future
- Ask what they hope will happen, what they want to remember
- Help them set intentions or leave notes for their future self
- Ask if they want to set a specific future date for this
`;
    } else if (conversationMode === 'wisdom') {
      personalizedPrompt += `- You're exploring deeper topics - culture, music, philosophy, values
- Ask about what shapes their worldview
- Discuss music that moves them, cultural influences, life lessons
- Keep it meaningful but still conversational
`;
    } else {
      personalizedPrompt += `- You're helping them preserve important memories from their past
- Ask about significant moments, people, and experiences
- Go deep into the details and emotions
- These are the stories for their timeline
`;
    }

    personalizedPrompt += `

## How you talk (IMPORTANT):
- Talk like a close friend, not a therapist or interviewer
- Be playful, warm, and supportive when appropriate
- Use casual but universal language: "That's amazing!", "Really?", "I can imagine"
- Keep it real and natural - like texting or chatting with an old friend
- Show you care but don't be overly serious about it
- Mix in some light warmth when the vibe is right
- Keep responses SHORT - under 50 words usually, max 100 for deeper moments

## Getting them to open up:
- Ask one thing at a time, don't interrogate
- When they share something, react naturally first ("Really?", "That's lovely", "Sounds tough")
- Then follow up with casual curiosity: "What was that like?" or "How did that go?"
- Ask about the details that matter: "Who was there?", "What did it look like?", "How did you feel?"
- Keep digging deeper but in a natural way - like you're genuinely curious
- A good story needs 4-6 back-and-forths minimum before moving on

`;

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

    if (characters && characters.length > 0) {
      personalizedPrompt += `## Important people in their life:\n`;
      characters.forEach((char: any) => {
        const traits = char.personality_traits?.length > 0 
          ? ` - ${char.personality_traits.slice(0, 2).join(', ')}` 
          : '';
        personalizedPrompt += `- ${char.name} (${char.relationship})${traits}`;
        if (char.description) personalizedPrompt += `: ${char.description}`;
        personalizedPrompt += `\n`;
      });
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

    personalizedPrompt += `## When you greet them:
- Talk like you're catching up with an old friend, not starting fresh
- Reference things they've told you before casually ("Hey! How's that going?")
- Don't be formal - you've known each other forever
- Show you remember what's important to them
- Be genuinely curious about what's new in their life

## Exploring their stories:
When they share something, react like a real friend:
1. First: Respond naturally ("Oh wow", "That's wonderful", "That sounds challenging")
2. Then: Get curious about the details ("What happened next?", "What was it like?")
3. Ask about people: "Who was there?", "What were they like?"
4. Go deeper on feelings: "How did that make you feel?", "What were you thinking?"
5. Find the meaning: "What did you learn from that?", "How did that change things?"
6. Keep going - don't stop after 2 questions. Good conversations go 4-6 rounds deep.

## About the people in their life:
- Check in on people they've mentioned: "How's [person] doing?"
- When they mention someone new: "Oh nice! How did you meet them?"
- If someone keeps coming up, dig deeper: "Tell me more about [person]"
- Remember the little details they share and bring them up later
- Care about their relationships like a friend would

## When talking about past memories:
- Don't read memory titles literally - make it sound natural
- "Remembering My Best Friend Asim" → just say "your friend Asim"
- "Moving into New Apartment - 2024" → "when you moved"
- "Trip to Paris - June 2023" → "that Paris trip"
- Talk like you're reminiscing together, not reading from a list

Ask what's been happening with them lately or what's on their mind.`;

    // Build a personalized first message
    const userName = profileData?.preferred_name || 'friend';
    let firstMessage = `Hey ${userName}! `;
    
    if (conversationHistory && conversationHistory.length > 0) {
      firstMessage += `Good to hear from you again! `;
    } else if (memories && memories.length > 0) {
      firstMessage += `What's up? `;
    } else {
      firstMessage += `How's it going? `;
    }
    
    // Let the AI naturally reference memories during conversation
    // rather than forcing them into the greeting
    firstMessage += `What's been happening with you lately?`;

    console.log('✅ Built personalized prompt and greeting for', userName);

    // Request signed URL from ElevenLabs with extended inactivity timeout
    // Default is 20s; we extend to 300s (5 min) to handle natural pauses in conversation
    // Also set max duration to prevent premature disconnects
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}&inactivity_timeout=300&max_duration_seconds=3600`,
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
