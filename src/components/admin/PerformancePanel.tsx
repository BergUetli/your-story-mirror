import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Database,
  Cpu,
  MemoryStick,
  Network,
  RefreshCw
} from 'lucide-react';

export const PerformancePanel = () => {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    apiLatency: {
      elevenlabs: { current: 156, avg: 168, p95: 285 },
      supabase: { current: 89, avg: 95, p95: 187 },
      memoryAnalysis: { current: 234, avg: 245, p95: 412 }
    },
    throughput: {
      voiceConnections: { perMinute: 12, perHour: 842 },
      memoryQueries: { perMinute: 34, perHour: 2156 },
      promptGenerations: { perMinute: 8, perHour: 567 }
    },
    resourceUsage: {
      cpuUsage: 24.5,
      memoryUsage: 67.8,
      networkIO: 145.2,
      storageIO: 89.3
    },
    errors: {
      voiceConnectionErrors: 2,
      apiTimeouts: 1,
      memoryQueryErrors: 0,
      totalErrors: 3,
      errorRate: 0.8 // percentage
    }
  });

  const [performanceHistory, setPerformanceHistory] = useState({
    latencyTrend: [145, 167, 134, 189, 156, 173, 168],
    throughputTrend: [8, 12, 15, 11, 18, 14, 12],
    errorTrend: [0.5, 1.2, 0.8, 2.1, 0.9, 1.1, 0.8]
  });

  const [refreshing, setRefreshing] = useState(false);

  const refreshMetrics = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update with some simulated data
    setPerformanceMetrics(prev => ({
      ...prev,
      apiLatency: {
        ...prev.apiLatency,
        elevenlabs: { 
          ...prev.apiLatency.elevenlabs, 
          current: Math.floor(Math.random() * 100) + 120 
        }
      },
      resourceUsage: {
        ...prev.resourceUsage,
        cpuUsage: Math.random() * 30 + 15,
        memoryUsage: Math.random() * 20 + 60,
        networkIO: Math.random() * 50 + 100
      }
    }));
    
    setRefreshing(false);
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceMetrics(prev => ({
        ...prev,
        apiLatency: {
          ...prev.apiLatency,
          elevenlabs: { 
            ...prev.apiLatency.elevenlabs, 
            current: Math.floor(Math.random() * 100) + 120 
          }
        },
        resourceUsage: {
          ...prev.resourceUsage,
          cpuUsage: Math.random() * 30 + 15,
          memoryUsage: Math.random() * 20 + 60
        }
      }));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const LatencyCard = ({ 
    title, 
    data, 
    icon, 
    color 
  }: {
    title: string;
    data: { current: number; avg: number; p95: number };
    icon: React.ReactNode;
    color: string;
  }) => (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`${color}`}>{icon}</div>
          <Badge variant={data.current < data.avg ? 'default' : 'destructive'}>
            {data.current < data.avg ? 'Good' : 'High'}
          </Badge>
        </div>
        <div className="space-y-2">
          <div>
            <div className="text-2xl font-bold text-white">{data.current}ms</div>
            <div className="text-xs text-slate-400">{title}</div>
          </div>
          <div className="text-xs text-slate-500 space-y-1">
            <div>Avg: {data.avg}ms</div>
            <div>P95: {data.p95}ms</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ResourceCard = ({ 
    title, 
    value, 
    unit, 
    icon, 
    color, 
    threshold 
  }: {
    title: string;
    value: number;
    unit: string;
    icon: React.ReactNode;
    color: string;
    threshold: number;
  }) => (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`${color}`}>{icon}</div>
          <Badge variant={value < threshold ? 'default' : 'destructive'}>
            {value < threshold ? 'Normal' : 'High'}
          </Badge>
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{value.toFixed(1)}{unit}</div>
          <div className="text-xs text-slate-400">{title}</div>
          <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${value < threshold ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(value, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      
      {/* Performance Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Performance Monitoring
          </h3>
          <p className="text-slate-400 text-sm">Real-time system performance and optimization metrics</p>
        </div>
        <Button
          onClick={refreshMetrics}
          variant="outline"
          disabled={refreshing}
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* API Latency Metrics */}
      <div>
        <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          API Response Times
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LatencyCard
            title="ElevenLabs API"
            data={performanceMetrics.apiLatency.elevenlabs}
            icon={<Network className="w-5 h-5" />}
            color="text-purple-400"
          />
          <LatencyCard
            title="Supabase Queries"
            data={performanceMetrics.apiLatency.supabase}
            icon={<Database className="w-5 h-5" />}
            color="text-green-400"
          />
          <LatencyCard
            title="Memory Analysis"
            data={performanceMetrics.apiLatency.memoryAnalysis}
            icon={<Zap className="w-5 h-5" />}
            color="text-yellow-400"
          />
        </div>
      </div>

      {/* System Resource Usage */}
      <div>
        <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-red-400" />
          System Resources
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ResourceCard
            title="CPU Usage"
            value={performanceMetrics.resourceUsage.cpuUsage}
            unit="%"
            icon={<Cpu className="w-5 h-5" />}
            color="text-red-400"
            threshold={70}
          />
          <ResourceCard
            title="Memory Usage"
            value={performanceMetrics.resourceUsage.memoryUsage}
            unit="%"
            icon={<MemoryStick className="w-5 h-5" />}
            color="text-blue-400"
            threshold={80}
          />
          <ResourceCard
            title="Network I/O"
            value={performanceMetrics.resourceUsage.networkIO}
            unit="MB/s"
            icon={<Network className="w-5 h-5" />}
            color="text-green-400"
            threshold={200}
          />
          <ResourceCard
            title="Storage I/O"
            value={performanceMetrics.resourceUsage.storageIO}
            unit="MB/s"
            icon={<Database className="w-5 h-5" />}
            color="text-yellow-400"
            threshold={150}
          />
        </div>
      </div>

      {/* Throughput Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Throughput Metrics
            </CardTitle>
            <CardDescription className="text-slate-300">
              Operations processed per time unit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div>
                  <div className="text-white font-medium">Voice Connections</div>
                  <div className="text-xs text-slate-400">Active sessions</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">{performanceMetrics.throughput.voiceConnections.perMinute}/min</div>
                  <div className="text-xs text-slate-400">{performanceMetrics.throughput.voiceConnections.perHour}/hr</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div>
                  <div className="text-white font-medium">Memory Queries</div>
                  <div className="text-xs text-slate-400">Database operations</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">{performanceMetrics.throughput.memoryQueries.perMinute}/min</div>
                  <div className="text-xs text-slate-400">{performanceMetrics.throughput.memoryQueries.perHour}/hr</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div>
                  <div className="text-white font-medium">Prompt Generations</div>
                  <div className="text-xs text-slate-400">AI analysis requests</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">{performanceMetrics.throughput.promptGenerations.perMinute}/min</div>
                  <div className="text-xs text-slate-400">{performanceMetrics.throughput.promptGenerations.perHour}/hr</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              Error Tracking
            </CardTitle>
            <CardDescription className="text-slate-300">
              System errors and failure rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-white">{performanceMetrics.errors.errorRate}%</div>
                <div className="text-xs text-slate-400">Overall Error Rate</div>
                <div className="text-xs text-slate-500">
                  {performanceMetrics.errors.totalErrors} errors in last hour
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded bg-slate-700/50">
                  <span className="text-slate-300 text-sm">Voice Connection Errors</span>
                  <Badge variant={performanceMetrics.errors.voiceConnectionErrors === 0 ? 'default' : 'destructive'}>
                    {performanceMetrics.errors.voiceConnectionErrors}
                  </Badge>
                </div>

                <div className="flex justify-between items-center p-2 rounded bg-slate-700/50">
                  <span className="text-slate-300 text-sm">API Timeouts</span>
                  <Badge variant={performanceMetrics.errors.apiTimeouts === 0 ? 'default' : 'destructive'}>
                    {performanceMetrics.errors.apiTimeouts}
                  </Badge>
                </div>

                <div className="flex justify-between items-center p-2 rounded bg-slate-700/50">
                  <span className="text-slate-300 text-sm">Memory Query Errors</span>
                  <Badge variant={performanceMetrics.errors.memoryQueryErrors === 0 ? 'default' : 'destructive'}>
                    {performanceMetrics.errors.memoryQueryErrors}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Performance Trends (Last 7 Days)</CardTitle>
          <CardDescription className="text-slate-300">
            Historical performance data and patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Average Latency (ms)
              </h5>
              <div className="flex items-end gap-2 h-16">
                {performanceHistory.latencyTrend.map((value, index) => (
                  <div
                    key={index}
                    className="bg-blue-500 rounded-t flex-1"
                    style={{ height: `${(value / Math.max(...performanceHistory.latencyTrend)) * 100}%` }}
                    title={`Day ${index + 1}: ${value}ms`}
                  />
                ))}
              </div>
            </div>

            <div>
              <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                Throughput (ops/min)
              </h5>
              <div className="flex items-end gap-2 h-16">
                {performanceHistory.throughputTrend.map((value, index) => (
                  <div
                    key={index}
                    className="bg-green-500 rounded-t flex-1"
                    style={{ height: `${(value / Math.max(...performanceHistory.throughputTrend)) * 100}%` }}
                    title={`Day ${index + 1}: ${value} ops/min`}
                  />
                ))}
              </div>
            </div>

            <div>
              <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                Error Rate (%)
              </h5>
              <div className="flex items-end gap-2 h-16">
                {performanceHistory.errorTrend.map((value, index) => (
                  <div
                    key={index}
                    className="bg-red-500 rounded-t flex-1"
                    style={{ height: `${(value / Math.max(...performanceHistory.errorTrend)) * 100}%` }}
                    title={`Day ${index + 1}: ${value}%`}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};