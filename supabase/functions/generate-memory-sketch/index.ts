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
    const { mode, memoryPrompt, style, camera, identities } = await req.json();
    console.log('Generating image:', { mode, memoryPrompt, style, camera, identities });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let fullPrompt: string;

    if (mode === 'photoreal') {
      // Build photoreal prompt
      const lensDescription = camera?.lens_mm === 35 ? 'wide angle 35mm' : 
                             camera?.lens_mm === 50 ? 'standard 50mm' : 
                             'portrait 85mm';
      
      const styleDescription = camera?.style === 'documentary' ? 'natural documentary style' :
                              camera?.style === 'cinematic' ? 'cinematic film look' :
                              'professional portrait style';
      
      fullPrompt = `Ultra-realistic photorealistic photograph, ${lensDescription} lens, ${styleDescription}, natural lighting, high detail, 4K quality, professional photography. Scene: ${memoryPrompt}. Photographic, hyper-realistic, detailed textures, natural colors, authentic moment captured on film.`;
    } else {
      // Build sketch/artistic prompt
      const stylePrompts: Record<string, string> = {
        pencil_sketch: 'Create a detailed pencil sketch on textured paper with soft graphite shading.',
        charcoal: 'Create a dramatic charcoal drawing with bold strokes and deep contrast on rough paper.',
        soft_sepia: 'Create a warm sepia-toned vintage photograph with soft nostalgic lighting.',
        dreamlike_ink: 'Create a dreamlike ink wash painting with flowing brushstrokes and ethereal quality.'
      };

      fullPrompt = `${stylePrompts[style] || stylePrompts.pencil_sketch} Memory scene: ${memoryPrompt}. Style: artistic, emotional, nostalgic, 4:3 aspect ratio.`;
    }

    console.log('Full prompt:', fullPrompt);

    // Call OpenAI image generation API
    // Note: gpt-image-1 always returns base64, doesn't support response_format parameter
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
        quality: 'high'
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    // gpt-image-1 returns base64 encoded images
    const base64Image = data.data[0].b64_json;
    const imageUrl = `data:image/png;base64,${base64Image}`;

    console.log('Generated image (base64 length):', base64Image.length);

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
