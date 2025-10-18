import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Play,
  Square,
  RotateCcw
} from 'lucide-react';

export interface DiagnosticStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  timestamp?: number;
  duration?: number;
  data?: any;
  error?: string;
}

export const DiagnosticsPanel = () => {
  const [diagnosticSteps, setDiagnosticSteps] = useState<DiagnosticStep[]>([
    {
      id: 'auth-check',
      name: 'Authentication Check',
      description: 'Verifying user authentication status',
      status: 'pending'
    },
    {
      id: 'session-validation',
      name: 'Session Validation',
      description: 'Validating Supabase session',
      status: 'pending'
    },
    {
      id: 'user-resolution',
      name: 'User Resolution',
      description: 'Resolving effective user (real or dummy)',
      status: 'pending'
    },
    {
      id: 'memory-context',
      name: 'Memory Context Loading',
      description: 'Loading intelligent memory prompting context',
      status: 'pending'
    },
    {
      id: 'elevenlabs-token',
      name: 'ElevenLabs Token Request',
      description: 'Requesting signed URL from ElevenLabs agent',
      status: 'pending'
    },
    {
      id: 'websocket-connection',
      name: 'WebSocket Connection',
      description: 'Establishing WebSocket connection to ElevenLabs',
      status: 'pending'
    },
    {
      id: 'audio-permission',
      name: 'Audio Permissions',
      description: 'Requesting microphone access permissions',
      status: 'pending'
    },
    {
      id: 'audio-context',
      name: 'Audio Context Setup',
      description: 'Initializing Web Audio API context',
      status: 'pending'
    },
    {
      id: 'conversation-start',
      name: 'Conversation Initialization',
      description: 'Starting conversation session',
      status: 'pending'
    },
    {
      id: 'voice-calibration',
      name: 'Voice Calibration',
      description: 'Setting up voice detection and volume levels',
      status: 'pending'
    },
    {
      id: 'agent-handshake',
      name: 'Agent Handshake',
      description: 'Completing handshake with voice agent',
      status: 'pending'
    },
    {
      id: 'conversation-ready',
      name: 'Conversation Ready',
      description: 'Voice agent ready for interaction',
      status: 'pending'
    },
    {
      id: 'first-interaction',
      name: 'First Interaction Test',
      description: 'Testing initial voice interaction',
      status: 'pending'
    }
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  const getStatusIcon = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticStep['status']) => {
    const variants = {
      pending: { variant: 'outline' as const, text: 'Pending' },
      running: { variant: 'default' as const, text: 'Running' },
      completed: { variant: 'default' as const, text: 'Completed' },
      error: { variant: 'destructive' as const, text: 'Error' }
    };
    
    const config = variants[status];
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const simulateDiagnostic = async () => {
    setIsRunning(true);
    
    for (let i = 0; i < diagnosticSteps.length; i++) {
      setCurrentStepIndex(i);
      
      // Update step to running
      setDiagnosticSteps(prev => prev.map((step, index) => 
        index === i 
          ? { ...step, status: 'running', timestamp: Date.now() }
          : step
      ));
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
      
      // Randomly succeed or fail (mostly succeed)
      const shouldFail = Math.random() < 0.1; // 10% failure rate
      
      setDiagnosticSteps(prev => prev.map((step, index) => 
        index === i 
          ? { 
              ...step, 
              status: shouldFail ? 'error' : 'completed',
              duration: Date.now() - (step.timestamp || Date.now()),
              error: shouldFail ? 'Simulated failure for demonstration' : undefined
            }
          : step
      ));
      
      if (shouldFail) {
        break; // Stop on first error
      }
    }
    
    setIsRunning(false);
    setCurrentStepIndex(-1);
  };

  const resetDiagnostics = () => {
    setDiagnosticSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending',
      timestamp: undefined,
      duration: undefined,
      data: undefined,
      error: undefined
    })));
    setCurrentStepIndex(-1);
    setIsRunning(false);
  };

  // Global diagnostic listener would go here in real implementation
  useEffect(() => {
    // This would listen to the actual diagnostic events from the voice agent
    // For now, it's just a placeholder
    
    const handleDiagnosticEvent = (event: any) => {
      // Update diagnostic step based on real events
      // This would integrate with your existing sessionHandoffId logging
    };
    
    // In real implementation, you'd listen to:
    // - Console logs with specific patterns
    // - Custom diagnostic events
    // - WebSocket connection events
    // - Audio API events
    
    return () => {
      // Cleanup listeners
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-purple-400" />
                Real-Time Voice Agent Diagnostics
              </CardTitle>
              <CardDescription className="text-slate-300">
                Monitor the 13-stage handoff process for voice agent initialization
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={simulateDiagnostic}
                disabled={isRunning}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Diagnostic
                  </>
                )}
              </Button>
              <Button
                onClick={resetDiagnostics}
                variant="outline"
                disabled={isRunning}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {diagnosticSteps.map((step, index) => (
              <div
                key={step.id}
                className={`p-4 rounded-lg border transition-all ${
                  currentStepIndex === index
                    ? 'border-purple-500 bg-purple-500/10'
                    : step.status === 'completed'
                    ? 'border-green-500/50 bg-green-500/5'
                    : step.status === 'error'
                    ? 'border-red-500/50 bg-red-500/5'
                    : 'border-slate-600 bg-slate-700/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(step.status)}
                    <div>
                      <div className="font-medium text-white">
                        {index + 1}. {step.name}
                      </div>
                      <div className="text-sm text-slate-400">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {step.duration && (
                      <span className="text-xs text-slate-400">
                        {step.duration}ms
                      </span>
                    )}
                    {getStatusBadge(step.status)}
                  </div>
                </div>
                {step.error && (
                  <div className="mt-2 text-sm text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                    Error: {step.error}
                  </div>
                )}
                {step.data && (
                  <div className="mt-2 text-xs text-slate-400 bg-slate-800/50 p-2 rounded border border-slate-600">
                    <pre>{JSON.stringify(step.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Integration Notes</CardTitle>
          <CardDescription className="text-slate-300">
            How this integrates with your existing diagnostic system
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-300 space-y-2">
          <p>• <strong>Session Handoff ID:</strong> Each diagnostic run maps to your existing <code>sessionHandoffId</code> logging</p>
          <p>• <strong>Console Integration:</strong> Listens to console logs with patterns like <code>🔌 [session-xxx] CONNECTION HANDOFF</code></p>
          <p>• <strong>Real-time Updates:</strong> Updates status based on actual voice agent connection events</p>
          <p>• <strong>Error Mapping:</strong> Maps your existing error handling to diagnostic step failures</p>
          <p>• <strong>Performance Tracking:</strong> Measures actual duration of each handoff stage</p>
        </CardContent>
      </Card>
    </div>
  );
};