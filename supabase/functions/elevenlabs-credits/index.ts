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
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'ElevenLabs API key not configured',
        hasKey: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user subscription info
    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch ElevenLabs user data',
        status: response.status,
        details: errorText
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userData = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      subscription: userData.subscription,
      characterCount: userData.subscription?.character_count || 0,
      characterLimit: userData.subscription?.character_limit || 0,
      remainingCharacters: (userData.subscription?.character_limit || 0) - (userData.subscription?.character_count || 0),
      percentUsed: userData.subscription?.character_limit 
        ? ((userData.subscription.character_count / userData.subscription.character_limit) * 100).toFixed(2)
        : 0,
      tier: userData.subscription?.tier || 'unknown',
      nextCharacterCountResetUnix: userData.subscription?.next_character_count_reset_unix || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in elevenlabs-credits function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
