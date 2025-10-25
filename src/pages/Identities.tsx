import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Loader2, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TrainedIdentity {
  id: string;
  name: string;
  hf_model_id: string | null;
  hf_repo_name: string | null;
  training_status: "pending" | "uploading" | "training" | "completed" | "failed";
  training_error: string | null;
  created_at: string;
  training_completed_at: string | null;
  thumbnail_url: string | null;
  num_training_images: number | null;
}

const Identities = () => {
  const [identityName, setIdentityName] = useState("");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [consentChecked, setConsentChecked] = useState(false);
  
  const [trainedIdentities, setTrainedIdentities] = useState<TrainedIdentity[]>([]);

  // Load trained identities from database
  useEffect(() => {
    loadTrainedIdentities();
  }, []);

  const loadTrainedIdentities = async () => {
    try {
      const { data, error } = await supabase
        .from('trained_identities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrainedIdentities(data || []);
    } catch (error) {
      console.error('Error loading identities:', error);
      toast.error('Failed to load identities');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (uploadedImages.length + files.length > 40) {
      toast.error("Maximum 40 photos allowed");
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 20MB)`);
        return false;
      }
      if (!file.type.match(/^image\/(jpeg|png)$/)) {
        toast.error(`${file.name} must be JPG or PNG`);
        return false;
      }
      return true;
    });

    setUploadedImages(prev => [...prev, ...validFiles]);
    
    validFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      setImagePreviews(prev => [...prev, url]);
    });
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartTraining = async () => {
    if (!identityName.trim()) {
      toast.error("Please provide an identity name");
      return;
    }

    if (uploadedImages.length < 3) {
      toast.error("Please upload at least 3 photos");
      return;
    }

    if (!consentChecked) {
      toast.error("Please confirm consent to use these images");
      return;
    }

    setIsTraining(true);
    setTrainingProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Step 1: Create identity record
      setTrainingProgress(10);
      const { data: identity, error: createError } = await supabase
        .from('trained_identities')
        .insert({
          user_id: user.id,
          name: identityName,
          training_status: 'uploading',
          num_training_images: uploadedImages.length,
          thumbnail_url: imagePreviews[0],
        })
        .select()
        .single();

      if (createError) throw createError;

      // Step 2: Upload images to Supabase Storage
      setTrainingProgress(20);
      const storagePaths: string[] = [];
      
      for (let i = 0; i < uploadedImages.length; i++) {
        const file = uploadedImages[i];
        const filePath = `${user.id}/${identity.id}/image_${i}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('identity-training-images')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        storagePaths.push(filePath);
        setTrainingProgress(20 + (i / uploadedImages.length) * 30);
      }

      // Step 3: Update identity with storage paths
      await supabase
        .from('trained_identities')
        .update({ image_storage_paths: storagePaths })
        .eq('id', identity.id);

      setTrainingProgress(50);

      // Step 4: Start training via edge function
      const { data: trainingData, error: trainingError } = await supabase.functions.invoke(
        'train-identity',
        {
          body: {
            identityId: identity.id,
            action: 'start_training'
          }
        }
      );

      if (trainingError) throw trainingError;

      setTrainingProgress(60);

      // Step 5: Poll for training completion
      const pollInterval = setInterval(async () => {
        const { data: statusData } = await supabase.functions.invoke(
          'train-identity',
          {
            body: {
              identityId: identity.id,
              action: 'check_status'
            }
          }
        );

        if (statusData?.training_status === 'completed') {
          clearInterval(pollInterval);
          setTrainingProgress(100);
          toast.success(`✅ Identity "${identityName}" is now trained! Use it in Reconstruction.`, {
            duration: 5000
          });
          
          // Reset form
          setIdentityName("");
          setUploadedImages([]);
          imagePreviews.forEach(url => URL.revokeObjectURL(url));
          setImagePreviews([]);
          setConsentChecked(false);
          setIsTraining(false);
          setTrainingProgress(0);
          
          // Reload identities
          loadTrainedIdentities();
        } else if (statusData?.training_status === 'failed') {
          clearInterval(pollInterval);
          throw new Error(statusData.training_error || 'Training failed');
        } else {
          // Still training, update progress
          setTrainingProgress(prev => Math.min(prev + 2, 95));
        }
      }, 5000); // Check every 5 seconds

      // Timeout after 30 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isTraining) {
          toast.error("Training timeout. Check status in HuggingFace.");
          setIsTraining(false);
        }
      }, 30 * 60 * 1000);

    } catch (error) {
      console.error('Training error:', error);
      toast.error(error.message || "Training failed. Please try again.");
      setIsTraining(false);
      setTrainingProgress(0);
    }
  };

  const handleDeleteIdentity = async (id: string) => {
    try {
      const { error } = await supabase
        .from('trained_identities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Identity deleted");
      loadTrainedIdentities();
    } catch (error) {
      console.error('Error deleting identity:', error);
      toast.error("Failed to delete identity");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold mb-3 text-foreground">
            Train the characters in your life
          </h1>
          <p className="text-muted-foreground">
            Upload 3–40 clear photos of one person so Solon can learn their look.
          </p>
        </div>

        {/* Upload Panel */}
        <Card className="p-6 mb-8 bg-card border-2">
          <div className="space-y-6">
            {/* Identity Name */}
            <div className="space-y-2">
              <Label htmlFor="identity-name" className="text-sm font-medium">
                Identity Name
              </Label>
              <Input
                id="identity-name"
                placeholder="e.g., Dad, Mom, Me"
                value={identityName}
                onChange={(e) => setIdentityName(e.target.value)}
                disabled={isTraining}
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Photos ({uploadedImages.length}/40)
              </Label>
              
              {uploadedImages.length === 0 ? (
                <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
                  <Input
                    id="photos-upload"
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isTraining}
                  />
                  <label htmlFor="photos-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drop photos here or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPG/PNG • Max 20MB each • 3-40 photos required
                    </p>
                  </label>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {imagePreviews.map((url, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={url} 
                          alt={`Upload ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-lg border-2 border-border"
                        />
                        {!isTraining && (
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    {uploadedImages.length < 40 && !isTraining && (
                      <div className="border-2 border-dashed border-muted rounded-lg aspect-square flex items-center justify-center hover:border-primary/50 transition-colors">
                        <Input
                          id="add-more"
                          type="file"
                          accept="image/jpeg,image/png"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <label htmlFor="add-more" className="cursor-pointer text-center p-2">
                          <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Add more</p>
                        </label>
                      </div>
                    )}
                  </div>

                  {uploadedImages.length < 3 && (
                    <p className="text-sm text-amber-600 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {3 - uploadedImages.length} more photos needed (minimum 3)
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Tips */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2 font-medium">
                💡 Training Tips:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Include different angles, lighting, and expressions</li>
                <li>Use clear, high-quality photos</li>
                <li>Avoid group photos or heavy filters</li>
                <li>Mix indoor and outdoor shots</li>
              </ul>
            </div>

            {/* Consent */}
            <div className="flex items-start space-x-3 pt-2">
              <Checkbox 
                id="consent" 
                checked={consentChecked}
                onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
                disabled={isTraining}
              />
              <Label htmlFor="consent" className="text-sm cursor-pointer leading-tight">
                I have rights to these images and consent to training. 
                <span className="block text-muted-foreground mt-1">
                  Images stay private and are used only for model training.
                </span>
              </Label>
            </div>

            {/* Training Progress */}
            {isTraining && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Training in progress...</span>
                  <span className="font-medium">{trainingProgress}%</span>
                </div>
                <Progress value={trainingProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  This usually takes ~10 minutes. You can close this page.
                </p>
              </div>
            )}

            {/* Start Training Button */}
            <Button
              onClick={handleStartTraining}
              disabled={uploadedImages.length < 3 || !identityName.trim() || !consentChecked || isTraining}
              className="w-full"
              size="lg"
            >
              {isTraining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Training Model...
                </>
              ) : (
                "Start Training"
              )}
            </Button>
          </div>
        </Card>

        {/* Trained Identities List */}
        {trainedIdentities.length > 0 && (
          <div>
            <h2 className="text-2xl font-serif font-bold mb-4">Your Identities</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {trainedIdentities.map((identity) => (
                <Card key={identity.id} className="p-4 bg-card border-2">
                  <div className="flex gap-4">
                  <img 
                      src={identity.thumbnail_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'} 
                      alt={identity.name}
                      className="w-20 h-20 object-cover rounded-lg border-2 border-border"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{identity.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {identity.hf_repo_name || 'Pending'}
                          </p>
                        </div>
                        <Badge 
                          variant={identity.training_status === "completed" ? "default" : "secondary"}
                          className="flex items-center gap-1"
                        >
                          {identity.training_status === "completed" && <Check className="w-3 h-3" />}
                          {identity.training_status === "training" && <Loader2 className="w-3 h-3 animate-spin" />}
                          {identity.training_status === "failed" && <AlertCircle className="w-3 h-3" />}
                          {identity.training_status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {identity.training_completed_at 
                          ? `Trained ${new Date(identity.training_completed_at).toLocaleDateString()}`
                          : `Created ${new Date(identity.created_at).toLocaleDateString()}`
                        }
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.location.href = '/reconstruction'}
                        >
                          Use in Reconstruction
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDeleteIdentity(identity.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Identities;
