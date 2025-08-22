import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResults {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const results: TestResults[] = [];
  
  try {
    // Step 1: Check environment variables
    console.log('🔍 Step 1: Environment Check');
    const allEnvVars = Deno.env.toObject();
    const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY');
    
    results.push({
      step: 'Environment Check',
      success: true,
      data: {
        hasElevenLabsKey: !!elevenLabsKey,
        keyLength: elevenLabsKey?.length || 0,
        keyPrefix: elevenLabsKey ? elevenLabsKey.substring(0, 10) + '...' : 'none',
        totalEnvVars: Object.keys(allEnvVars).length,
        relevantKeys: Object.keys(allEnvVars).filter(key => 
          key.includes('ELEVEN') || key.includes('API') || key.includes('SUPABASE')
        )
      }
    });

    if (!elevenLabsKey) {
      results.push({
        step: 'ElevenLabs Key Validation',
        success: false,
        error: 'ElevenLabs API key not found'
      });
    } else {
      // Step 2: Test ElevenLabs API connectivity
      console.log('🌐 Step 2: ElevenLabs API Test');
      try {
        const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
          method: 'GET',
          headers: {
            'xi-api-key': elevenLabsKey,
          },
        });

        const voicesText = await voicesResponse.text();
        
        results.push({
          step: 'ElevenLabs API Connectivity',
          success: voicesResponse.ok,
          data: {
            status: voicesResponse.status,
            statusText: voicesResponse.statusText,
            responseLength: voicesText.length,
            headers: Object.fromEntries(voicesResponse.headers.entries()),
            response: voicesResponse.ok ? 'API accessible' : voicesText.substring(0, 500)
          }
        });

        if (voicesResponse.ok) {
          // Step 3: Test actual TTS call
          console.log('🎵 Step 3: TTS Generation Test');
          const ttsResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/9BWtsMINqrJLrRacOk9x', {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': elevenLabsKey,
            },
            body: JSON.stringify({
              text: 'Test speech generation',
              model_id: 'eleven_turbo_v2_5',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.8,
              }
            }),
          });

          results.push({
            step: 'TTS Generation',
            success: ttsResponse.ok,
            data: {
              status: ttsResponse.status,
              statusText: ttsResponse.statusText,
              contentType: ttsResponse.headers.get('content-type'),
              contentLength: ttsResponse.headers.get('content-length'),
              response: ttsResponse.ok ? 'TTS successful' : await ttsResponse.text()
            }
          });
        }
      } catch (error) {
        results.push({
          step: 'ElevenLabs API Test',
          success: false,
          error: error.message
        });
      }
    }

    // Step 4: Check Supabase environment
    console.log('🔧 Step 4: Supabase Environment Check');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    results.push({
      step: 'Supabase Environment',
      success: !!(supabaseUrl && supabaseKey),
      data: {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey,
        supabaseUrlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'none'
      }
    });

    // Step 5: Runtime environment info
    console.log('📊 Step 5: Runtime Environment');
    results.push({
      step: 'Runtime Environment',
      success: true,
      data: {
        denoVersion: Deno.version,
        platform: Deno.build,
        permissions: {
          net: true, // We can make network requests
          env: true  // We can access environment variables
        },
        timestamp: new Date().toISOString()
      }
    });

    const summary = {
      totalTests: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    };

    console.log('📋 Test Summary:', summary);

    return new Response(JSON.stringify(summary, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Comprehensive test failed:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      results: results
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});