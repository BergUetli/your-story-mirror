import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
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

      // Create repository on HF
      console.log(`Creating HF repository: ${fullRepoName}`);
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
        console.error('Failed to create repo:', errorText);
        throw new Error(`Failed to create HF repo: ${errorText}`);
      }

      console.log(`Repository created: ${fullRepoName}`);

      // Commit images and config in a single commit via Hub commit API (NDJSON)
      const toBase64 = (bytes: Uint8Array) => base64Encode(bytes);

      console.log(`Preparing commit with ${imageBlobs.length} images...`);

      // Create training metadata file for AutoTrain
      const metadataContent = JSON.stringify({
        base_model: "black-forest-labs/FLUX.1-dev",
        trigger_word: identity.name.toLowerCase(),
        training_type: "lora",
        num_images: imageBlobs.length,
        steps: 500, // Reduced for faster training
        learning_rate: 0.0005, // Slightly higher to compensate
      });

      const ndjsonLines: string[] = [];
      ndjsonLines.push(
        JSON.stringify({ key: 'header', value: { summary: `Initial training data for ${identity.name}`, description: 'Uploaded via Supabase Edge Function' } })
      );

      for (let i = 0; i < imageBlobs.length; i++) {
        const ab = await imageBlobs[i].arrayBuffer();
        const base64 = toBase64(new Uint8Array(ab));
        ndjsonLines.push(
          JSON.stringify({
            key: 'file',
            value: {
              content: base64,
              path: `training_data/image_${i}.jpg`,
              encoding: 'base64',
              lfs: true,
            }
          })
        );
      }

      const metaBase64 = toBase64(new TextEncoder().encode(metadataContent));
      ndjsonLines.push(
        JSON.stringify({
          key: 'file',
          value: {
            content: metaBase64,
            path: 'training_config.json',
            encoding: 'base64',
          }
        })
      );

      console.log('Submitting commit to Hugging Face...');
      const commitResponse = await fetch(
        `https://huggingface.co/api/models/${fullRepoName}/commit/main`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/x-ndjson',
          },
          body: ndjsonLines.join('\n'),
        }
      );

      if (!commitResponse.ok) {
        const errorText = await commitResponse.text();
        console.error('Commit failed:', errorText);
        throw new Error(`Failed to commit training files: ${errorText}`);
      }

      console.log('Commit succeeded. Training files are in the repo.');
      
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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
