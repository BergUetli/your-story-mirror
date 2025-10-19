import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageCircle, 
  Clock, 
  AlertTriangle,
  Brain,
  Mic,
  Database,
  Zap
} from 'lucide-react';

interface MetricsData {
  activeConnections: number;
  totalMemories: number;
  voiceSessionsToday: number;
  averageResponseTime: number;
  errorRate: number;
}

interface MetricsPanelProps {
  metrics: MetricsData;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  const [historicalData, setHistoricalData] = useState({
    voiceSessionsHistory: [12, 19, 8, 25, 14, 31, 22],
    responseTimeHistory: [180, 165, 142, 188, 156, 173, 149],
    errorRateHistory: [2.1, 1.8, 0.9, 3.2, 1.5, 0.7, 1.2],
    memoryGrowthHistory: [145, 167, 189, 203, 225, 251, 268]
  });

  const [intelligentPromptingMetrics, setIntelligentPromptingMetrics] = useState({
    analysisRequestsToday: 34,
    avgAnalysisTime: 245,
    followUpQuestionsGenerated: 128,
    memoryPatternMatches: 89,
    conversationStartersUsed: 56,
    reflectionPromptsCreated: 23
  });

  const [voiceAgentMetrics, setVoiceAgentMetrics] = useState({
    totalConversationTime: 2847, // seconds
    averageConversationLength: 387, // seconds
    successfulConnections: 42,
    failedConnections: 3,
    audioQualityScore: 94.2,
    userSatisfactionScore: 4.7
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setIntelligentPromptingMetrics(prev => ({
        ...prev,
        analysisRequestsToday: prev.analysisRequestsToday + Math.floor(Math.random() * 2),
        followUpQuestionsGenerated: prev.followUpQuestionsGenerated + Math.floor(Math.random() * 3)
      }));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    changeType, 
    icon, 
    description,
    color = "text-purple-400"
  }: {
    title: string;
    value: string | number;
    change?: number;
    changeType?: 'up' | 'down';
    icon: React.ReactNode;
    description: string;
    color?: string;
  }) => (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`${color}`}>{icon}</div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-xs ${
              changeType === 'up' ? 'text-green-500' : 'text-red-500'
            }`}>
              {changeType === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        <div className="text-xs text-slate-400">{title}</div>
        <div className="text-xs text-slate-500 mt-1">{description}</div>
      </CardContent>
    </Card>
  );

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Core System Metrics */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          Core System Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Active Connections"
            value={metrics.activeConnections}
            change={12}
            changeType="up"
            icon={<Users className="w-5 h-5" />}
            description="Real-time voice sessions"
            color="text-blue-400"
          />
          <MetricCard
            title="Total Memories"
            value={metrics.totalMemories.toLocaleString()}
            change={8}
            changeType="up"
            icon={<Database className="w-5 h-5" />}
            description="Stored in system"
            color="text-green-400"
          />
          <MetricCard
            title="Sessions Today"
            value={metrics.voiceSessionsToday}
            change={15}
            changeType="up"
            icon={<MessageCircle className="w-5 h-5" />}
            description="Voice conversations"
            color="text-purple-400"
          />
          <MetricCard
            title="Avg Response Time"
            value={`${metrics.averageResponseTime}ms`}
            change={5}
            changeType="down"
            icon={<Clock className="w-5 h-5" />}
            description="ElevenLabs response"
            color="text-yellow-400"
          />
        </div>
      </div>

      {/* Intelligent Prompting System Metrics */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-green-400" />
          Intelligent Memory Prompting
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="Analysis Requests Today"
            value={intelligentPromptingMetrics.analysisRequestsToday}
            change={23}
            changeType="up"
            icon={<Brain className="w-5 h-5" />}
            description="Memory pattern analyses"
            color="text-green-400"
          />
          <MetricCard
            title="Follow-up Questions"
            value={intelligentPromptingMetrics.followUpQuestionsGenerated}
            change={18}
            changeType="up"
            icon={<MessageCircle className="w-5 h-5" />}
            description="Generated today"
            color="text-blue-400"
          />
          <MetricCard
            title="Pattern Matches"
            value={intelligentPromptingMetrics.memoryPatternMatches}
            change={7}
            changeType="up"
            icon={<TrendingUp className="w-5 h-5" />}
            description="Successful matches"
            color="text-purple-400"
          />
          <MetricCard
            title="Conversation Starters"
            value={intelligentPromptingMetrics.conversationStartersUsed}
            change={11}
            changeType="up"
            icon={<MessageCircle className="w-5 h-5" />}
            description="Used in conversations"
            color="text-yellow-400"
          />
          <MetricCard
            title="Avg Analysis Time"
            value={`${intelligentPromptingMetrics.avgAnalysisTime}ms`}
            change={3}
            changeType="down"
            icon={<Clock className="w-5 h-5" />}
            description="Memory processing"
            color="text-green-400"
          />
          <MetricCard
            title="Reflection Prompts"
            value={intelligentPromptingMetrics.reflectionPromptsCreated}
            change={28}
            changeType="up"
            icon={<Brain className="w-5 h-5" />}
            description="Created today"
            color="text-purple-400"
          />
        </div>
      </div>

      {/* Voice Agent Performance */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Mic className="w-5 h-5 text-purple-400" />
          Voice Agent Performance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Talk Time"
            value={formatDuration(voiceAgentMetrics.totalConversationTime)}
            change={25}
            changeType="up"
            icon={<Clock className="w-5 h-5" />}
            description="Today across all users"
            color="text-purple-400"
          />
          <MetricCard
            title="Avg Session Length"
            value={formatDuration(voiceAgentMetrics.averageConversationLength)}
            change={12}
            changeType="up"
            icon={<MessageCircle className="w-5 h-5" />}
            description="Per conversation"
            color="text-blue-400"
          />
          <MetricCard
            title="Connection Success"
            value={`${Math.round((voiceAgentMetrics.successfulConnections / (voiceAgentMetrics.successfulConnections + voiceAgentMetrics.failedConnections)) * 100)}%`}
            change={2}
            changeType="up"
            icon={<Zap className="w-5 h-5" />}
            description={`${voiceAgentMetrics.successfulConnections}/${voiceAgentMetrics.successfulConnections + voiceAgentMetrics.failedConnections} attempts`}
            color="text-green-400"
          />
          <MetricCard
            title="Audio Quality"
            value={`${voiceAgentMetrics.audioQualityScore}%`}
            change={1}
            changeType="up"
            icon={<Mic className="w-5 h-5" />}
            description="User reported quality"
            color="text-yellow-400"
          />
        </div>
      </div>

      {/* System Health Overview */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            System Health Overview
          </CardTitle>
          <CardDescription className="text-slate-300">
            Key performance indicators and alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-white font-medium">Memory System Performance</span>
              </div>
              <Badge variant="default" className="bg-green-600 text-white">Excellent</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-white font-medium">ElevenLabs API Response</span>
              </div>
              <Badge variant="default" className="bg-blue-600 text-white">Good</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-white font-medium">Database Query Performance</span>
              </div>
              <Badge variant="outline" className="border-yellow-500 text-yellow-500">Monitoring</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-white font-medium">Intelligent Prompting Accuracy</span>
              </div>
              <Badge variant="default" className="bg-purple-600 text-white">Optimal</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historical Trends */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Historical Trends (Last 7 Days)</CardTitle>
          <CardDescription className="text-slate-300">
            Performance trends and patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-medium mb-3">Voice Sessions per Day</h4>
              <div className="flex items-end gap-2 h-20">
                {historicalData.voiceSessionsHistory.map((value, index) => (
                  <div
                    key={index}
                    className="bg-purple-500 rounded-t flex-1"
                    style={{ height: `${(value / Math.max(...historicalData.voiceSessionsHistory)) * 100}%` }}
                    title={`Day ${index + 1}: ${value} sessions`}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-medium mb-3">Memory Growth</h4>
              <div className="flex items-end gap-2 h-20">
                {historicalData.memoryGrowthHistory.map((value, index) => (
                  <div
                    key={index}
                    className="bg-green-500 rounded-t flex-1"
                    style={{ height: `${(value / Math.max(...historicalData.memoryGrowthHistory)) * 100}%` }}
                    title={`Day ${index + 1}: ${value} memories`}
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