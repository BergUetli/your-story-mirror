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
    console.log('🔍 Checking environment variables...');
    
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    console.log('Environment check results:', {
      hasElevenLabsKey: !!ELEVENLABS_API_KEY,
      keyLength: ELEVENLABS_API_KEY?.length || 0,
      keyPrefix: ELEVENLABS_API_KEY ? ELEVENLABS_API_KEY.substring(0, 8) + '...' : 'none',
      allEnvKeys: Object.keys(Deno.env.toObject()).filter(key => 
        key.includes('ELEVEN') || key.includes('API')
      )
    });

    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'ElevenLabs API key not found in environment',
        hasKey: false,
        availableEnvVars: Object.keys(Deno.env.toObject()).filter(key => 
          key.includes('ELEVEN') || key.includes('API')
        )
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test a simple ElevenLabs API call
    console.log('🧪 Testing ElevenLabs API access...');
    const testResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    const responseText = await testResponse.text();
    console.log('ElevenLabs API test response:', {
      status: testResponse.status,
      statusText: testResponse.statusText,
      responseLength: responseText.length
    });
    
    return new Response(JSON.stringify({
      success: true,
      hasKey: true,
      keyLength: ELEVENLABS_API_KEY.length,
      elevenLabsApiStatus: testResponse.status,
      elevenLabsApiResponse: testResponse.ok ? 'API connection successful' : responseText.substring(0, 200)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in test-key-access function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      type: 'runtime_error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});