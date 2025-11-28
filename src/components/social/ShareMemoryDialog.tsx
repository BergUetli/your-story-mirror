import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Share2, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ConnectedUser } from '@/types/social';

interface ShareMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memoryId: string;
  memoryTitle: string;
  onSuccess?: () => void;
}

interface ConnectedUserWithProfile extends ConnectedUser {
  display_name?: string;
  preferred_name?: string;
}

export const ShareMemoryDialog = ({
  open,
  onOpenChange,
  memoryId,
  memoryTitle,
  onSuccess
}: ShareMemoryDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<ConnectedUserWithProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && user?.id) {
      loadConnections();
    }
  }, [open, user?.id]);

  const loadConnections = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Get connected users
      const { data: connectedUsers, error } = await supabase.rpc('get_connected_users', {
        target_user_id: user.id
      });

      if (error) throw error;

      // Fetch display names for each connected user
      const userIds = (connectedUsers as ConnectedUser[])?.map(u => u.user_id) || [];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, display_name, preferred_name')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
        
        const enrichedConnections = (connectedUsers as ConnectedUser[])?.map(conn => ({
          ...conn,
          display_name: profileMap.get(conn.user_id)?.display_name,
          preferred_name: profileMap.get(conn.user_id)?.preferred_name
        })) || [];

        setConnections(enrichedConnections);
      } else {
        setConnections([]);
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

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleShare = async () => {
    if (!user?.id || selectedUsers.length === 0) return;

    setIsSubmitting(true);
    try {
      // Create share records for each selected user
      const shareRecords = selectedUsers.map(recipientId => ({
        memory_id: memoryId,
        sharer_id: user.id,
        recipient_id: recipientId,
        share_message: message || null,
        status: 'pending'
      }));

      const { error } = await supabase
        .from('memory_shares')
        .insert(shareRecords);

      if (error) throw error;

      toast({
        title: 'Memory shared',
        description: `Shared with ${selectedUsers.length} ${selectedUsers.length === 1 ? 'person' : 'people'}.`
      });

      setSelectedUsers([]);
      setMessage('');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error sharing memory:', error);
      toast({
        title: 'Failed to share memory',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDisplayName = (conn: ConnectedUserWithProfile) => {
    return conn.display_name || conn.preferred_name || 'Unknown User';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Memory
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share "<span className="font-medium">{memoryTitle}</span>" with your connections
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No connections yet</p>
              <p className="text-sm text-muted-foreground">Connect with family and friends to share memories</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Select recipients</Label>
                <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-lg p-2">
                  {connections.map((conn) => (
                    <div
                      key={conn.user_id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleUser(conn.user_id)}
                    >
                      <Checkbox
                        checked={selectedUsers.includes(conn.user_id)}
                        onCheckedChange={() => toggleUser(conn.user_id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{getDisplayName(conn)}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {conn.relationship_label || conn.relationship_type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Add a message (optional)</Label>
                <Textarea
                  placeholder="I wanted to share this memory with you..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={selectedUsers.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              `Share with ${selectedUsers.length || ''} ${selectedUsers.length === 1 ? 'person' : 'people'}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
