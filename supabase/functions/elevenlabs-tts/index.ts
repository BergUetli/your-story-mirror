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
    
    // Read request body
    const requestBody = await req.json();
    console.log('📥 Received TTS request:', { 
      text: requestBody.text?.substring(0, 50) + '...', 
      voiceId: requestBody.voiceId,
      model: requestBody.model 
    });
    
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
    console.log('🔑 API key length:', ELEVENLABS_API_KEY.length);
    console.log('🔑 API key starts with:', ELEVENLABS_API_KEY.substring(0, 10) + '...');
    
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
    console.log('📡 ElevenLabs response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ElevenLabs API error:', response.status, errorText);
      console.error('❌ Request URL was:', `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
      console.error('❌ Request body was:', JSON.stringify(elevenLabsBody));
      return new Response(JSON.stringify({ 
        error: `ElevenLabs API error: ${response.status}`,
        details: errorText,
        voiceId: voiceId,
        model: model
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ ElevenLabs response OK, getting audio data...');
    
    try {
      const audioBuffer = await response.arrayBuffer();
      console.log('🎵 Audio data size:', audioBuffer.byteLength, 'bytes');

      if (audioBuffer.byteLength === 0) {
        throw new Error('Received empty audio buffer from ElevenLabs');
      }

      // Convert to base64 safely without stack overflow
      console.log('🔄 Converting to base64...');
      
      // Use TextEncoder/TextDecoder approach for large data
      const uint8Array = new Uint8Array(audioBuffer);
      let binaryString = '';
      
      // Process in chunks but maintain binary integrity
      const chunkSize = 8192; // Smaller chunks for string building
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64Audio = btoa(binaryString);
      console.log('📦 Converted to base64, length:', base64Audio.length);

      if (!base64Audio || base64Audio.length === 0) {
        throw new Error('Base64 conversion failed - empty result');
      }

      return new Response(base64Audio, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain',
        },
      });
    } catch (audioError) {
      console.error('❌ Error processing audio data:', audioError);
      console.error('❌ Audio error stack:', audioError.stack);
      return new Response(JSON.stringify({ 
        error: 'Audio processing failed',
        details: audioError.message,
        stack: audioError.stack
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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