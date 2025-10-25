import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export const ElevenLabsCreditsPanel = () => {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['elevenlabs-credits'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('elevenlabs-credits');
      
      if (error) {
        console.error('Error fetching ElevenLabs credits:', error);
        throw error;
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Credits refreshed');
    } catch (err) {
      toast.error('Failed to refresh credits');
    }
  };

  const formatDate = (unix: number | null) => {
    if (!unix) return 'N/A';
    return new Date(unix * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = () => {
    if (!data?.percentUsed) return 'text-muted-foreground';
    const percent = parseFloat(data.percentUsed);
    if (percent >= 90) return 'text-destructive';
    if (percent >= 75) return 'text-warning';
    return 'text-success';
  };

  const getStatusIcon = () => {
    if (!data?.percentUsed) return null;
    const percent = parseFloat(data.percentUsed);
    if (percent >= 90) return <AlertCircle className="h-5 w-5 text-destructive" />;
    return <CheckCircle className="h-5 w-5 text-success" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>ElevenLabs Credits</CardTitle>
            <CardDescription>Voice AI subscription and usage</CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading || isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="text-destructive text-sm">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            Error loading credits: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        )}
        
        {isLoading && !data && (
          <div className="text-muted-foreground text-sm">Loading credits information...</div>
        )}
        
        {data && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subscription Tier</span>
                <span className="font-semibold capitalize">{data.tier}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Characters Used</span>
                <span className="font-semibold">
                  {data.characterCount?.toLocaleString()} / {data.characterLimit?.toLocaleString()}
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Usage</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <span className={`font-semibold ${getStatusColor()}`}>
                      {data.percentUsed}%
                    </span>
                  </div>
                </div>
                <Progress value={parseFloat(data.percentUsed)} className="h-2" />
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Remaining Characters</span>
                <span className="font-semibold">
                  {data.remainingCharacters?.toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Resets On</span>
                <span className="font-semibold">
                  {formatDate(data.nextCharacterCountResetUnix)}
                </span>
              </div>
            </div>
            
            {parseFloat(data.percentUsed) >= 90 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-destructive mb-1">Low Credits Warning</p>
                    <p className="text-muted-foreground">
                      You're running low on ElevenLabs credits. Consider upgrading your plan or wait for the reset.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
