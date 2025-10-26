# HuggingFace Integration Fix: uploadFiles() Commit Message Error

## Problem Statement

When calling `uploadFiles()` from `@huggingface/hub` (v0.15.1), we were getting the error:

```
Commit failed: {"error":"✖ Invalid input: expected string, received undefined\n → at value.summary"}
```

This occurred even though we were passing `commitTitle` and `commitDescription` as string parameters.

## Root Cause Analysis

The `@huggingface/hub` library's `uploadFiles()` function expects **`commitMessage`** as a single string parameter, NOT separate `commitTitle` and `commitDescription` parameters.

### Incorrect Usage ❌

```typescript
await uploadFiles({
  repo,
  credentials,
  files,
  commitTitle: "Upload training data",           // ❌ WRONG - doesn't exist
  commitDescription: "Training with 10 images",  // ❌ WRONG - doesn't exist
});
```

### Correct Usage ✅

```typescript
await uploadFiles({
  repo,
  credentials,
  files,
  commitMessage: "Upload training data for John (10 images)",  // ✅ CORRECT
});
```

## The Fix

### File: `supabase/functions/train-identity/index.ts`

**Lines 210-233** (the upload section):

```typescript
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
```

## API Reference

### `uploadFiles()` Function Signature

From `@huggingface/hub` library (v0.15.1):

```typescript
interface UploadFilesOptions {
  repo: RepoDesignation;
  credentials: Credentials;
  files: Array<{
    path: string;
    content: Uint8Array;
  }>;
  commitMessage?: string;  // ✅ Single string for commit message
  branch?: string;
  parentCommit?: string;
}
```

**Key Point**: The parameter is `commitMessage` (singular), not `commitTitle` or `commitDescription`.

## Complete Integration Flow

### 1. Repository Creation (Lines 162-170)

```typescript
const repo: RepoDesignation = {
  type: 'model',
  name: repoName,
};

await createRepo({
  repo,
  credentials,
  license: 'mit',
  private: true,
});
```

### 2. File Preparation (Lines 176-208)

```typescript
const files: Array<{ path: string; content: Uint8Array }> = [];

// Add training images
for (let i = 0; i < imageFiles.length; i++) {
  const imageFile = imageFiles[i];
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

  files.push({ path: fileName, content: bytes });
}

// Add .gitattributes for Git LFS
files.push({
  path: '.gitattributes',
  content: new TextEncoder().encode('*.jpg filter=lfs diff=lfs merge=lfs -text\n...')
});

// Add training_config.json
files.push({
  path: 'training_config.json',
  content: new TextEncoder().encode(JSON.stringify(trainingConfig, null, 2))
});

// Add README.md
files.push({
  path: 'README.md',
  content: new TextEncoder().encode(readme)
});
```

### 3. Upload with Correct Commit Message (Lines 210-233)

```typescript
const uploadResult = await uploadFiles({
  repo,
  credentials,
  files,
  commitMessage: `Upload training data for ${identityName} (${imageFiles.length} images)`,
});
```

## Testing the Fix

### 1. Environment Setup

Set the HuggingFace token in your Supabase Edge Function secrets:

```bash
supabase secrets set HUGGINGFACE_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxx
```

### 2. Test Request

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/train-identity`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      identityName: "Test Person",
      imageFiles: [
        { name: "photo1.jpg", data: "base64_data_here..." },
        { name: "photo2.jpg", data: "base64_data_here..." },
        { name: "photo3.jpg", data: "base64_data_here..." },
      ],
      userId: user.id,
    }),
  }
);

const result = await response.json();
console.log('Training result:', result);
// Expected: { success: true, repoId: "identity-test-person-123", modelUrl: "https://huggingface.co/..." }
```

### 3. Verify on HuggingFace

1. Go to https://huggingface.co/USERNAME/REPO_NAME
2. Check the commit history - should see: "Upload training data for Test Person (3 images)"
3. Verify files:
   - `images/image_001.jpg`
   - `images/image_002.jpg`
   - `images/image_003.jpg`
   - `.gitattributes`
   - `training_config.json`
   - `README.md`

## Error Handling

### Common Issues and Solutions

