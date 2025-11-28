import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserPlus, 
  Check, 
  X, 
  Clock, 
  Loader2,
  Search,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { UserSearchDialog } from '@/components/social/UserSearchDialog';
import { SharedMemoriesPanel } from '@/components/social/SharedMemoriesPanel';

interface ConnectionWithProfile {
  id: string;
  requester_id: string;
  addressee_id: string;
  relationship_type: string;
  relationship_label: string | null;
  status: string;
  created_at: string;
  other_user_id: string;
  other_user_name?: string;
  is_requester: boolean;
}

const Connections = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<ConnectionWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadConnections();
    }
  }, [user?.id]);

  const loadConnections = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_connections')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get other user IDs and fetch their profiles
      const processed = data?.map(conn => ({
        ...conn,
        other_user_id: conn.requester_id === user.id ? conn.addressee_id : conn.requester_id,
        is_requester: conn.requester_id === user.id
      })) || [];

      const otherUserIds = processed.map(c => c.other_user_id);
      
      if (otherUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, display_name, preferred_name')
          .in('user_id', otherUserIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name || p.preferred_name || 'Unknown']));
        
        const enriched = processed.map(conn => ({
          ...conn,
          other_user_name: profileMap.get(conn.other_user_id)
        }));

        setConnections(enriched);
      } else {
        setConnections(processed);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      toast({
        title: 'Failed to load connections',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (connectionId: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('user_connections')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', connectionId);

      if (error) throw error;

      toast({ title: 'Connection accepted!' });
      loadConnections();
    } catch (error) {
      console.error('Error accepting connection:', error);
      toast({ title: 'Failed to accept', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (connectionId: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('user_connections')
        .update({ status: 'rejected' })
        .eq('id', connectionId);

      if (error) throw error;

      toast({ title: 'Connection rejected' });
      loadConnections();
    } catch (error) {
      console.error('Error rejecting connection:', error);
      toast({ title: 'Failed to reject', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (connectionId: string) => {
    if (!confirm('Are you sure you want to remove this connection?')) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      toast({ title: 'Connection removed' });
      loadConnections();
    } catch (error) {
      console.error('Error removing connection:', error);
      toast({ title: 'Failed to remove', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (connectionId: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      toast({ title: 'Request cancelled' });
      loadConnections();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({ title: 'Failed to cancel', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const incomingRequests = connections.filter(c => c.status === 'pending' && !c.is_requester);
  const outgoingRequests = connections.filter(c => c.status === 'pending' && c.is_requester);
  const acceptedConnections = connections.filter(c => c.status === 'accepted');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Connections</h1>
            <p className="text-muted-foreground">Manage your family and friends</p>
          </div>
          <Button onClick={() => setIsSearchOpen(true)} className="gap-2">
            <Search className="w-4 h-4" />
            Find People
          </Button>
        </div>

        <Tabs defaultValue="connections" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connections" className="gap-2">
              <Users className="w-4 h-4" />
              Connections
              {incomingRequests.length > 0 && (
                <Badge variant="destructive">{incomingRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="shared" className="gap-2">
              Shared Memories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="space-y-6">
            {/* Incoming Requests */}
            {incomingRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Incoming Requests
                    <Badge variant="destructive">{incomingRequests.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {incomingRequests.map((conn) => (
                    <div key={conn.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{conn.other_user_name || 'Unknown User'}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          Wants to connect as: {conn.relationship_label || conn.relationship_type}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAccept(conn.id)} disabled={isSubmitting}>
                          <Check className="w-4 h-4 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(conn.id)} disabled={isSubmitting}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Pending Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {outgoingRequests.map((conn) => (
                    <div key={conn.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{conn.other_user_name || 'Unknown User'}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {conn.relationship_label || conn.relationship_type}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleCancel(conn.id)} disabled={isSubmitting}>
                        Cancel
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Active Connections */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  My Connections
                  {acceptedConnections.length > 0 && (
                    <Badge variant="secondary">{acceptedConnections.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {acceptedConnections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No connections yet</p>
                    <p className="text-sm">Search for people to connect with</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {acceptedConnections.map((conn) => (
                      <div key={conn.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{conn.other_user_name || 'Unknown User'}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {conn.relationship_label || conn.relationship_type}
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleRemove(conn.id)} disabled={isSubmitting}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shared">
            <SharedMemoriesPanel />
          </TabsContent>
        </Tabs>
      </div>

      <UserSearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
  );
};

export default Connections;
