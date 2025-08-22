import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TTSRequest {
  text: string;
  voiceId: string;
  model?: string;
  voiceSettings?: {
    stability: number;
    similarity_boost: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Request method:', req.method);
    console.log('🔍 Request headers:', Object.fromEntries(req.headers.entries()));
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('📥 Received TTS request:', { 
        text: requestBody.text?.substring(0, 50) + '...', 
        voiceId: requestBody.voiceId,
        model: requestBody.model 
      });
    } catch (jsonError) {
      console.error('❌ JSON parse error:', jsonError);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { text, voiceId, model = 'eleven_multilingual_v2', voiceSettings }: TTSRequest = requestBody;
    console.log("🗣️ voiceId is:", voiceId);
    
    if (!text || !voiceId) {
      console.error('❌ Missing required fields:', { text: !!text, voiceId: !!voiceId });
      return new Response(JSON.stringify({ error: 'Missing text or voiceId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      console.error('❌ ElevenLabs API key not found in environment');
      return new Response(JSON.stringify({ error: 'ElevenLabs API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔑 API key found, making request to ElevenLabs...');
    
    const elevenLabsBody = {
      text,
      model_id: model,
      voice_settings: voiceSettings || {
        stability: 0.5,
        similarity_boost: 0.8,
      }
    };
    
    console.log('📤 ElevenLabs request body:', elevenLabsBody);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify(elevenLabsBody),
    });

    console.log('📡 ElevenLabs response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ElevenLabs API error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        error: `ElevenLabs API error: ${response.status}`,
        details: errorText 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ ElevenLabs response OK, getting audio data...');
    
    try {
      const audioBuffer = await response.arrayBuffer();
      console.log('🎵 Audio data size:', audioBuffer.byteLength, 'bytes');

      // Convert to base64 to ensure proper transmission through Supabase functions
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
      console.log('📦 Converted to base64, length:', base64Audio.length);

      return new Response(base64Audio, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain',
        },
      });
    } catch (audioError) {
      console.error('❌ Error processing audio data:', audioError);
      throw audioError;
    }

  } catch (error) {
    console.error('❌ Error in elevenlabs-tts function:', error);
    console.error('❌ Error stack:', error.stack);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
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