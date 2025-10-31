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
    const { memoryId, title, text, location, keywords } = await req.json();

    console.log('Fetching image for memory:', memoryId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if memory already has an image
    const { data: existingMemory } = await supabase
      .from('memories')
      .select('image_urls')
      .eq('id', memoryId)
      .single();

    if (existingMemory?.image_urls && existingMemory.image_urls.length > 0) {
      console.log('Memory already has images, skipping');
      return new Response(
        JSON.stringify({ message: 'Memory already has images' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract keywords from title, location, or text
    const searchTerms = extractKeywords(title, text, location, keywords);
    console.log('Search terms:', searchTerms);

    // Use Pexels API for free high-quality stock photos (1920x1080)
    const pexelsApiKey = Deno.env.get('PEXELS_API_KEY');
    
    if (!pexelsApiKey) {
      throw new Error('PEXELS_API_KEY not configured');
    }

    const pexelsUrl = `https://api.pexels.com/v1/search?query=${searchTerms}&per_page=1&orientation=landscape`;
    
    console.log('Fetching image from Pexels:', pexelsUrl);

    const pexelsResponse = await fetch(pexelsUrl, {
      headers: {
        'Authorization': pexelsApiKey
      }
    });

    if (!pexelsResponse.ok) {
      throw new Error(`Pexels API error: ${pexelsResponse.statusText}`);
    }

    const pexelsData = await pexelsResponse.json();
    
    if (!pexelsData.photos || pexelsData.photos.length === 0) {
      throw new Error('No images found for search terms');
    }

    // Get the large image URL (1920x1080)
    const imageUrl = pexelsData.photos[0].src.large2x;
    const finalImageUrl = imageUrl;
    
    console.log('Fetching image from:', imageUrl);

    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageBlob = await imageResponse.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();

    // Upload to Supabase Storage
    const fileName = `${memoryId}-${Date.now()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('memory-images')
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('Image uploaded successfully:', uploadData.path);

    // Update memory with image URL
    const { error: updateError } = await supabase
      .from('memories')
      .update({ 
        image_urls: [uploadData.path]
      })
      .eq('id', memoryId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log('Memory updated with image');

    return new Response(
      JSON.stringify({ 
        success: true, 
        imagePath: uploadData.path,
        sourceUrl: finalImageUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-memory-image:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function extractKeywords(
  title: string, 
  text: string | null, 
  location: string | null,
  keywords: string[] | null
): string {
  // Priority: location > keywords > title key terms
  if (location) {
    return encodeURIComponent(location.replace(/[^\w\s]/gi, ' ').trim());
  }

  if (keywords && keywords.length > 0) {
    return encodeURIComponent(keywords.slice(0, 3).join(' '));
  }

  // Extract meaningful words from title (ignore common words)
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from'];
  const titleWords = title
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word))
    .slice(0, 3);

  return encodeURIComponent(titleWords.join(' ')) || 'memory life moment';
}
