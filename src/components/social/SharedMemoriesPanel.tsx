import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Share2, 
  Check, 
  X, 
  MessageSquare, 
  Clock, 
  Loader2,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ShareWithMemory {
  id: string;
  memory_id: string;
  sharer_id: string;
  recipient_id: string;
  status: string;
  share_message: string | null;
  change_request_message: string | null;
  created_at: string;
  memory?: {
    id: string;
    title: string;
    text: string;
    memory_date: string | null;
  };
  sharer_name?: string;
  recipient_name?: string;
}

export const SharedMemoriesPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sharedWithMe, setSharedWithMe] = useState<ShareWithMemory[]>([]);
  const [myShares, setMyShares] = useState<ShareWithMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [changeRequestDialog, setChangeRequestDialog] = useState<ShareWithMemory | null>(null);
  const [changeRequestMessage, setChangeRequestMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadShares();
    }
  }, [user?.id]);

  const loadShares = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Load shares where I'm the recipient
      const { data: receivedShares, error: err1 } = await supabase
        .from('memory_shares')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (err1) throw err1;

      // Load shares where I'm the sharer
      const { data: sentShares, error: err2 } = await supabase
        .from('memory_shares')
        .select('*')
        .eq('sharer_id', user.id)
        .order('created_at', { ascending: false });

      if (err2) throw err2;

      // Get memory details and user names
      const allMemoryIds = [...new Set([
        ...(receivedShares?.map(s => s.memory_id) || []),
        ...(sentShares?.map(s => s.memory_id) || [])
      ])];

      const allUserIds = [...new Set([
        ...(receivedShares?.map(s => s.sharer_id) || []),
        ...(sentShares?.map(s => s.recipient_id) || [])
      ])];

      const { data: memories } = await supabase
        .from('memories')
        .select('id, title, text, memory_date')
        .in('id', allMemoryIds);

      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, preferred_name')
        .in('user_id', allUserIds);

      const memoryMap = new Map(memories?.map(m => [m.id, m]));
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name || p.preferred_name || 'Unknown']));

      const enrichReceived = receivedShares?.map(s => ({
        ...s,
        memory: memoryMap.get(s.memory_id),
        sharer_name: profileMap.get(s.sharer_id)
      })) || [];

      const enrichSent = sentShares?.map(s => ({
        ...s,
        memory: memoryMap.get(s.memory_id),
        recipient_name: profileMap.get(s.recipient_id)
      })) || [];

      setSharedWithMe(enrichReceived);
      setMyShares(enrichSent);
    } catch (error) {
      console.error('Error loading shares:', error);
      toast({
        title: 'Failed to load shared memories',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (shareId: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('memory_shares')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', shareId);

      if (error) throw error;

      toast({ title: 'Memory accepted' });
      loadShares();
    } catch (error) {
      console.error('Error accepting share:', error);
      toast({ title: 'Failed to accept', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (shareId: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('memory_shares')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', shareId);

      if (error) throw error;

      toast({ title: 'Memory rejected' });
      loadShares();
    } catch (error) {
      console.error('Error rejecting share:', error);
      toast({ title: 'Failed to reject', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestChange = async () => {
    if (!changeRequestDialog || !changeRequestMessage.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('memory_shares')
        .update({
          status: 'change_requested',
          change_request_message: changeRequestMessage,
          change_request_at: new Date().toISOString()
        })
        .eq('id', changeRequestDialog.id);

      if (error) throw error;

      toast({ title: 'Change request sent' });
      setChangeRequestDialog(null);
      setChangeRequestMessage('');
      loadShares();
    } catch (error) {
      console.error('Error requesting change:', error);
      toast({ title: 'Failed to send request', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-500"><Check className="w-3 h-3 mr-1" /> Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case 'change_requested':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><AlertTriangle className="w-3 h-3 mr-1" /> Change Requested</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingReceived = sharedWithMe.filter(s => s.status === 'pending');
  const acceptedReceived = sharedWithMe.filter(s => s.status === 'accepted');

  return (
    <div className="space-y-6">
      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received" className="gap-2">
            <Users className="w-4 h-4" />
            Shared With Me
            {pendingReceived.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingReceived.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <Share2 className="w-4 h-4" />
            Memories I've Shared
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4 mt-4">
          {sharedWithMe.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No memories have been shared with you yet</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {pendingReceived.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground">Pending</h3>
                  {pendingReceived.map((share) => (
                    <Card key={share.id} className="border-l-4 border-l-yellow-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{share.memory?.title || 'Untitled Memory'}</p>
                            <p className="text-sm text-muted-foreground">From: {share.sharer_name}</p>
                            {share.share_message && (
                              <p className="text-sm mt-2 italic">"{share.share_message}"</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleAccept(share.id)} disabled={isSubmitting}>
                              <Check className="w-4 h-4 mr-1" /> Accept
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setChangeRequestDialog(share)} disabled={isSubmitting}>
                              <MessageSquare className="w-4 h-4 mr-1" /> Request Change
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReject(share.id)} disabled={isSubmitting}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {acceptedReceived.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground">Accepted</h3>
                  {acceptedReceived.map((share) => (
                    <Card key={share.id} className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{share.memory?.title || 'Untitled Memory'}</p>
                            <p className="text-sm text-muted-foreground">From: {share.sharer_name}</p>
                          </div>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4 mt-4">
          {myShares.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Share2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>You haven't shared any memories yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myShares.map((share) => (
                <Card key={share.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{share.memory?.title || 'Untitled Memory'}</p>
                        <p className="text-sm text-muted-foreground">Shared with: {share.recipient_name}</p>
                        {share.status === 'change_requested' && share.change_request_message && (
                          <p className="text-sm mt-2 text-yellow-600">
                            Change requested: "{share.change_request_message}"
                          </p>
                        )}
                      </div>
                      {getStatusBadge(share.status)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Change Request Dialog */}
      <Dialog open={!!changeRequestDialog} onOpenChange={() => setChangeRequestDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Changes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Describe what changes you'd like the memory owner to make before you accept.
            </p>
            <Textarea
              placeholder="Please describe the changes you'd like..."
              value={changeRequestMessage}
              onChange={(e) => setChangeRequestMessage(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRequestDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleRequestChange} disabled={!changeRequestMessage.trim() || isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
