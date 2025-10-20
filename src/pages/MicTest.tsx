/**
 * MICROPHONE TEST PAGE
 * 
 * Dedicated page for testing microphone functionality with detailed diagnostics
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MicrophoneTest from '@/components/MicrophoneTest';
import { ArrowLeft, Headphones, Mic, Settings, VolumeX, Volume2 } from 'lucide-react';

interface MicTestResults {
  hasPermission: boolean;
  averageVolume: number;
  maxVolume: number;
  qualityScore: number;
  sampleRate?: number;
  channelCount?: number;
  deviceLabel?: string;
  recommendations: string[];
}

const MicTest: React.FC = () => {
  const [testHistory, setTestHistory] = useState<MicTestResults[]>([]);

  const handleTestComplete = (results: MicTestResults) => {
    console.log('🎤 Microphone test completed:', results);
    setTestHistory(prev => [results, ...prev.slice(0, 4)]); // Keep last 5 tests
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
              <h1 className="text-xl font-semibold">Microphone Test</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
        {/* Introduction */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Test Your Microphone</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Ensure your microphone is working properly for voice recordings and conversations. 
            Our advanced test will analyze audio quality, volume levels, and provide recommendations.
          </p>
        </div>

        {/* Test Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Before You Start
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <Mic className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <div>
                  <div className="font-medium">Check Your Microphone</div>
                  <div className="text-muted-foreground">Ensure your microphone is connected and not muted</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Headphones className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <div>
                  <div className="font-medium">Use Headphones (Optional)</div>
                  <div className="text-muted-foreground">Headphones prevent audio feedback during testing</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Volume2 className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <div>
                  <div className="font-medium">Test Your Voice</div>
                  <div className="text-muted-foreground">Speak normally during the test - count numbers or read text</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <VolumeX className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <div>
                  <div className="font-medium">Quiet Environment</div>
                  <div className="text-muted-foreground">Choose a quiet location for best results</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Microphone Test Component */}
        <div className="flex justify-center">
          <MicrophoneTest 
            onTestComplete={handleTestComplete}
            duration={30} // 30 second test
          />
        </div>

        {/* Test History */}
        {testHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Test Results</CardTitle>
              <CardDescription>
                Your microphone test history and performance over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testHistory.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="font-medium">Test #{testHistory.length - index}</div>
                        <div className="text-sm text-muted-foreground">
                          {result.deviceLabel || 'Unknown microphone'}
                        </div>
                      </div>
                      <Badge variant={result.qualityScore >= 80 ? 'default' : result.qualityScore >= 60 ? 'secondary' : 'destructive'}>
                        Score: {result.qualityScore}/100
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Avg Volume</div>
                        <div className="text-muted-foreground">{result.averageVolume}%</div>
                      </div>
                      <div>
                        <div className="font-medium">Max Volume</div>
                        <div className="text-muted-foreground">{result.maxVolume}%</div>
                      </div>
                      <div>
                        <div className="font-medium">Sample Rate</div>
                        <div className="text-muted-foreground">
                          {result.sampleRate ? `${(result.sampleRate / 1000).toFixed(0)}kHz` : 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    {result.recommendations.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Recommendations:</div>
                        <ul className="space-y-1">
                          {result.recommendations.slice(0, 2).map((rec, recIndex) => (
                            <li key={recIndex} className="text-xs text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Help */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-4 text-sm">
              <div>
                <div className="font-medium">No audio detected?</div>
                <ul className="mt-1 space-y-1 text-muted-foreground ml-4">
                  <li>• Check if your microphone is muted or disabled</li>
                  <li>• Try a different microphone or headset</li>
                  <li>• Check your browser permissions for microphone access</li>
                  <li>• Verify your operating system microphone settings</li>
                </ul>
              </div>
              
              <div>
                <div className="font-medium">Audio too quiet or too loud?</div>
                <ul className="mt-1 space-y-1 text-muted-foreground ml-4">
                  <li>• Adjust your microphone input level in system settings</li>
                  <li>• Move closer to or further from the microphone</li>
                  <li>• Speak at a normal conversational volume</li>
                  <li>• Check for background noise interference</li>
                </ul>
              </div>
              
              <div>
                <div className="font-medium">Poor quality score?</div>
                <ul className="mt-1 space-y-1 text-muted-foreground ml-4">
                  <li>• Use a dedicated microphone instead of built-in laptop mic</li>
                  <li>• Test in a quieter environment</li>
                  <li>• Ensure microphone is clean and unobstructed</li>
                  <li>• Check for loose connections or damaged cables</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MicTest;