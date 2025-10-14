import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RecentReconstruction {
  id: string;
  imageUrl: string;
  prompt: string;
  timestamp: Date;
}

type ReconstructionMode = "sketch" | "photoreal";
type SketchStyle = "pencil_sketch" | "charcoal" | "soft_sepia" | "dreamlike_ink";
type PhotorealLens = "35mm" | "50mm" | "85mm";
type PhotorealStyle = "documentary" | "cinematic" | "portrait";

const Reconstruction = () => {
  const [mode, setMode] = useState<ReconstructionMode>("sketch");
  const [memoryPrompt, setMemoryPrompt] = useState("");
  const [style, setStyle] = useState<SketchStyle>("pencil_sketch");
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [lockFace, setLockFace] = useState(false);
  const [selectedIdentities, setSelectedIdentities] = useState<string[]>([]);
  const [lens, setLens] = useState<PhotorealLens>("35mm");
  const [photorealStyle, setPhotorealStyle] = useState<PhotorealStyle>("documentary");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [generatedTime, setGeneratedTime] = useState<Date | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [recentReconstructions, setRecentReconstructions] = useState<RecentReconstruction[]>([]);
  
  // Mock trained identities (would come from API/database)
  const trainedIdentities = [
    { id: "me_v1", name: "Me", status: "ready" },
    { id: "dad_v1", name: "Dad", status: "ready" }
  ];

  const handleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be less than 20MB");
      return;
    }
    
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      toast.error("Only JPG and PNG files are supported");
      return;
    }
    
    setReferenceImage(file);
    setReferenceImageUrl(URL.createObjectURL(file));
  };

  const removeReferenceImage = () => {
    setReferenceImage(null);
    if (referenceImageUrl) {
      URL.revokeObjectURL(referenceImageUrl);
      setReferenceImageUrl(null);
    }
    setLockFace(false);
  };

  const toggleIdentity = (identityId: string) => {
    setSelectedIdentities(prev => 
      prev.includes(identityId) 
        ? prev.filter(id => id !== identityId)
        : [...prev, identityId]
    );
  };

  const normalizePrompt = () => {
    let basePrompt = "";
    let negativePrompt = "";
    
    if (mode === "sketch") {
      basePrompt = "pencil sketch, graphite on textured paper, 4:3 aspect ratio, soft shading, cinematic composition, nostalgic memory reconstruction, no text, no watermark, ";
      negativePrompt = "photorealistic, color, 3d render, watermark, text, logo, distorted face";
    } else {
      basePrompt = "ultra-detailed 2D photoreal portrait, natural skin texture, 35mm lens, soft window light, realistic lighting, cinematic grading, ";
      negativePrompt = "sketch, drawing, cartoon, 3d render, watermark, text, logo, distorted face, unrealistic";
    }
    
    return {
      prompt: basePrompt + memoryPrompt.trim(),
      negative_prompt: negativePrompt
    };
  };

  const handleGenerate = async () => {
    if (!memoryPrompt.trim() || memoryPrompt.split(' ').filter(w => w).length < 10) {
      toast.error("Please provide at least 10 words to describe your memory.");
      return;
    }

    setIsGenerating(true);
    toast.success("Solon is drawing what you described…");
    
    try {
      const { prompt, negative_prompt } = normalizePrompt();
      
      const payload: any = {
        requestId: crypto.randomUUID(),
        mode,
        memoryPrompt: memoryPrompt.trim(),
        style: mode === "sketch" ? style : undefined,
        prompt,
        negative_prompt,
        seed: Math.floor(Math.random() * 1000000),
        aspect_ratio: "4:3"
      };

      if (mode === "photoreal") {
        payload.identities = selectedIdentities;
        payload.lora_weights = selectedIdentities.reduce((acc, id) => {
          acc[id] = 0.7;
          return acc;
        }, {} as Record<string, number>);
        payload.camera = {
          lens_mm: parseInt(lens.replace('mm', '')),
          style: photorealStyle
        };
      }

      if (referenceImage && lockFace) {
        // Upload reference image to storage
        const fileExt = referenceImage.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('memory-images')
          .upload(`references/${fileName}`, referenceImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('memory-images')
          .getPublicUrl(`references/${fileName}`);

        payload.face_lock = true;
        payload.face_image_url = urlData.publicUrl;
      }

      const { data, error } = await supabase.functions.invoke('generate-memory-sketch', {
        body: payload
      });

      if (error) {
        console.error('Error calling function:', error);
        throw error;
      }

      if (!data?.imageUrl) {
        throw new Error('No image URL returned');
      }

      setGeneratedImage(data.imageUrl);
      setGeneratedPrompt(memoryPrompt);
      setGeneratedTime(new Date());

      // Add to recent reconstructions
      const newReconstruction: RecentReconstruction = {
        id: crypto.randomUUID(),
        imageUrl: data.imageUrl,
        prompt: memoryPrompt,
        timestamp: new Date()
      };
      
      setRecentReconstructions(prev => [newReconstruction, ...prev].slice(0, 4));
      
      toast.success("Your memory has been sketched.");
    } catch (error) {
      console.error('Generation error:', error);
      toast.error("Solon can't draw this memory right now. Try again later.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    setMemoryPrompt("");
    setGeneratedImage(null);
    setGeneratedPrompt("");
    setGeneratedTime(null);
    setRefinePrompt("");
    removeReferenceImage();
    setSelectedIdentities([]);
  };

  const handleRegenerate = () => {
    if (refinePrompt.trim()) {
      setMemoryPrompt(refinePrompt);
      handleGenerate();
    }
  };

  const wordCount = memoryPrompt.trim().split(/\s+/).filter(w => w).length;
  const canGenerate = wordCount >= 10 && !isGenerating;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold mb-3 text-foreground">
            Reconstruct a Memory
          </h1>
          <p className="text-muted-foreground mb-2">
            Describe a moment; Solon will visualize it as art or photoreal scene.
          </p>
          <p className="text-sm italic text-muted-foreground mb-4">
            "Every memory has its own light."
          </p>
          
          {/* Mode Toggle */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as ReconstructionMode)} className="w-fit mx-auto">
            <TabsList>
              <TabsTrigger value="sketch">Sketch</TabsTrigger>
              <TabsTrigger value="photoreal">
                Photoreal <Badge variant="secondary" className="ml-1 text-xs">Premium</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6 bg-card border-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Describe the scene
                  </Label>
                  <Textarea
                    id="description"
                    value={memoryPrompt}
                    onChange={(e) => setMemoryPrompt(e.target.value)}
                    placeholder="Include details like time of day, place, colors, people, mood..."
                    className="min-h-[120px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {wordCount} words (minimum 10 required)
                  </p>
                </div>

                {/* Reference Face Photo */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Reference Face Photo <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  {!referenceImageUrl ? (
                    <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <Input
                        id="reference-upload"
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleReferenceImageChange}
                        className="hidden"
                      />
                      <label htmlFor="reference-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Upload JPG/PNG ≤ 20 MB
                        </p>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img 
                        src={referenceImageUrl} 
                        alt="Reference" 
                        className="w-full h-32 object-cover rounded-lg border-2 border-border"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={removeReferenceImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  {referenceImageUrl && (
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox 
                        id="lock-face" 
                        checked={lockFace}
                        onCheckedChange={(checked) => setLockFace(checked as boolean)}
                      />
                      <Label htmlFor="lock-face" className="text-sm cursor-pointer">
                        Lock face from reference
                      </Label>
                    </div>
                  )}
                </div>

                {/* Style Selector - only for Sketch mode */}
                {mode === "sketch" && (
                  <div className="space-y-2">
                    <Label htmlFor="style" className="text-sm font-medium">
                      Artistic Style
                    </Label>
                    <Select value={style} onValueChange={(v) => setStyle(v as SketchStyle)}>
                      <SelectTrigger id="style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pencil_sketch">Pencil Sketch</SelectItem>
                        <SelectItem value="charcoal">Charcoal</SelectItem>
                        <SelectItem value="soft_sepia">Soft Sepia</SelectItem>
                        <SelectItem value="dreamlike_ink">Dreamlike Ink</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Identity Chips - only for Photoreal mode */}
                {mode === "photoreal" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Trained Identities <Badge variant="secondary" className="ml-1">Premium</Badge>
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {trainedIdentities.map((identity) => (
                        <Badge
                          key={identity.id}
                          variant={selectedIdentities.includes(identity.id) ? "default" : "outline"}
                          className="cursor-pointer px-3 py-1"
                          onClick={() => toggleIdentity(identity.id)}
                        >
                          {identity.name}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Train identities in Settings → Identities
                    </p>
                  </div>
                )}

                {/* Lens & Look - only for Photoreal mode */}
                {mode === "photoreal" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lens" className="text-sm font-medium">
                        Lens
                      </Label>
                      <Select value={lens} onValueChange={(v) => setLens(v as PhotorealLens)}>
                        <SelectTrigger id="lens">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="35mm">35 mm</SelectItem>
                          <SelectItem value="50mm">50 mm</SelectItem>
                          <SelectItem value="85mm">85 mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="photoreal-style" className="text-sm font-medium">
                        Look
                      </Label>
                      <Select value={photorealStyle} onValueChange={(v) => setPhotorealStyle(v as PhotorealStyle)}>
                        <SelectTrigger id="photoreal-style">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="documentary">Documentary</SelectItem>
                          <SelectItem value="cinematic">Cinematic</SelectItem>
                          <SelectItem value="portrait">Portrait</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Memory Sketch"
                  )}
                </Button>
                <Button
                  onClick={handleClear}
                  variant="outline"
                  disabled={isGenerating}
                >
                  Clear
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Panel - Result Display */}
          <div className="lg:col-span-7">
            <Card className="p-6 bg-card border-2 rounded-xl">
              {!generatedImage ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center">
                      <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground">Your memory sketch will appear here</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-700">
                  <div className="relative rounded-lg overflow-hidden border-2 border-foreground/20 shadow-lg">
                    <img
                      src={generatedImage}
                      alt={`AI sketch of ${generatedPrompt.slice(0, 50)}`}
                      className="w-full aspect-[4/3] object-cover"
                    />
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground italic">"{generatedPrompt}"</p>
                    <p className="text-xs text-muted-foreground">
                      Generated {generatedTime?.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground/80">
                      Solon's artistic interpretation — each sketch is unique to your memory.
                    </p>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <Label className="text-sm font-medium">
                      Refine Memory
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={refinePrompt}
                        onChange={(e) => setRefinePrompt(e.target.value)}
                        placeholder="Add more details to regenerate..."
                        className="flex-1"
                      />
                      <Button
                        onClick={handleRegenerate}
                        disabled={!refinePrompt.trim() || isGenerating}
                        variant="outline"
                      >
                        Regenerate
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Recent Reconstructions */}
        {recentReconstructions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-serif font-bold">Recent Reconstructions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentReconstructions.map((item) => (
                <Card
                  key={item.id}
                  className="p-3 bg-card border hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => {
                    setGeneratedImage(item.imageUrl);
                    setGeneratedPrompt(item.prompt);
                    setGeneratedTime(item.timestamp);
                  }}
                >
                  <div className="aspect-[4/3] rounded overflow-hidden mb-2 border">
                    <img
                      src={item.imageUrl}
                      alt="Memory reconstruction"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.prompt}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reconstruction;
