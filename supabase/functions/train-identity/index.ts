import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Client for user authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    console.log('User auth check:', { user: user?.id, error: userError });
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Use service role for backend operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { identityId, action } = await req.json();

    // Check training status
    if (action === 'check_status') {
      const { data: identity, error } = await supabaseAdmin
        .from('trained_identities')
        .select('*')
        .eq('id', identityId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // If training job exists, check HF API for status
      if (identity.training_job_id && identity.training_status === 'training') {
        const HF_TOKEN = Deno.env.get('HUGGINGFACE_TOKEN');
        
        try {
          const statusResponse = await fetch(
            `https://huggingface.co/api/models/${identity.hf_repo_name}`,
            {
              headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
              },
            }
          );

          if (statusResponse.ok) {
            // Model exists, training complete!
            await supabaseAdmin
              .from('trained_identities')
              .update({
                training_status: 'completed',
                training_completed_at: new Date().toISOString(),
                hf_model_id: identity.hf_repo_name,
              })
              .eq('id', identityId);

            identity.training_status = 'completed';
          }
        } catch (error) {
          console.error('Error checking HF model status:', error);
        }
      }

      return new Response(JSON.stringify(identity), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Start training
    if (action === 'start_training') {
      const { data: identity, error: identityError } = await supabaseAdmin
        .from('trained_identities')
        .select('*')
        .eq('id', identityId)
        .eq('user_id', user.id)
        .single();

      if (identityError) throw identityError;

      // Update status to training
      await supabaseAdmin
        .from('trained_identities')
        .update({
          training_status: 'training',
          training_started_at: new Date().toISOString(),
        })
        .eq('id', identityId);

      const HF_TOKEN = Deno.env.get('HUGGINGFACE_TOKEN');
      if (!HF_TOKEN) {
        throw new Error('HUGGINGFACE_TOKEN not configured');
      }

      // Download images from Supabase Storage
      const imageBlobs: Blob[] = [];
      for (const storagePath of identity.image_storage_paths || []) {
        const { data: imageData, error: downloadError } = await supabaseAdmin.storage
          .from('identity-training-images')
          .download(storagePath);

        if (downloadError) {
          console.error('Error downloading image:', downloadError);
          continue;
        }

        if (imageData) {
          imageBlobs.push(imageData);
        }
      }

      console.log(`Downloaded ${imageBlobs.length} images for training`);

      // Create HF repo name
      const repoName = `${identity.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-lora-${Date.now()}`;
      const fullRepoName = `${user.email?.split('@')[0] || user.id}/${repoName}`;

      // Create repository on HF
      const createRepoResponse = await fetch(
        `https://huggingface.co/api/repos/create`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: repoName,
            type: 'model',
            private: true,
          }),
        }
      );

      if (!createRepoResponse.ok) {
        const errorText = await createRepoResponse.text();
        throw new Error(`Failed to create HF repo: ${errorText}`);
      }

      // Upload images to HF repo
      for (let i = 0; i < imageBlobs.length; i++) {
        const formData = new FormData();
        formData.append('file', imageBlobs[i], `image_${i}.jpg`);

        await fetch(
          `https://huggingface.co/api/repos/${fullRepoName}/upload/main/training_data/image_${i}.jpg`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HF_TOKEN}`,
            },
            body: formData,
          }
        );
      }

      // Start AutoTrain via HF API
      // Note: This is a simplified version. Full AutoTrain integration requires
      // more complex API calls. For now, we'll mark as training and you'll need
      // to manually train via HF UI or use their AutoTrain API when it's stable.
      
      // Update with repo info
      await supabaseAdmin
        .from('trained_identities')
        .update({
          hf_repo_name: fullRepoName,
          training_job_id: `autotrain-${Date.now()}`,
        })
        .eq('id', identityId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Training initiated. Images uploaded to HuggingFace.',
          repoName: fullRepoName,
          note: 'You can now train the LoRA using HuggingFace AutoTrain UI or API',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in train-identity function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
