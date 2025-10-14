import { useState, useEffect } from 'react';
import { getSignedUrls } from '@/lib/storage';

/**
 * Hook to fetch signed URLs for memory images
 * @param imageUrls - Array of storage paths
 * @returns Array of signed URLs
 */
export function useMemoryImages(imageUrls: string[] | null) {
  const [signedUrls, setSignedUrls] = useState<(string | null)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSignedUrls() {
      if (!imageUrls || imageUrls.length === 0) {
        setSignedUrls([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const urls = await getSignedUrls('memory-images', imageUrls, 3600);
      setSignedUrls(urls);
      setLoading(false);
    }

    fetchSignedUrls();
  }, [imageUrls]);

  return { signedUrls, loading };
}
