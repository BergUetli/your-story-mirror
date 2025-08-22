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
    console.log('🔍 Debugging secret access...');
    
    // Get all environment variables
    const allEnvVars = Deno.env.toObject();
    const envKeys = Object.keys(allEnvVars);
    
    // Check specifically for ElevenLabs key
    const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY');
    
    // Check for any keys that might contain "ELEVEN"
    const elevenKeys = envKeys.filter(key => 
      key.toUpperCase().includes('ELEVEN')
    );
    
    // Check for any keys that might contain "API"
    const apiKeys = envKeys.filter(key => 
      key.toUpperCase().includes('API')
    );
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      totalEnvVars: envKeys.length,
      elevenLabsKeyFound: !!elevenLabsKey,
      elevenLabsKeyLength: elevenLabsKey?.length || 0,
      elevenLabsKeyPrefix: elevenLabsKey ? elevenLabsKey.substring(0, 12) + '...' : 'NOT_FOUND',
      allElevenKeys: elevenKeys,
      allApiKeys: apiKeys,
      relevantEnvKeys: envKeys.filter(key => 
        key.includes('API') || 
        key.includes('ELEVEN') || 
        key.includes('SUPABASE') ||
        key.includes('OPENAI')
      ),
      // Safe partial listing of all env vars (first 3 chars only)
      allEnvVarsPreview: envKeys.map(key => key.substring(0, 3) + '...')
    };
    
    console.log('📊 Debug Results:', JSON.stringify(debugInfo, null, 2));
    
    return new Response(
      JSON.stringify(debugInfo, null, 2),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
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