import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface RecentReconstruction {
  id: string;
  imageUrl: string;
  prompt: string;
  timestamp: string;
}

const Reconstruction = () => {
  const [memoryPrompt, setMemoryPrompt] = useState("");
  const [style, setStyle] = useState("pencil_sketch");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [generatedTime, setGeneratedTime] = useState("");
  const [refinePrompt, setRefinePrompt] = useState("");
  const [recentReconstructions, setRecentReconstructions] = useState<RecentReconstruction[]>([]);

  const wordCount = memoryPrompt.trim().split(/\s+/).filter(w => w).length;
  const canGenerate = wordCount >= 10 && !isGenerating;

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const styleGuidance = {
        pencil_sketch: "pencil sketch, graphite, nostalgic lighting, 4:3 aspect ratio, soft shadows, memory reconstruction, emotional tone",
        charcoal: "charcoal drawing, dramatic contrast, textured paper, memory scene, emotional depth, 4:3 aspect ratio",
        soft_sepia: "soft sepia tones, vintage photograph style, warm nostalgic feeling, gentle lighting, 4:3 aspect ratio",
        dreamlike_ink: "dreamlike ink wash, fluid brushstrokes, ethereal quality, memory as art, 4:3 aspect ratio"
      };

      const payload = {
        userId: user?.id || "demo-user",
        memoryPrompt,
        style,
        guidance: styleGuidance[style as keyof typeof styleGuidance]
      };

      // For now, simulate API call - replace with actual endpoint later
      toast.success("Solon is drawing what you described…");
      
      // Simulate image generation (replace with actual API call)
      setTimeout(() => {
        setGeneratedImage("https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop");
        setGeneratedPrompt(memoryPrompt);
        setGeneratedTime(new Date().toLocaleString());
        toast.success("Your memory has been sketched.");
        setIsGenerating(false);
        
        // Add to recent reconstructions
        const newReconstruction: RecentReconstruction = {
          id: Date.now().toString(),
          imageUrl: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop",
          prompt: memoryPrompt,
          timestamp: new Date().toLocaleString()
        };
        setRecentReconstructions(prev => [newReconstruction, ...prev].slice(0, 4));
      }, 3000);
      
    } catch (error) {
      toast.error("Could not reconstruct this memory right now. Try again later.");
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    setMemoryPrompt("");
    setRefinePrompt("");
  };

  const handleRegenerate = () => {
    if (refinePrompt.trim()) {
      setMemoryPrompt(refinePrompt);
      handleGenerate();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F9F9F9] to-[#EDEDED] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif text-foreground mb-4">
            Reconstruct a Memory
          </h1>
          <p className="text-lg text-muted-foreground mb-2">
            Describe a moment from your past — Solon will help visualize it as an artistic sketch.
          </p>
          <p className="text-sm italic text-muted-foreground/80">
            "Every memory has its own light."
          </p>
        </header>

        {/* Main Content: Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          {/* Left Panel - Input */}
          <div className="lg:col-span-5">
            <Card className="p-6 bg-white shadow-lg rounded-xl">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Describe the scene
                  </label>
                  <Textarea
                    value={memoryPrompt}
                    onChange={(e) => setMemoryPrompt(e.target.value)}
                    placeholder="Include details like time of day, place, colors, people, mood..."
                    className="min-h-[200px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {wordCount} words (minimum 10 required)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Style
                  </label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger>
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

                <div className="flex gap-3">
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
              </div>
            </Card>
          </div>

          {/* Right Panel - Result Display */}
          <div className="lg:col-span-7">
            <Card className="p-6 bg-[#F9F9F9] border-2 border-black rounded-xl shadow-md">
              {!generatedImage ? (
                <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-sm">Your memory sketch will appear here</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-700">
                  <div className="relative rounded-lg overflow-hidden border-2 border-black shadow-lg">
                    <img
                      src={generatedImage}
                      alt="Generated memory"
                      className="w-full aspect-[4/3] object-cover"
                    />
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground italic">"{generatedPrompt}"</p>
                    <p className="text-xs text-muted-foreground">
                      Generated {generatedTime}
                    </p>
                    <p className="text-xs text-muted-foreground/80">
                      AI interpretation — each sketch is unique to your memory.
                    </p>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Refine Memory
                    </label>
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
          <div className="space-y-6">
            <h2 className="text-2xl font-serif text-foreground">Recent Reconstructions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentReconstructions.map((item) => (
                <Card
                  key={item.id}
                  className="p-3 bg-white border border-muted hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => {
                    setGeneratedImage(item.imageUrl);
                    setGeneratedPrompt(item.prompt);
                    setGeneratedTime(item.timestamp);
                  }}
                >
                  <div className="aspect-[4/3] rounded overflow-hidden mb-2 border border-muted">
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
