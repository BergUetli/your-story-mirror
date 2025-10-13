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
    const { memoryPrompt, style, guidance } = await req.json();
    console.log('Generating memory sketch:', { memoryPrompt, style });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build the detailed prompt based on style and user input
    const stylePrompts: Record<string, string> = {
      pencil_sketch: 'Create a detailed pencil sketch on textured paper with soft graphite shading.',
      charcoal: 'Create a dramatic charcoal drawing with bold strokes and deep contrast on rough paper.',
      soft_sepia: 'Create a warm sepia-toned vintage photograph with soft nostalgic lighting.',
      dreamlike_ink: 'Create a dreamlike ink wash painting with flowing brushstrokes and ethereal quality.'
    };

    const fullPrompt = `${stylePrompts[style] || stylePrompts.pencil_sketch} Memory scene: ${memoryPrompt}. Style: artistic, emotional, nostalgic, 4:3 aspect ratio.`;

    console.log('Full prompt:', fullPrompt);

    // Call OpenAI image generation API
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: fullPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
        response_format: 'url'
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const imageUrl = data.data[0].url;

    console.log('Generated image URL:', imageUrl);

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating memory sketch:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate memory sketch' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
