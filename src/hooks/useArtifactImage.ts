import { useState, useEffect } from 'react';
import { getSignedUrl } from '@/lib/storage';

/**
 * Hook to fetch a signed URL for a single artifact image
 * @param storagePath - The storage path of the artifact
 * @returns The signed URL
 */
export function useArtifactImage(storagePath: string | null) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSignedUrl() {
      if (!storagePath) {
        setSignedUrl(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const url = await getSignedUrl('memory-images', storagePath, 3600);
      setSignedUrl(url);
      setLoading(false);
    }

    fetchSignedUrl();
  }, [storagePath]);

  return { signedUrl, loading };
}
