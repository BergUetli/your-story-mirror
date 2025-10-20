/**
 * VOICE ARCHIVE DIAGNOSTICS PANEL
 * 
 * Comprehensive diagnostics and validation for voice archiving system
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Database,
  Mic,
  Archive,
  FileAudio,
  Download,
  Trash2,
  Activity,
  Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { diagnosticLogger, ArchiveValidationResult, DiagnosticEvent } from '@/services/diagnosticLogger';

export const VoiceArchiveDiagnosticsPanel: React.FC = () => {
  const { user } = useAuth();
  const [validationResult, setValidationResult] = useState<ArchiveValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [recentEvents, setRecentEvents] = useState<DiagnosticEvent[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  useEffect(() => {
    // Load initial events
    loadRecentEvents();
    
    // Auto-refresh if enabled
    if (autoRefresh) {
      const interval = setInterval(loadRecentEvents, 5000);
      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [autoRefresh]);

  const loadRecentEvents = () => {
    const events = diagnosticLogger.getRecentEvents(100);
    setRecentEvents(events);
  };

  const runValidation = async () => {
    setIsValidating(true);
    try {
      diagnosticLogger.logInfo('system', 'admin_validation_started', { 
        userId: user?.id,
        timestamp: new Date().toISOString()
      });

      const result = await diagnosticLogger.validateVoiceArchiving(user?.id);
      setValidationResult(result);
      loadRecentEvents();

      diagnosticLogger.logInfo('system', 'admin_validation_completed', { 
        success: result.success,
        validationId: result.validationId
      });
    } catch (error) {
      diagnosticLogger.logError('system', 'admin_validation_failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const exportDiagnostics = () => {
    const diagnosticsData = diagnosticLogger.exportDiagnostics();
    const blob = new Blob([diagnosticsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voice-archive-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    diagnosticLogger.logInfo('system', 'diagnostics_exported', {
      timestamp: new Date().toISOString()
    });
  };

  const clearDiagnostics = () => {
    diagnosticLogger.clearEvents();
    setRecentEvents([]);
    setValidationResult(null);
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const getEventIcon = (level: DiagnosticEvent['level']) => {
    switch (level) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'debug': return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: DiagnosticEvent['category']) => {
    switch (category) {
      case 'voice_recording': return <Mic className="w-4 h-4" />;
      case 'memory_saving': return <Archive className="w-4 h-4" />;
      case 'archive_display': return <FileAudio className="w-4 h-4" />;
      case 'database': return <Database className="w-4 h-4" />;
      case 'system': return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <FileAudio className="w-5 h-5" />
                Voice Archive Diagnostics
              </CardTitle>
              <CardDescription className="text-slate-300">
                Validate voice recording, memory saving, and archive display functionality
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="border-slate-600 hover:bg-slate-700"
              >
                {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {autoRefresh ? 'Pause' : 'Auto Refresh'}
              </Button>
              <Button
                size="sm"
                onClick={runValidation}
                disabled={isValidating}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isValidating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Run Validation
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {getStatusIcon(validationResult.success)}
              Validation Results
              <Badge variant={validationResult.success ? "default" : "destructive"}>
                {validationResult.success ? 'PASSED' : 'FAILED'}
              </Badge>
            </CardTitle>
            <CardDescription className="text-slate-300">
              Validation ID: {validationResult.validationId} | {new Date(validationResult.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-white">{validationResult.voiceRecordingCount}</div>
                <div className="text-sm text-slate-300">Voice Recordings</div>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-white">{validationResult.memoryCount}</div>
                <div className="text-sm text-slate-300">Memories</div>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-400">
                  {validationResult.archiveDisplayErrors.length + 
                   validationResult.databaseErrors.length + 
                   validationResult.recordingServiceErrors.length}
                </div>
                <div className="text-sm text-slate-300">Total Errors</div>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-400">{validationResult.recommendations.length}</div>
                <div className="text-sm text-slate-300">Recommendations</div>
              </div>
            </div>

            {/* Errors */}
            {(validationResult.databaseErrors.length > 0 || 
              validationResult.archiveDisplayErrors.length > 0 || 
              validationResult.recordingServiceErrors.length > 0) && (
              <div className="space-y-3">
                <h4 className="text-white font-medium">Issues Found</h4>
                
                {validationResult.databaseErrors.length > 0 && (
                  <Alert className="border-red-600 bg-red-900/20">
                    <Database className="h-4 w-4" />
                    <AlertDescription className="text-red-200">
                      <strong>Database Errors:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {validationResult.databaseErrors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {validationResult.recordingServiceErrors.length > 0 && (
                  <Alert className="border-yellow-600 bg-yellow-900/20">
                    <Mic className="h-4 w-4" />
                    <AlertDescription className="text-yellow-200">
                      <strong>Recording Service Errors:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {validationResult.recordingServiceErrors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {validationResult.archiveDisplayErrors.length > 0 && (
                  <Alert className="border-orange-600 bg-orange-900/20">
                    <Archive className="h-4 w-4" />
                    <AlertDescription className="text-orange-200">
                      <strong>Archive Display Errors:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {validationResult.archiveDisplayErrors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Recommendations */}
            {validationResult.recommendations.length > 0 && (
              <div>
                <h4 className="text-white font-medium mb-2">Recommendations</h4>
                <div className="space-y-1">
                  {validationResult.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diagnostic Events */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList className="bg-slate-800/50 border-slate-700">
          <TabsTrigger value="recent">Recent Events</TabsTrigger>
          <TabsTrigger value="voice">Voice Recording</TabsTrigger>
          <TabsTrigger value="memory">Memory Saving</TabsTrigger>
          <TabsTrigger value="archive">Archive Display</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        <TabsContent value="recent">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">All Recent Events</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={loadRecentEvents} className="border-slate-600">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportDiagnostics} className="border-slate-600">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearDiagnostics} className="border-slate-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentEvents.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    No diagnostic events recorded yet
                  </div>
                ) : (
                  recentEvents.map((event, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                      <div className="flex items-center gap-2 mt-0.5">
                        {getCategoryIcon(event.category)}
                        {getEventIcon(event.level)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">{event.event}</span>
                          <Badge variant="outline" className="text-xs">
                            {event.category}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {Object.keys(event.details).length > 0 && (
                          <div className="text-sm text-slate-300 font-mono bg-slate-800 p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(event.details, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Category-specific tabs */}
        {['voice_recording', 'memory_saving', 'archive_display', 'database'].map(category => (
          <TabsContent key={category} value={category.split('_')[0]}>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white capitalize">
                  {category.replace('_', ' ')} Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recentEvents
                    .filter(e => e.category === category)
                    .map((event, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                        {getEventIcon(event.level)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">{event.event}</span>
                            <span className="text-xs text-slate-400">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          {Object.keys(event.details).length > 0 && (
                            <pre className="text-xs text-slate-300 bg-slate-800 p-2 rounded overflow-x-auto">
                              {JSON.stringify(event.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};