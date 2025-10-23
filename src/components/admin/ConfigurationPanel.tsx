import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Clock,
  Mic,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { configurationService, SystemConfiguration } from '@/services/configurationService';
import VoiceRecordingTester from './VoiceRecordingTester';

const ConfigurationPanel = () => {
  const [config, setConfig] = useState<SystemConfiguration>(configurationService.getConfig());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Subscribe to configuration changes
  useEffect(() => {
    const unsubscribe = configurationService.subscribe((newConfig) => {
      setConfig(newConfig);
      setHasChanges(false);
    });

    // Load latest configuration
    setIsLoading(true);
    configurationService.loadConfiguration()
      .finally(() => setIsLoading(false));

    return unsubscribe;
  }, []);

  const handleInputChange = (field: keyof SystemConfiguration, value: string | number | boolean) => {
    if (typeof value === 'string') {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue) || numValue < 0) return;
      setConfig(prev => ({
        ...prev,
        [field]: numValue
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        [field]: value
      }));
    }
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      await configurationService.saveConfiguration(config);
      setMessage({ type: 'success', text: 'Configuration saved successfully!' });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setMessage({ type: 'error', text: `Failed to save configuration: ${error}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      await configurationService.resetToDefaults();
      setMessage({ type: 'success', text: 'Configuration reset to defaults!' });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to reset configuration:', error);
      setMessage({ type: 'error', text: `Failed to reset configuration: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Settings */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-400">
            <Settings className="h-5 w-5" />
            System Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Conversation Timing Settings */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Conversation Timing
            </h4>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timeout" className="text-slate-300">
                  Conversation End Timeout (ms)
                </Label>
                <Input
                  id="timeout"
                  type="number"
                  min="1000"
                  step="500"
                  value={config.conversation_end_timeout_ms}
                  onChange={(e) => handleInputChange('conversation_end_timeout_ms', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-slate-200"
                />
                <p className="text-xs text-slate-400">
                  Maximum time to wait for Solin to finish speaking after "Save & End" is clicked.
                  Default: 5000ms (5 seconds)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grace" className="text-slate-300">
                  Natural End Grace Period (ms)
                </Label>
                <Input
                  id="grace"
                  type="number"
                  min="500"
                  step="500"
                  value={config.natural_end_grace_period_ms}
                  onChange={(e) => handleInputChange('natural_end_grace_period_ms', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-slate-200"
                />
                <p className="text-xs text-slate-400">
                  Time to wait after Solin stops speaking before ending conversation.
                  Default: 3000ms (3 seconds)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval" className="text-slate-300">
                Speaking Check Interval (ms)
              </Label>
              <Input
                id="interval"
                type="number"
                min="100"
                step="100"
                value={config.speaking_check_interval_ms}
                onChange={(e) => handleInputChange('speaking_check_interval_ms', e.target.value)}
                className="bg-slate-700 border-slate-600 text-slate-200 max-w-xs"
              />
              <p className="text-xs text-slate-400">
                How often to check if Solin is still speaking.
                Default: 500ms (0.5 seconds)
              </p>
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Audio Mixing Settings */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-200 flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Audio Mixing & Ducking
            </h4>
            
            {/* Ducking Enable/Disable */}
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="ducking-enabled" className="text-slate-300 font-medium">
                  Enable Voice Ducking
                </Label>
                <p className="text-xs text-slate-400">
                  Automatically reduce microphone volume when agent speaks to prevent overlap
                </p>
              </div>
              <Switch
                id="ducking-enabled"
                checked={config.audio_ducking_enabled}
                onCheckedChange={(checked) => handleInputChange('audio_ducking_enabled', checked)}
              />
            </div>

            {/* Ducking Amount */}
            <div className="space-y-2">
              <Label htmlFor="ducking-amount" className="text-slate-300">
                Ducking Amount: {(config.audio_ducking_amount * 100).toFixed(0)}%
              </Label>
              <Slider
                id="ducking-amount"
                min={0}
                max={100}
                step={5}
                value={[config.audio_ducking_amount * 100]}
                onValueChange={([value]) => handleInputChange('audio_ducking_amount', value / 100)}
                disabled={!config.audio_ducking_enabled}
                className="w-full"
              />
              <p className="text-xs text-slate-400">
                How much to reduce mic volume when agent speaks (0% = mute, 100% = no reduction)
              </p>
            </div>

            {/* Ducking Attack/Release */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ducking-attack" className="text-slate-300">
                  Attack Time (ms)
                </Label>
                <Input
                  id="ducking-attack"
                  type="number"
                  min="10"
                  step="10"
                  value={config.audio_ducking_attack_ms}
                  onChange={(e) => handleInputChange('audio_ducking_attack_ms', e.target.value)}
                  disabled={!config.audio_ducking_enabled}
                  className="bg-slate-700 border-slate-600 text-slate-200"
                />
                <p className="text-xs text-slate-400">
                  How fast to reduce volume (lower = faster)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ducking-release" className="text-slate-300">
                  Release Time (ms)
                </Label>
                <Input
                  id="ducking-release"
                  type="number"
                  min="50"
                  step="50"
                  value={config.audio_ducking_release_ms}
                  onChange={(e) => handleInputChange('audio_ducking_release_ms', e.target.value)}
                  disabled={!config.audio_ducking_enabled}
                  className="bg-slate-700 border-slate-600 text-slate-200"
                />
                <p className="text-xs text-slate-400">
                  How fast to restore volume (lower = faster)
                </p>
              </div>
            </div>

            {/* Volume Controls */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mic-volume" className="text-slate-300">
                  Microphone Volume: {(config.audio_mic_volume * 100).toFixed(0)}%
                </Label>
                <Slider
                  id="mic-volume"
                  min={0}
                  max={100}
                  step={5}
                  value={[config.audio_mic_volume * 100]}
                  onValueChange={([value]) => handleInputChange('audio_mic_volume', value / 100)}
                  className="w-full"
                />
                <p className="text-xs text-slate-400">
                  Base microphone recording volume
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-volume" className="text-slate-300">
                  Agent Voice Volume: {(config.audio_agent_volume * 100).toFixed(0)}%
                </Label>
                <Slider
                  id="agent-volume"
                  min={0}
                  max={100}
                  step={5}
                  value={[config.audio_agent_volume * 100]}
                  onValueChange={([value]) => handleInputChange('audio_agent_volume', value / 100)}
                  className="w-full"
                />
                <p className="text-xs text-slate-400">
                  Agent audio playback and recording volume
                </p>
              </div>
            </div>

            {/* Buffer Delay */}
            <div className="space-y-2">
              <Label htmlFor="buffer-delay" className="text-slate-300">
                Audio Buffer Delay (ms)
              </Label>
              <Input
                id="buffer-delay"
                type="number"
                min="0"
                step="50"
                value={config.audio_buffer_delay_ms}
                onChange={(e) => handleInputChange('audio_buffer_delay_ms', e.target.value)}
                className="bg-slate-700 border-slate-600 text-slate-200 max-w-xs"
              />
              <p className="text-xs text-slate-400">
                Delay agent audio playback for better timing alignment (0 = no delay)
              </p>
            </div>

            {/* Timestamp Correlation */}
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="timestamp-correlation" className="text-slate-300 font-medium">
                  Enable Timestamp Correlation
                </Label>
                <p className="text-xs text-slate-400">
                  Track timing between audio chunks and transcript entries for debugging
                </p>
              </div>
              <Switch
                id="timestamp-correlation"
                checked={config.audio_timestamp_correlation}
                onCheckedChange={(checked) => handleInputChange('audio_timestamp_correlation', checked)}
              />
            </div>

            {/* Audio Mixing Summary */}
            <div className="bg-slate-900/50 p-4 rounded-lg space-y-2 text-sm">
              <h5 className="font-semibold text-slate-200">Current Audio Settings</h5>
              <div className="grid grid-cols-2 gap-2 text-slate-400">
                <div>Ducking: <span className={config.audio_ducking_enabled ? 'text-green-400' : 'text-red-400'}>
                  {config.audio_ducking_enabled ? 'Enabled' : 'Disabled'}
                </span></div>
                <div>Buffer Delay: <span className="text-slate-200">{config.audio_buffer_delay_ms}ms</span></div>
                <div>Mic Volume: <span className="text-slate-200">{(config.audio_mic_volume * 100).toFixed(0)}%</span></div>
                <div>Agent Volume: <span className="text-slate-200">{(config.audio_agent_volume * 100).toFixed(0)}%</span></div>
                {config.audio_ducking_enabled && (
                  <>
                    <div>Ducked To: <span className="text-slate-200">{(config.audio_ducking_amount * 100).toFixed(0)}%</span></div>
                    <div>Attack/Release: <span className="text-slate-200">{config.audio_ducking_attack_ms}/{config.audio_ducking_release_ms}ms</span></div>
                  </>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Voice Recording & Audio Testing */}
          <VoiceRecordingTester />

          <Separator className="bg-slate-700" />

          {/* Current Values Display */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-200 flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Current Settings Summary
            </h4>
            <div className="bg-slate-900/50 p-4 rounded-lg space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400">End Timeout:</span>
                  <span className="text-slate-200 ml-2 font-mono">
                    {config.conversation_end_timeout_ms}ms ({(config.conversation_end_timeout_ms / 1000).toFixed(1)}s)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Grace Period:</span>
                  <span className="text-slate-200 ml-2 font-mono">
                    {config.natural_end_grace_period_ms}ms ({(config.natural_end_grace_period_ms / 1000).toFixed(1)}s)
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-400">Check Interval:</span>
                <span className="text-slate-200 ml-2 font-mono">
                  {config.speaking_check_interval_ms}ms ({(config.speaking_check_interval_ms / 1000).toFixed(2)}s)
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSave}
              disabled={isSaving || isLoading || !hasChanges}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>

            <Button 
              onClick={handleResetToDefaults}
              disabled={isLoading || isSaving}
              variant="outline"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>

          {/* Status Messages */}
          {message && (
            <Alert className={message.type === 'success' ? 'border-green-500/20 bg-green-500/10' : 'border-red-500/20 bg-red-500/10'}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-400" />
              )}
              <AlertDescription className={message.type === 'success' ? 'text-green-200' : 'text-red-200'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {hasChanges && (
            <Alert className="border-yellow-500/20 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-200">
                You have unsaved changes. Click "Save Configuration" to apply them.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfigurationPanel;