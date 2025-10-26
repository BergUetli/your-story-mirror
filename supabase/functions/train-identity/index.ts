import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createRepo, uploadFiles } from "https://esm.sh/@huggingface/hub@0.15.1";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  // Track request context for error handling
  let parsedIdentityId: string | null = null;
  let parsedAction: string | null = null;

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Use service role for backend operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract JWT and verify user
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    
    console.log('User verification:', { userId: user?.id, error: userError?.message });
    
    if (userError || !user) {
      throw new Error('Invalid or expired token');
    }

    const { identityId, action } = await req.json();
    // Track for error handling in catch
    parsedIdentityId = identityId ?? null;
    parsedAction = action ?? null;

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

      // Fetch the actual HuggingFace username
      console.log('Fetching HuggingFace username...');
      const whoamiResponse = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: { 'Authorization': `Bearer ${HF_TOKEN}` },
      });

      if (!whoamiResponse.ok) {
        const errorText = await whoamiResponse.text();
        throw new Error(`Failed to fetch HF username: ${errorText}`);
      }

      const whoamiData = await whoamiResponse.json();
      const hfUsername = whoamiData.name;
      console.log(`HuggingFace username: ${hfUsername}`);

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

      if (imageBlobs.length === 0) {
        throw new Error('No images could be downloaded for training');
      }

      // Create HF repo name with CORRECT username
      const repoName = `${identity.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-lora-${Date.now()}`;
      const fullRepoName = `${hfUsername}/${repoName}`;

      // Create repository on HF using @huggingface/hub
      console.log(`Creating HF repository: ${fullRepoName}`);
      await createRepo({
        repo: { type: "model", name: fullRepoName },
        accessToken: HF_TOKEN,
        private: true,
      });

      console.log(`Repository created: ${fullRepoName}`);

      // Prepare files for upload
      console.log(`Preparing to upload ${imageBlobs.length} images using @huggingface/hub...`);
      
      const files = [];

      // Add .gitattributes
      files.push({
        path: '.gitattributes',
        content: new Blob([
          '*.jpg filter=lfs diff=lfs merge=lfs -text\n' +
          '*.jpeg filter=lfs diff=lfs merge=lfs -text\n' +
          '*.png filter=lfs diff=lfs merge=lfs -text\n' +
          '*.webp filter=lfs diff=lfs merge=lfs -text\n'
        ]),
      });

      // Add training images
      for (let i = 0; i < imageBlobs.length; i++) {
        files.push({
          path: `training_data/image_${i}.jpg`,
          content: imageBlobs[i],
        });
      }

      // Add training_config.json
      const trainingConfig = {
        base_model: "black-forest-labs/FLUX.1-dev",
        trigger_word: identity.name.toLowerCase(),
        training_type: "lora",
        num_images: imageBlobs.length,
        steps: 500,
        learning_rate: 0.0005,
      };
      files.push({
        path: 'training_config.json',
        content: new Blob([JSON.stringify(trainingConfig, null, 2)]),
      });

      // Upload all files with LFS support
      console.log('Uploading files to Hugging Face...');
      await uploadFiles({
        repo: { type: "model", name: fullRepoName },
        accessToken: HF_TOKEN,
        files,
        commitTitle: `Initial training data for ${identity.name}`,
        commitDescription: `Uploaded ${imageBlobs.length} images via Edge Function`,
      });

      console.log('Upload succeeded. Training files are in the repo.');
      
      // Update with repo info - training needs to be started manually on HF
      await supabaseAdmin
        .from('trained_identities')
        .update({
          hf_repo_name: fullRepoName,
          training_job_id: `manual-${Date.now()}`,
        })
        .eq('id', identityId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Images uploaded. Please start training on HuggingFace.',
          repoName: fullRepoName,
          trainingUrl: `https://huggingface.co/${fullRepoName}`,
          autoTrainUrl: `https://huggingface.co/spaces/autotrain-projects/autotrain-advanced`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in train-identity function:', error);

    // Best-effort: mark training as failed on server if we know the identity
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      // Use parsed variables captured earlier in the request scope
      if (parsedAction === 'start_training' && parsedIdentityId) {
        await supabaseAdmin
          .from('trained_identities')
          .update({ training_status: 'failed', training_error: (error as any)?.message ?? 'Edge function failure' })
          .eq('id', parsedIdentityId);
      }
    } catch (e) {
      console.error('Failed to update training status on server error:', e);
    }

    return new Response(
      JSON.stringify({ error: (error as any)?.message ?? 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