#### Issue 1: "expected string, received undefined"
**Cause**: Using `commitTitle` and `commitDescription` instead of `commitMessage`  
**Solution**: Use single `commitMessage` parameter (fixed above)

#### Issue 2: "Repository already exists"
**Cause**: Repo name collision  
**Solution**: Add timestamp to repo name: `identity-${name}-${Date.now()}`

#### Issue 3: "Invalid credentials"
**Cause**: HuggingFace token not set or invalid  
**Solution**: Set token in Supabase secrets: `supabase secrets set HUGGINGFACE_TOKEN=...`

#### Issue 4: "File too large for Git LFS"
**Cause**: Images over 20MB each  
**Solution**: Validate file size on frontend (already implemented in Identities.tsx)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Identities.tsx                          │
│  • User uploads 3-40 photos                                 │
│  • Client-side validation (size, format)                    │
│  • Convert to base64                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Supabase Edge Function: train-identity              │
│  1. Validate inputs (3-40 images, name required)            │
│  2. Create HuggingFace repo (private, MIT license)          │
│  3. Prepare files:                                          │
│     • images/image_001.jpg ... image_040.jpg                │
│     • .gitattributes (Git LFS config)                       │
│     • training_config.json (FLUX LoRA params)               │
│     • README.md (model documentation)                       │
│  4. Upload with uploadFiles() ✅ commitMessage fix          │
│  5. Save record to trained_identities table                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  HuggingFace Repository                     │
│  https://huggingface.co/USERNAME/identity-name-123          │
│  • Private model repository                                 │
│  • Images stored with Git LFS                               │
│  • Ready for FLUX LoRA training                             │
│  • Training config available for reference                  │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Table: `trained_identities`

```sql
CREATE TABLE trained_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_name TEXT NOT NULL,
  model_id TEXT NOT NULL UNIQUE,              -- HuggingFace repo name
  huggingface_repo_url TEXT NOT NULL,          -- Full URL to repo
  num_training_images INTEGER NOT NULL CHECK (num_training_images BETWEEN 3 AND 40),
  status TEXT NOT NULL DEFAULT 'training',     -- 'training' | 'ready' | 'failed'
  training_config JSONB,                       -- FLUX LoRA params
  thumbnail_url TEXT,                          -- First image preview
  version TEXT DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trained_at TIMESTAMPTZ,
  error_message TEXT
);
```

## Next Steps

### 1. Add Webhook for Training Completion

HuggingFace can send webhooks when training completes. Add endpoint to update status:

```typescript
// supabase/functions/huggingface-webhook/index.ts
const { repoId, status } = await req.json();

await supabase
  .from('trained_identities')
  .update({ 
    status: status === 'completed' ? 'ready' : 'failed',
    trained_at: new Date().toISOString()
  })
  .eq('model_id', repoId);
```

### 2. Integrate with FLUX Image Generation

Use trained identity in Reconstruction page:

```typescript
const generateImageWithIdentity = async (prompt: string, identityId: string) => {
  const { data: identity } = await supabase
    .from('trained_identities')
    .select('model_id, huggingface_repo_url')
    .eq('id', identityId)
    .single();

  // Use identity.model_id as LoRA reference in FLUX generation
  const image = await generateFluxImage({
    prompt: prompt,
    lora: identity.model_id,
    lora_scale: 0.8
  });
};
```

### 3. Add Thumbnail Generation

Extract first frame as thumbnail after upload:

```typescript
// After upload succeeds, generate thumbnail
const thumbnailUrl = await generateThumbnail(imageFiles[0]);

await supabase
  .from('trained_identities')
  .update({ thumbnail_url: thumbnailUrl })
  .eq('model_id', repoName);
```

## Summary

**Problem**: `uploadFiles()` was rejecting commits with "expected string, received undefined" error  
**Root Cause**: Using non-existent parameters `commitTitle` and `commitDescription`  
**Solution**: Use single `commitMessage` parameter as specified in `@huggingface/hub` API  
**Status**: ✅ Fixed in `supabase/functions/train-identity/index.ts` line 219

The fix is minimal but critical - changing two parameters to one resolves the entire issue.
