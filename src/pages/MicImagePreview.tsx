import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MicImagePreview = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateImage = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-mic-image');
      
      if (error) throw error;
      
      if (data?.imageUrl) {
        setImageUrl(data.imageUrl);
        toast({
          title: 'Image Generated!',
          description: 'Your vintage microphone image is ready.',
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'vintage-microphone.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Vintage Microphone Image Generator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-muted-foreground">
              Generate a photorealistic vintage metallic microphone image for the Solin orb.
            </div>
            
            <Button 
              onClick={generateImage} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Image...
                </>
              ) : (
                'Generate Microphone Image'
              )}
            </Button>

            {imageUrl && (
              <div className="space-y-4">
                <div className="border rounded-lg p-8 bg-muted/20 flex items-center justify-center">
                  <div className="space-y-4">
                    {/* Full size preview */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2 text-center">Full Size Preview:</p>
                      <img 
                        src={imageUrl} 
                        alt="Generated vintage microphone" 
                        className="max-w-md mx-auto rounded-lg shadow-lg"
                      />
                    </div>
                    
                    {/* Small circle preview (as it would appear in the orb) */}
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">As Orb Icon (128px circle):</p>
                      <div className="flex justify-center">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary shadow-xl">
                          <img 
                            src={imageUrl} 
                            alt="Microphone in circle" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={downloadImage} variant="outline" className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Download Image
                  </Button>
                  <Button onClick={generateImage} variant="outline" className="flex-1">
                    Regenerate
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  If you're happy with this image, I can add it to the Solin orb component. Just let me know!
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MicImagePreview;
