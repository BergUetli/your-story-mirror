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
  CheckCircle
} from 'lucide-react';

const Admin = () => {
  const { user } = useAuth();
  const [systemStatus, setSystemStatus] = useState({
    voiceAgent: 'operational',
    database: 'operational', 
    elevenlabs: 'unknown',
    memorySystem: 'operational'
  });
  
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    activeConnections: 0,
    totalMemories: 0,
    voiceSessionsToday: 0,
    averageResponseTime: 0,
    errorRate: 0
  });

  // Check if user has admin privileges (for now, just check if authenticated)
  const isAdmin = !!user || isDummyMode();

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
              Please log in with an administrator account to continue.
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="diagnostics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border-slate-700">
            <TabsTrigger value="diagnostics" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
              <Activity className="w-4 h-4" />
              Real-Time Diagnostics
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
              <BarChart3 className="w-4 h-4" />
              Metrics & Analytics
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
              <Zap className="w-4 h-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
              <Settings className="w-4 h-4" />
              System Status
            </TabsTrigger>
          </TabsList>

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
            <SystemStatusPanel systemStatus={systemStatus} />
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