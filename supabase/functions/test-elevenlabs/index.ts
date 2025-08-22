import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    
    console.log('Testing ElevenLabs API key availability:', {
      hasKey: !!ELEVENLABS_API_KEY,
      keyLength: ELEVENLABS_API_KEY?.length || 0,
      keyPrefix: ELEVENLABS_API_KEY ? ELEVENLABS_API_KEY.substring(0, 8) + '...' : 'none'
    });

    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'ElevenLabs API key not found',
        hasKey: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test a simple API call to ElevenLabs
    console.log('Making test API call to ElevenLabs...');
    const testResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    const responseText = await testResponse.text();
    console.log('ElevenLabs API response status:', testResponse.status);
    console.log('ElevenLabs API response:', responseText.substring(0, 200) + '...');
    
    return new Response(JSON.stringify({
      success: true,
      hasKey: true,
      keyLength: ELEVENLABS_API_KEY.length,
      apiStatus: testResponse.status,
      apiResponse: testResponse.ok ? 'API connection successful' : responseText
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in test-elevenlabs function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});