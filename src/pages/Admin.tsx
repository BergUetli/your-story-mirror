import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { isDummyMode } from '@/services/dummyAuth';
import { DiagnosticsPanel } from '@/components/admin/DiagnosticsPanel';
import { MetricsPanel } from '@/components/admin/MetricsPanel';
import { SystemStatusPanel } from '@/components/admin/SystemStatusPanel';
import { PerformancePanel } from '@/components/admin/PerformancePanel';
import DatabaseManagementPanel from '@/components/admin/DatabaseManagementPanel';
import ConfigurationPanel from '@/components/admin/ConfigurationPanel';
import { MicrophoneTest } from '@/components/MicrophoneTest';
import { VoiceArchiveDiagnosticsPanel } from '@/components/admin/VoiceArchiveDiagnosticsPanel';
import { ElevenLabsCreditsPanel } from '@/components/admin/ElevenLabsCreditsPanel';
import { UserManagementPanel } from '@/components/admin/UserManagementPanel';
import { WaitlistPanel } from '@/components/admin/WaitlistPanel';
import { InsightsConfigPanel } from '@/components/admin/InsightsConfigPanel';
import { WhatsAppMemoriesPanel } from '@/components/admin/WhatsAppMemoriesPanel';
import { hasAdminAccess } from '@/utils/adminCheck';
import { 
  Activity,
  BarChart3,
  Settings,
  Shield,
  Zap,
  Users,
  Database,
  Mic,
  Brain,
  Clock,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Cog,
  Lightbulb,
  MessageSquare
} from 'lucide-react';

const Admin = () => {
  const { user } = useAuth();
  const [systemStatus, setSystemStatus] = useState({
    voiceAgent: 'operational',
    database: 'operational', 
    elevenlabs: 'unknown',
    memorySystem: 'operational',
    microphoneTest: 'operational'
  });
  
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    activeConnections: 0,
    totalMemories: 0,
    voiceSessionsToday: 0,
    averageResponseTime: 0,
    errorRate: 0
  });

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  // Check if user has admin privileges using database role system
  useEffect(() => {
    const checkAdminAccess = async () => {
      setIsCheckingAdmin(true);
      const hasAccess = await hasAdminAccess(user) || isDummyMode();
      setIsAdmin(hasAccess);
      setIsCheckingAdmin(false);
    };
    
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    // Simulate real-time metrics updates
    const interval = setInterval(() => {
      setRealTimeMetrics(prev => ({
        ...prev,
        activeConnections: Math.floor(Math.random() * 5) + 1,
        averageResponseTime: Math.floor(Math.random() * 200) + 150
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Show loading state while checking admin access
  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Checking admin access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" />
              Access Denied
            </CardTitle>
            <CardDescription>
              Admin privileges required to access this dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only authorized administrator accounts can access this dashboard. 
              {user && (
                <>
                  <br />
                  Current user: <span className="font-mono">{user.email}</span>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatusIndicator = ({ status }: { status: string }) => {
    const getStatusColor = () => {
      switch (status) {
        case 'operational': return 'text-green-500';
        case 'warning': return 'text-yellow-500';
        case 'error': return 'text-red-500';
        default: return 'text-gray-500';
      }
    };

    const getStatusIcon = () => {
      switch (status) {
        case 'operational': return <CheckCircle className="w-4 h-4" />;
        case 'warning': return <AlertTriangle className="w-4 h-4" />;
        case 'error': return <AlertTriangle className="w-4 h-4" />;
        default: return <Clock className="w-4 h-4" />;
      }
    };

    return (
      <div className={`flex items-center gap-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-xs capitalize">{status}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-purple-200">
              "You, Remembered" Voice Agent System Monitoring
            </p>
            {isDummyMode() && (
              <Badge variant="outline" className="mt-2 border-yellow-500 text-yellow-500">
                Demo Mode Active
              </Badge>
            )}
          </div>
          <div className="text-right text-sm text-purple-200">
            <div>User: {user?.email || 'demo@solinone.com'}</div>
            <div>Session: {new Date().toLocaleString()}</div>
          </div>
        </div>

        {/* Quick Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Voice Agent</p>
                  <StatusIndicator status={systemStatus.voiceAgent} />
                </div>
                <Mic className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Database</p>
                  <StatusIndicator status={systemStatus.database} />
                </div>
                <Database className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">ElevenLabs</p>
                  <StatusIndicator status={systemStatus.elevenlabs} />
                </div>
                <Zap className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Memory System</p>
                  <StatusIndicator status={systemStatus.memorySystem} />
                </div>
                <Brain className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Microphone Test</p>
                  <StatusIndicator status={systemStatus.microphoneTest} />
                </div>
                <Mic className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="diagnostics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-12 bg-slate-800/50 border-slate-700">
            <TabsTrigger value="waitlist" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
              <Users className="w-4 h-4" />
              Waitlist
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
              <Activity className="w-4 h-4" />
              Diagnostics
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
              <BarChart3 className="w-4 h-4" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
              <Zap className="w-4 h-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
              <Settings className="w-4 h-4" />
              System Status
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
              <Cog className="w-4 h-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
              <Lightbulb className="w-4 h-4" />
              Insights Config
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
              <Trash2 className="w-4 h-4" />
              Database Mgmt
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="mictest" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
              <Mic className="w-4 h-4" />
              Microphone Test
            </TabsTrigger>
            <TabsTrigger value="voicediag" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
              <Activity className="w-4 h-4" />
              Voice Diagnostics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="waitlist" className="space-y-6">
            <WaitlistPanel />
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-6">
            <WhatsAppMemoriesPanel />
          </TabsContent>

          <TabsContent value="diagnostics" className="space-y-6">
            <DiagnosticsPanel />
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <MetricsPanel metrics={realTimeMetrics} />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformancePanel />
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SystemStatusPanel systemStatus={systemStatus} />
              <ElevenLabsCreditsPanel />
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <ConfigurationPanel />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <InsightsConfigPanel />
          </TabsContent>

          <TabsContent value="database" className="space-y-6">
            <DatabaseManagementPanel />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagementPanel />
          </TabsContent>

          <TabsContent value="mictest" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Microphone Test & Diagnostics
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Test microphone functionality and audio input quality for voice conversations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-3">Real-Time Audio Test</h3>
                  <p className="text-sm text-slate-300 mb-4">
                    This test uses improved time-domain analysis for better speech detection sensitivity.
                    Speak normally to see the meter respond - it should detect regular conversation levels.
                  </p>
                  <MicrophoneTest 
                    duration={15}
                    onTestComplete={(results) => {
                      console.log('Admin microphone test results:', results);
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-slate-900/50 p-4 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-slate-600 hover:bg-slate-700"
                        onClick={() => window.open('/mic-test', '_blank')}
                      >
                        Open Full Microphone Test Page
                      </Button>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Recent Fixes</h4>
                    <div className="text-sm text-slate-300 space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Fixed time-domain audio analysis</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Improved RMS volume calculation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Enhanced sensitivity scaling (5x)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voicediag" className="space-y-6">
            <VoiceArchiveDiagnosticsPanel />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pt-6 border-t border-slate-700">
          "You, Remembered" Voice Agent Admin Dashboard v1.0 | 
          Built with ❤️ for intelligent conversation management
        </div>
      </div>
    </div>
  );
};

export default Admin;