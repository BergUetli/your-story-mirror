import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SearchUserResult, RELATIONSHIP_TYPES } from '@/types/social';

interface SendConnectionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: SearchUserResult;
  onSuccess: () => void;
}

export const SendConnectionRequestDialog = ({
  open,
  onOpenChange,
  targetUser,
  onSuccess
}: SendConnectionRequestDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [relationshipType, setRelationshipType] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id || !relationshipType) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('user_connections')
        .insert({
          requester_id: user.id,
          addressee_id: targetUser.user_id,
          relationship_type: relationshipType,
          relationship_label: relationshipType === 'other' ? customLabel : null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Connection request sent',
        description: `Your request has been sent to ${targetUser.display_name || targetUser.preferred_name || 'this user'}.`
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast({
        title: 'Failed to send request',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Connect with {targetUser.display_name || targetUser.preferred_name || 'User'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>How do you know this person?</Label>
            <Select value={relationshipType} onValueChange={setRelationshipType}>
              <SelectTrigger>
                <SelectValue placeholder="Select relationship..." />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {relationshipType === 'other' && (
            <div className="space-y-2">
              <Label>Describe your relationship</Label>
              <Input
                placeholder="e.g., Childhood neighbor, Former teacher..."
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Add a message (optional)</Label>
            <Textarea
              placeholder="Hi! I'd love to connect and share memories together..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!relationshipType || (relationshipType === 'other' && !customLabel) || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
