import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ExtractionConfig {
  model: string;
  temperature: {
    insights: number;
    core_data: number;
    context: number;
  };
  features: {
    extract_people: boolean;
    extract_places: boolean;
    extract_dates: boolean;
    extract_events: boolean;
    extract_themes: boolean;
    extract_emotions: boolean;
    extract_objects: boolean;
    extract_relationships: boolean;
    extract_time_periods: boolean;
    extract_key_moments: boolean;
    extract_emotional_tone: boolean;
    extract_narrative_arc: boolean;
  };
  confidence: {
    min_date_confidence: number;
    min_location_confidence: number;
    min_people_confidence: number;
  };
}

const DEFAULT_CONFIG: ExtractionConfig = {
  model: "gpt-4o-mini",
  temperature: {
    insights: 0.3,
    core_data: 0.2,
    context: 0.4,
  },
  features: {
    extract_people: true,
    extract_places: true,
    extract_dates: true,
    extract_events: true,
    extract_themes: true,
    extract_emotions: true,
    extract_objects: true,
    extract_relationships: true,
    extract_time_periods: true,
    extract_key_moments: true,
    extract_emotional_tone: true,
    extract_narrative_arc: true,
  },
  confidence: {
    min_date_confidence: 0.5,
    min_location_confidence: 0.5,
    min_people_confidence: 0.6,
  },
};

export function InsightsConfigPanel() {
  const [config, setConfig] = useState<ExtractionConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("system_configuration")
        .upsert({
          key: "memory_insights_config",
          value: config,
          category: "ai",
          description: "Configuration for memory insights extraction",
        });

      if (error) throw error;
      toast.success("Configuration saved successfully");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const updateFeature = (feature: keyof ExtractionConfig["features"], value: boolean) => {
    setConfig((prev) => ({
      ...prev,
      features: { ...prev.features, [feature]: value },
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Memory Insights Configuration</CardTitle>
          <CardDescription>
            Fine-tune how memory insights are extracted and processed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label>AI Model</Label>
            <Select
              value={config.model}
              onValueChange={(value) => setConfig({ ...config, model: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast & Cost-Effective)</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o (More Accurate)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Temperature Controls */}
          <div className="space-y-4">
            <Label>Temperature Settings</Label>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Insights Extraction</span>
                <span className="text-sm text-muted-foreground">{config.temperature.insights}</span>
              </div>
              <Slider
                value={[config.temperature.insights]}
                onValueChange={([value]) =>
                  setConfig({ ...config, temperature: { ...config.temperature, insights: value } })
                }
                min={0}
                max={1}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Core Data Extraction</span>
                <span className="text-sm text-muted-foreground">{config.temperature.core_data}</span>
              </div>
              <Slider
                value={[config.temperature.core_data]}
                onValueChange={([value]) =>
                  setConfig({ ...config, temperature: { ...config.temperature, core_data: value } })
                }
                min={0}
                max={1}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Context Analysis</span>
                <span className="text-sm text-muted-foreground">{config.temperature.context}</span>
              </div>
              <Slider
                value={[config.temperature.context]}
                onValueChange={([value]) =>
                  setConfig({ ...config, temperature: { ...config.temperature, context: value } })
                }
                min={0}
                max={1}
                step={0.1}
              />
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="space-y-4">
            <Label>Extraction Features</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="people" className="text-sm font-normal">People</Label>
                <Switch
                  id="people"
                  checked={config.features.extract_people}
                  onCheckedChange={(checked) => updateFeature("extract_people", checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="places" className="text-sm font-normal">Places</Label>
                <Switch
                  id="places"
                  checked={config.features.extract_places}
                  onCheckedChange={(checked) => updateFeature("extract_places", checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="dates" className="text-sm font-normal">Dates</Label>
                <Switch
                  id="dates"
                  checked={config.features.extract_dates}
                  onCheckedChange={(checked) => updateFeature("extract_dates", checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="events" className="text-sm font-normal">Events</Label>
                <Switch
                  id="events"
                  checked={config.features.extract_events}
                  onCheckedChange={(checked) => updateFeature("extract_events", checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="themes" className="text-sm font-normal">Themes</Label>
                <Switch
                  id="themes"
                  checked={config.features.extract_themes}
                  onCheckedChange={(checked) => updateFeature("extract_themes", checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="emotions" className="text-sm font-normal">Emotions</Label>
                <Switch
                  id="emotions"
                  checked={config.features.extract_emotions}
                  onCheckedChange={(checked) => updateFeature("extract_emotions", checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="objects" className="text-sm font-normal">Objects</Label>
                <Switch
                  id="objects"
                  checked={config.features.extract_objects}
                  onCheckedChange={(checked) => updateFeature("extract_objects", checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="relationships" className="text-sm font-normal">Relationships</Label>
                <Switch
                  id="relationships"
                  checked={config.features.extract_relationships}
                  onCheckedChange={(checked) => updateFeature("extract_relationships", checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="time_periods" className="text-sm font-normal">Time Periods</Label>
                <Switch
                  id="time_periods"
                  checked={config.features.extract_time_periods}
                  onCheckedChange={(checked) => updateFeature("extract_time_periods", checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="key_moments" className="text-sm font-normal">Key Moments</Label>
                <Switch
                  id="key_moments"
                  checked={config.features.extract_key_moments}
                  onCheckedChange={(checked) => updateFeature("extract_key_moments", checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="emotional_tone" className="text-sm font-normal">Emotional Tone</Label>
                <Switch
                  id="emotional_tone"
                  checked={config.features.extract_emotional_tone}
                  onCheckedChange={(checked) => updateFeature("extract_emotional_tone", checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="narrative_arc" className="text-sm font-normal">Narrative Arc</Label>
                <Switch
                  id="narrative_arc"
                  checked={config.features.extract_narrative_arc}
                  onCheckedChange={(checked) => updateFeature("extract_narrative_arc", checked)}
                />
              </div>
            </div>
          </div>

          {/* Confidence Thresholds */}
          <div className="space-y-4">
            <Label>Confidence Thresholds</Label>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Date Extraction</span>
                <span className="text-sm text-muted-foreground">
                  {(config.confidence.min_date_confidence * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[config.confidence.min_date_confidence]}
                onValueChange={([value]) =>
                  setConfig({
                    ...config,
                    confidence: { ...config.confidence, min_date_confidence: value },
                  })
                }
                min={0}
                max={1}
                step={0.05}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Location Extraction</span>
                <span className="text-sm text-muted-foreground">
                  {(config.confidence.min_location_confidence * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[config.confidence.min_location_confidence]}
                onValueChange={([value]) =>
                  setConfig({
                    ...config,
                    confidence: { ...config.confidence, min_location_confidence: value },
                  })
                }
                min={0}
                max={1}
                step={0.05}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">People Extraction</span>
                <span className="text-sm text-muted-foreground">
                  {(config.confidence.min_people_confidence * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[config.confidence.min_people_confidence]}
                onValueChange={([value]) =>
                  setConfig({
                    ...config,
                    confidence: { ...config.confidence, min_people_confidence: value },
                  })
                }
                min={0}
                max={1}
                step={0.05}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
