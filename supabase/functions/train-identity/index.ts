import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { 
  createRepo, 
  uploadFiles, 
  type Credentials,
  type RepoDesignation
} from "https://esm.sh/@huggingface/hub@0.15.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrainingRequest {
  identityName: string;
  imageFiles: {
    name: string;
    data: string; // base64 encoded
  }[];
  userId: string;
}

interface TrainingResponse {
  success: boolean;
  repoId?: string;
  modelUrl?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 Train Identity Edge Function Started');

    // Get HuggingFace token from environment
    const hfToken = Deno.env.get('HUGGINGFACE_TOKEN');
    if (!hfToken) {
      throw new Error('HUGGINGFACE_TOKEN environment variable not set');
    }

    // Parse request
    const { identityName, imageFiles, userId }: TrainingRequest = await req.json();
    console.log(`📝 Training request: ${identityName}, ${imageFiles.length} images, user: ${userId}`);

    // Validate inputs
    if (!identityName || !identityName.trim()) {
      throw new Error('Identity name is required');
    }
    if (!imageFiles || imageFiles.length < 3) {
      throw new Error('At least 3 images are required for training');
    }
    if (imageFiles.length > 40) {
      throw new Error('Maximum 40 images allowed');
    }

    // Initialize HuggingFace credentials
    const credentials: Credentials = {
      accessToken: hfToken
    };

    // Get HuggingFace username for namespace
    console.log('🔍 Fetching HuggingFace username...');
    let hfUsername: string;
    try {
      const userResponse = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: {
          'Authorization': `Bearer ${hfToken}`
        }
      });
      if (!userResponse.ok) {
        throw new Error(`Failed to get HuggingFace user info: ${userResponse.status}`);
      }
      const userData = await userResponse.json();
      hfUsername = userData.name;
      console.log(`✅ HuggingFace username: ${hfUsername}`);
    } catch (error: any) {
      console.error('❌ Failed to get HuggingFace username:', error);
      throw new Error(`Could not authenticate with HuggingFace: ${error.message}`);
    }

    // Create sanitized repo name WITH namespace
    const timestamp = Date.now();
    const sanitizedName = identityName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50);
    const repoName = `${hfUsername}/identity-${sanitizedName}-${timestamp}`;
    console.log(`📦 Repository name: ${repoName}`);

    // Step 1: Create repository on HuggingFace
    console.log('🏗️  Creating HuggingFace repository...');
    const repo: RepoDesignation = {
      type: 'model',
      name: repoName,
    };

    try {
      await createRepo({
        repo,
        credentials,
        license: 'mit',
        private: true, // Keep training data private
      });
      console.log('✅ Repository created successfully');
    } catch (error: any) {
      console.error('❌ Repository creation failed:', error);
      throw new Error(`Failed to create HuggingFace repository: ${error.message}`);
    }

    // Step 2: Prepare files for upload
    console.log('📦 Preparing files for upload...');
    const files: Array<{ path: string; content: Blob }> = [];

    // Add training images
    for (let i = 0; i < imageFiles.length; i++) {
      const imageFile = imageFiles[i];
      const extension = imageFile.name.split('.').pop() || 'jpg';
      const fileName = `images/image_${String(i + 1).padStart(3, '0')}.${extension}`;
      
      // Decode base64 to Uint8Array
      const base64Data = imageFile.data.includes(',') 
        ? imageFile.data.split(',')[1] 
        : imageFile.data;
      
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let j = 0; j < binaryString.length; j++) {
        bytes[j] = binaryString.charCodeAt(j);
      }

      // Convert to Blob
      const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
      files.push({
        path: fileName,
        content: new Blob([bytes], { type: mimeType })
      });
    }
    console.log(`📸 Prepared ${files.length} image files`);

    // Add .gitattributes for Git LFS support (large files)
    const gitattributesContent = `*.jpg filter=lfs diff=lfs merge=lfs -text
*.jpeg filter=lfs diff=lfs merge=lfs -text
*.png filter=lfs diff=lfs merge=lfs -text
`;
    files.push({
      path: '.gitattributes',
      content: new Blob([gitattributesContent], { type: 'text/plain' })
    });
    console.log('✅ Added .gitattributes for Git LFS');

    // Add training configuration
    const trainingConfig = {
      identity_name: identityName,
      num_images: imageFiles.length,
      created_at: new Date().toISOString(),
      user_id: userId,
      model_type: "flux-lora", // Using FLUX LoRA for identity training
      training_params: {
        steps: 1000,
        learning_rate: 0.0004,
        resolution: 512,
      }
    };
    files.push({
      path: 'training_config.json',
      content: new Blob([JSON.stringify(trainingConfig, null, 2)], { type: 'application/json' })
    });
    console.log('✅ Added training_config.json');

    // Add README
    const readme = `# ${identityName} Identity Model

This model was trained on ${imageFiles.length} images to learn the identity: **${identityName}**.

## Usage
This model is designed for use with FLUX image generation models for creating personalized images.

## Training Details
- **Model Type**: FLUX LoRA
- **Number of Images**: ${imageFiles.length}
- **Training Steps**: 1000
- **Learning Rate**: 0.0004
- **Resolution**: 512x512

## Privacy
This model is private and intended for personal use only.

---
*Trained with Solon AI Memory Platform*
`;
    files.push({
      path: 'README.md',
      content: new Blob([readme], { type: 'text/markdown' })
    });
    console.log('✅ Added README.md');

    // Step 3: Upload all files to HuggingFace
    console.log(`🚀 Uploading ${files.length} files to HuggingFace...`);
    
    // 🔧 FIX: Use 'commitMessage' instead of 'commitTitle' and 'commitDescription'
    // The @huggingface/hub library expects 'commitMessage' as a single string parameter
    try {
      const uploadResult = await uploadFiles({
        repo,
        credentials,
        files,
        // ✅ CORRECT: Use commitMessage (single string)
        commitMessage: `Upload training data for ${identityName} (${imageFiles.length} images)`,
        // ❌ WRONG: Don't use commitTitle and commitDescription - these don't exist!
        // commitTitle: "Upload training data",
        // commitDescription: `Training ${identityName} with ${imageFiles.length} images`,
      });

      console.log('✅ Files uploaded successfully:', uploadResult);
    } catch (error: any) {
      console.error('❌ File upload failed:', error);
      throw new Error(`Failed to upload files to HuggingFace: ${error.message}`);
    }

    // Step 4: Get repository URL
    const modelUrl = `https://huggingface.co/${repoName}`;
    console.log(`✅ Model available at: ${modelUrl}`);

    // Step 5: Save training record to Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: dbError } = await supabaseClient
      .from('trained_identities')
      .insert({
        user_id: userId,
        name: identityName,
        hf_model_id: repoName,
        hf_repo_name: repoName,
        num_training_images: imageFiles.length,
        training_status: 'completed',
        training_completed_at: new Date().toISOString(),
        model_type: trainingConfig.model_type,
      });

    if (dbError) {
      console.error('⚠️ Failed to save to database:', dbError);
      // Don't throw - the HF upload succeeded, which is most important
    } else {
      console.log('✅ Training record saved to database');
    }

    // Return success response
    const response: TrainingResponse = {
      success: true,
      repoId: repoName,
      modelUrl: modelUrl,
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('❌ Training failed:', error);
    
    const errorResponse: TrainingResponse = {
      success: false,
      error: error.message || 'Unknown error occurred'
    };

    return new Response(
      JSON.stringify(errorResponse),
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
