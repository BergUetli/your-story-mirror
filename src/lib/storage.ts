import { supabase } from '@/integrations/supabase/client';

/**
 * Get a signed URL for a private storage object
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns The signed URL or null if error
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error in getSignedUrl:', error);
    return null;
  }
}

/**
 * Get signed URLs for multiple files
 * @param bucket - The storage bucket name
 * @param paths - Array of file paths
 * @param expiresIn - Expiration time in seconds
 * @returns Array of signed URLs (null for failed items)
 */
export async function getSignedUrls(
  bucket: string,
  paths: string[],
  expiresIn: number = 3600
): Promise<(string | null)[]> {
  const promises = paths.map(path => getSignedUrl(bucket, path, expiresIn));
  return Promise.all(promises);
}
