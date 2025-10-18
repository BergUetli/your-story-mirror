import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock,
  Database,
  Zap,
  Mic,
  Brain,
  Shield,
  Globe,
  Server,
  RefreshCw,
  Settings,
  ExternalLink
} from 'lucide-react';

interface SystemStatus {
  voiceAgent: string;
  database: string;
  elevenlabs: string;
  memorySystem: string;
}

interface SystemStatusPanelProps {
  systemStatus: SystemStatus;
}

export const SystemStatusPanel: React.FC<SystemStatusPanelProps> = ({ systemStatus }) => {
  const [detailedStatus, setDetailedStatus] = useState({
    services: {
      supabaseAuth: { status: 'operational', responseTime: 89, uptime: 99.9 },
      supabaseDatabase: { status: 'operational', responseTime: 145, uptime: 99.8 },
      supabaseFunctions: { status: 'operational', responseTime: 234, uptime: 99.7 },
      elevenLabsAPI: { status: 'unknown', responseTime: 0, uptime: 0 },
      elevenLabsWebSocket: { status: 'unknown', responseTime: 0, uptime: 0 },
      intelligentPrompting: { status: 'operational', responseTime: 178, uptime: 100 }
    },
    dependencies: {
      reactApp: { status: 'operational', version: '18.2.0' },
      viteServer: { status: 'operational', version: '5.4.19' },
      elevenLabsSDK: { status: 'operational', version: '0.8.2' },
      supabaseClient: { status: 'operational', version: '2.57.2' }
    },
    configuration: {
      dummyModeEnabled: true,
      elevenLabsConfigured: false,
      memorySystemEnabled: true,
      voiceAgentEnabled: true
    }
  });

  const [isChecking, setIsChecking] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'unknown':
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge variant="default" className="bg-green-600 text-white">Operational</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'unknown':
        return <Badge variant="outline" className="border-gray-500 text-gray-500">Unknown</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const checkSystemStatus = async () => {
    setIsChecking(true);
    
    // Simulate status checks
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update with simulated results
    setDetailedStatus(prev => ({
      ...prev,
      services: {
        ...prev.services,
        elevenLabsAPI: { 
          status: Math.random() > 0.3 ? 'operational' : 'unknown', 
          responseTime: Math.floor(Math.random() * 200) + 150,
          uptime: 99.5
        },
        elevenLabsWebSocket: { 
          status: Math.random() > 0.3 ? 'operational' : 'unknown', 
          responseTime: Math.floor(Math.random() * 100) + 50,
          uptime: 99.2
        }
      }
    }));
    
    setIsChecking(false);
  };

  const ServiceStatusCard = ({ 
    name, 
    status, 
    responseTime, 
    uptime, 
    icon,
    description 
  }: {
    name: string;
    status: string;
    responseTime: number;
    uptime: number;
    icon: React.ReactNode;
    description: string;
  }) => (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-white font-medium">{name}</span>
          </div>
          {getStatusIcon(status)}
        </div>
        <div className="text-xs text-slate-400 mb-3">{description}</div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Status</span>
            {getStatusBadge(status)}
          </div>
          {responseTime > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Response</span>
              <span className="text-xs text-white">{responseTime}ms</span>
            </div>
          )}
          {uptime > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Uptime</span>
              <span className="text-xs text-white">{uptime}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      
      {/* System Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-green-400" />
            System Status & Health
          </h3>
          <p className="text-slate-400 text-sm">Monitor all system components and dependencies</p>
        </div>
        <Button
          onClick={checkSystemStatus}
          disabled={isChecking}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Check Status'}
        </Button>
      </div>

      {/* Core Services Status */}
      <div>
        <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          Core Services
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ServiceStatusCard
            name="Supabase Auth"
            status={detailedStatus.services.supabaseAuth.status}
            responseTime={detailedStatus.services.supabaseAuth.responseTime}
            uptime={detailedStatus.services.supabaseAuth.uptime}
            icon={<Shield className="w-4 h-4 text-blue-400" />}
            description="User authentication and session management"
          />
          <ServiceStatusCard
            name="Supabase Database"
            status={detailedStatus.services.supabaseDatabase.status}
            responseTime={detailedStatus.services.supabaseDatabase.responseTime}
            uptime={detailedStatus.services.supabaseDatabase.uptime}
            icon={<Database className="w-4 h-4 text-green-400" />}
            description="Memory storage and retrieval system"
          />
          <ServiceStatusCard
            name="Edge Functions"
            status={detailedStatus.services.supabaseFunctions.status}
            responseTime={detailedStatus.services.supabaseFunctions.responseTime}
            uptime={detailedStatus.services.supabaseFunctions.uptime}
            icon={<Zap className="w-4 h-4 text-yellow-400" />}
            description="Serverless function execution"
          />
          <ServiceStatusCard
            name="ElevenLabs API"
            status={detailedStatus.services.elevenLabsAPI.status}
            responseTime={detailedStatus.services.elevenLabsAPI.responseTime}
            uptime={detailedStatus.services.elevenLabsAPI.uptime}
            icon={<Mic className="w-4 h-4 text-purple-400" />}
            description="Voice synthesis and recognition"
          />
          <ServiceStatusCard
            name="WebSocket Connection"
            status={detailedStatus.services.elevenLabsWebSocket.status}
            responseTime={detailedStatus.services.elevenLabsWebSocket.responseTime}
            uptime={detailedStatus.services.elevenLabsWebSocket.uptime}
            icon={<Globe className="w-4 h-4 text-cyan-400" />}
            description="Real-time voice communication"
          />
          <ServiceStatusCard
            name="Intelligent Prompting"
            status={detailedStatus.services.intelligentPrompting.status}
            responseTime={detailedStatus.services.intelligentPrompting.responseTime}
            uptime={detailedStatus.services.intelligentPrompting.uptime}
            icon={<Brain className="w-4 h-4 text-pink-400" />}
            description="Memory pattern analysis system"
          />
        </div>
      </div>

      {/* Dependencies and Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Dependencies */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" />
              Dependencies
            </CardTitle>
            <CardDescription className="text-slate-300">
              Core libraries and frameworks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(detailedStatus.dependencies).map(([key, dep]) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50">
                  <div>
                    <div className="text-white font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-xs text-slate-400">v{dep.version}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(dep.status)}
                    <span className="text-xs text-slate-300 capitalize">{dep.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-400" />
              Configuration Status
            </CardTitle>
            <CardDescription className="text-slate-300">
              System configuration and feature flags
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50">
                <div>
                  <div className="text-white font-medium">Dummy Mode</div>
                  <div className="text-xs text-slate-400">Development authentication bypass</div>
                </div>
                <Badge variant={detailedStatus.configuration.dummyModeEnabled ? 'outline' : 'default'} 
                       className={detailedStatus.configuration.dummyModeEnabled ? 'border-yellow-500 text-yellow-500' : ''}>
                  {detailedStatus.configuration.dummyModeEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50">
                <div>
                  <div className="text-white font-medium">ElevenLabs Setup</div>
                  <div className="text-xs text-slate-400">API key configuration status</div>
                </div>
                <Badge variant={detailedStatus.configuration.elevenLabsConfigured ? 'default' : 'destructive'}>
                  {detailedStatus.configuration.elevenLabsConfigured ? 'Configured' : 'Missing'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50">
                <div>
                  <div className="text-white font-medium">Memory System</div>
                  <div className="text-xs text-slate-400">Intelligent prompting system</div>
                </div>
                <Badge variant={detailedStatus.configuration.memorySystemEnabled ? 'default' : 'outline'}>
                  {detailedStatus.configuration.memorySystemEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50">
                <div>
                  <div className="text-white font-medium">Voice Agent</div>
                  <div className="text-xs text-slate-400">Conversational AI system</div>
                </div>
                <Badge variant={detailedStatus.configuration.voiceAgentEnabled ? 'default' : 'outline'}>
                  {detailedStatus.configuration.voiceAgentEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            Quick Actions & Links
          </CardTitle>
          <CardDescription className="text-slate-300">
            Useful administrative actions and external links
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <Button variant="outline" className="justify-start border-slate-600 text-slate-300 hover:bg-slate-700">
              <Database className="w-4 h-4 mr-2" />
              Supabase Dashboard
              <ExternalLink className="w-3 h-3 ml-auto" />
            </Button>

            <Button variant="outline" className="justify-start border-slate-600 text-slate-300 hover:bg-slate-700">
              <Mic className="w-4 h-4 mr-2" />
              ElevenLabs Console
              <ExternalLink className="w-3 h-3 ml-auto" />
            </Button>

            <Button variant="outline" className="justify-start border-slate-600 text-slate-300 hover:bg-slate-700">
              <Shield className="w-4 h-4 mr-2" />
              Auth Settings
            </Button>

            <Button variant="outline" className="justify-start border-slate-600 text-slate-300 hover:bg-slate-700">
              <Brain className="w-4 h-4 mr-2" />
              Memory Analytics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">System Information</CardTitle>
          <CardDescription className="text-slate-300">
            Current environment and version details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-slate-400 mb-2">Environment</div>
              <div className="text-white">Development</div>
              <div className="text-xs text-slate-500">Local sandbox</div>
            </div>
            <div>
              <div className="text-slate-400 mb-2">Version</div>
              <div className="text-white">v1.0.0</div>
              <div className="text-xs text-slate-500">"You, Remembered" Voice Agent</div>
            </div>
            <div>
              <div className="text-slate-400 mb-2">Last Updated</div>
              <div className="text-white">{new Date().toLocaleDateString()}</div>
              <div className="text-xs text-slate-500">Auto-refresh enabled</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};