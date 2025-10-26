# Train Identity Edge Function

## Overview

This Deno edge function creates HuggingFace repositories and uploads training images for identity/face model training.

## Prerequisites

1. **HuggingFace Account**: Create account at https://huggingface.co
2. **HuggingFace Token**: Generate token with write access at https://huggingface.co/settings/tokens
3. **Supabase Project**: With Edge Functions enabled

## Setup

### 1. Set Environment Variables

```bash
# Set HuggingFace token
supabase secrets set HUGGINGFACE_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxx

# Verify it's set
supabase secrets list
```

### 2. Deploy Function

```bash
# Deploy to Supabase
supabase functions deploy train-identity

# Or deploy all functions
supabase functions deploy
```

### 3. Test Locally (Optional)

```bash
# Start local Supabase
supabase start

# Serve function locally
supabase functions serve train-identity --env-file .env.local

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/train-identity' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "identityName": "Test Person",
    "imageFiles": [...],
    "userId": "user-uuid"
  }'
```

## API Reference

### Request

**Endpoint**: `POST /functions/v1/train-identity`

**Headers**:
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Body**:
```typescript
{
  identityName: string;           // Name of the person (e.g., "John", "Mom", "Me")
  imageFiles: Array<{
    name: string;                 // Original filename (e.g., "photo1.jpg")
    data: string;                 // Base64-encoded image data
  }>;
  userId: string;                 // Supabase auth user ID
}
```

**Constraints**:
- `identityName`: Required, non-empty string
- `imageFiles`: 3-40 images required
- Each image: Max 20MB, JPG/PNG format
- `userId`: Must match authenticated user

### Response

**Success (200)**:
```typescript
{
  success: true;
  repoId: string;                 // HuggingFace repo name (e.g., "identity-john-1234567890")
  modelUrl: string;               // Full URL (e.g., "https://huggingface.co/username/identity-john-1234567890")
}
```

**Error (500)**:
```typescript
{
  success: false;
  error: string;                  // Error message
}
```

## What This Function Does

### Step 1: Repository Creation
Creates a **private** HuggingFace repository with:
- Name: `identity-{sanitized-name}-{timestamp}`
- Type: Model repository
- License: MIT
- Visibility: Private

### Step 2: File Preparation
Prepares files for upload:
- **Images**: `images/image_001.jpg`, `image_002.jpg`, ... (up to 40)
- **.gitattributes**: Git LFS configuration for large files
- **training_config.json**: Training parameters (FLUX LoRA)
- **README.md**: Model documentation

### Step 3: Upload Files
Uses `@huggingface/hub` library to upload all files with:
- **Commit message**: "Upload training data for {name} ({count} images)"
- **Git LFS**: Automatic handling of large image files
- **Atomic upload**: All files in single commit

### Step 4: Database Record
Saves training record to `trained_identities` table:
```sql
INSERT INTO trained_identities (
  user_id,
  identity_name,
  model_id,
  huggingface_repo_url,
  num_training_images,
  status,
  training_config
) VALUES (...);
```

## Key Fix: commitMessage vs commitTitle

⚠️ **Important**: The `@huggingface/hub` library requires `commitMessage` (singular), not `commitTitle` and `commitDescription`.

**Correct**:
```typescript
await uploadFiles({
  repo,
  credentials,
  files,
  commitMessage: "Upload training data for John (10 images)",  // ✅ Single string
});
```

**Incorrect**:
```typescript
await uploadFiles({
  repo,
  credentials,
  files,
  commitTitle: "Upload training data",           // ❌ Doesn't exist
  commitDescription: "Training John with 10",    // ❌ Doesn't exist
});
```

This was the root cause of the error: `"✖ Invalid input: expected string, received undefined\n → at value.summary"`

## Training Configuration

The function creates a FLUX LoRA training configuration:

```json
{
  "identity_name": "John",
  "num_images": 10,
  "created_at": "2025-10-26T12:00:00Z",
  "user_id": "uuid",
  "model_type": "flux-lora",
  "training_params": {
    "steps": 1000,
    "learning_rate": 0.0004,
    "resolution": 512
  }
}
```

## Example Usage (from Frontend)

```typescript
// In Identities.tsx
const handleStartTraining = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/train-identity`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        identityName: "John",
        imageFiles: [
          { name: "photo1.jpg", data: "data:image/jpeg;base64,..." },
          { name: "photo2.jpg", data: "data:image/jpeg;base64,..." },
          { name: "photo3.jpg", data: "data:image/jpeg;base64,..." },
        ],
        userId: user.id,
      }),
    }
  );
  
  const result = await response.json();
  if (result.success) {
    console.log('Training started!', result.modelUrl);
  }
};
```

## Troubleshooting

### Error: "HUGGINGFACE_TOKEN environment variable not set"
**Solution**: Set the token using `supabase secrets set HUGGINGFACE_TOKEN=...`

### Error: "Repository already exists"
**Solution**: The function includes a timestamp in repo names to avoid collisions. If still happens, check for leftover repos.

### Error: "Failed to upload files"
**Solution**: 
1. Verify HuggingFace token has write permissions
2. Check image sizes (max 20MB each)
3. Ensure images are valid JPG/PNG

### Error: "expected string, received undefined"
**Solution**: This was fixed by using `commitMessage` instead of `commitTitle`. Verify you're using the latest version of this function.

## Files Created on HuggingFace

After successful upload, your HuggingFace repo will contain:

```
identity-john-1234567890/
├── images/
│   ├── image_001.jpg
│   ├── image_002.jpg
│   ├── image_003.jpg
│   └── ... (up to image_040.jpg)
├── .gitattributes          # Git LFS configuration
├── training_config.json    # Training parameters
└── README.md              # Model documentation
```

## Security

- **Private repositories**: All repos are created as private by default
- **Row Level Security**: Database queries filtered by `auth.uid()`
- **Authentication required**: All requests must include valid Supabase access token
- **User isolation**: Users can only access their own identities

## Next Steps

After training data is uploaded:
1. **Trigger training**: Use HuggingFace API or webhooks to start actual model training
2. **Monitor status**: Poll or use webhooks to update `status` field in database
3. **Use model**: Reference `model_id` in FLUX image generation for personalized images

## Support

For issues or questions:
- Check `HUGGINGFACE_INTEGRATION_FIX.md` for detailed troubleshooting
- Review edge function logs: `supabase functions logs train-identity`
- Test locally with `supabase functions serve`
