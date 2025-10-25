import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { identityId, view } = await req.json();
    
    if (!identityId) {
      throw new Error('identityId is required');
    }

    // Get the trained identity
    const { data: identity, error: identityError } = await supabaseClient
      .from('trained_identities')
      .select('*')
      .eq('id', identityId)
      .eq('user_id', user.id)
      .single();

    if (identityError || !identity) {
      throw new Error('Identity not found');
    }

    if (identity.training_status !== 'completed') {
      throw new Error('Identity training not completed');
    }

    if (!identity.hf_model_id) {
      throw new Error('No HuggingFace model ID found');
    }

    // Construct the prompt based on view
    const viewPrompts = {
      front: "A professional portrait photo, facing forward, neutral expression, studio lighting, plain background",
      right_profile: "A professional portrait photo, right side profile view, neutral expression, studio lighting, plain background",
      left_profile: "A professional portrait photo, left side profile view, neutral expression, studio lighting, plain background",
      smile: "A professional portrait photo, facing forward, warm smile, studio lighting, plain background",
    };

    const prompt = `${viewPrompts[view as keyof typeof viewPrompts] || viewPrompts.front}. Photorealistic, high quality, professional photography.`;

    console.log('Generating image with HF model:', identity.hf_model_id);
    console.log('Prompt:', prompt);

    // Call HuggingFace Inference API
    const HF_TOKEN = Deno.env.get('HUGGINGFACE_TOKEN');
    if (!HF_TOKEN) {
      throw new Error('HuggingFace token not configured');
    }

    const hfResponse = await fetch(
      `https://api-inference.huggingface.co/models/${identity.hf_model_id}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: "blurry, low quality, distorted, cartoon, illustration, painting",
            num_inference_steps: 30,
            guidance_scale: 7.5,
          }
        }),
      }
    );

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      console.error('HuggingFace API error:', errorText);
      throw new Error(`HuggingFace API error: ${errorText}`);
    }

    // Get the image blob
    const imageBlob = await hfResponse.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    return new Response(
      JSON.stringify({ 
        image: `data:image/png;base64,${base64}`,
        view,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating preview:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
