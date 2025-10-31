import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
      .select('preferred_name, age, location, occupation, hobbies_interests, family_members')
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
      .select('name, relationship, description')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build context for VAPI
    let context = '';
    
    if (profileData) {
      const userName = profileData.preferred_name || 'friend';
      context += `Speaking with ${userName}. `;
      if (profileData.age && profileData.location) {
        context += `${profileData.age} years old, ${profileData.location}. `;
      }
      if (profileData.occupation) {
        context += `Works as ${profileData.occupation}. `;
      }
    }

    if (characters && characters.length > 0) {
      context += `Important people: ${characters.map(c => `${c.name} (${c.relationship})`).join(', ')}. `;
    }

    if (memories && memories.length > 0) {
      context += `Recent memories: ${memories.map(m => m.title).slice(0, 3).join(', ')}.`;
    }

    const userName = profileData?.preferred_name || 'friend';
    const firstMessage = memories && memories.length > 0
      ? `Hey ${userName}! Welcome back. What's been on your mind lately?`
      : `Hey ${userName}! Welcome! Tell me what's on your mind.`;

    console.log('✅ Built context for VAPI session');

    return new Response(
      JSON.stringify({
        context,
        firstMessage,
        userName
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error in vapi-session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
