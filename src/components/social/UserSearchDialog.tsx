import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, Check, Clock, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SearchUserResult } from '@/types/social';
import { SendConnectionRequestDialog } from './SendConnectionRequestDialog';

interface UserSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserSearchDialog = ({ open, onOpenChange }: UserSearchDialogProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUserResult | null>(null);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);

  // Debounced search
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || !user?.id) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_users', {
        search_query: query,
        current_user_id: user.id
      });

      if (error) throw error;
      setResults((data as SearchUserResult[]) || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const handleUserClick = (searchResult: SearchUserResult) => {
    if (!searchResult.is_connected && searchResult.connection_status !== 'pending') {
      setSelectedUser(searchResult);
      setShowConnectionDialog(true);
    }
  };

  const getStatusBadge = (result: SearchUserResult) => {
    if (result.is_connected) {
      return <Badge variant="secondary" className="gap-1"><Check className="w-3 h-3" /> Connected</Badge>;
    }
    if (result.connection_status === 'pending') {
      return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
    }
    return null;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Find People
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            <div className="min-h-[200px] max-h-[300px] overflow-y-auto">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {!isLoading && searchQuery && results.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found matching "{searchQuery}"
                </div>
              )}

              {!isLoading && !searchQuery && (
                <div className="text-center py-8 text-muted-foreground">
                  Start typing to search for people
                </div>
              )}

              {!isLoading && results.length > 0 && (
                <div className="space-y-2">
                  {results.map((result) => (
                    <div
                      key={result.user_id}
                      className={`p-3 rounded-lg border transition-colors ${
                        result.is_connected || result.connection_status === 'pending'
                          ? 'bg-muted/30 cursor-default'
                          : 'hover:bg-muted/50 cursor-pointer'
                      }`}
                      onClick={() => handleUserClick(result)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {result.display_name || result.preferred_name || 'Anonymous'}
                          </p>
                          {result.location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {result.location}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(result)}
                          {!result.is_connected && result.connection_status !== 'pending' && (
                            <Button size="sm" variant="outline" className="gap-1">
                              <UserPlus className="w-4 h-4" />
                              Connect
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedUser && (
        <SendConnectionRequestDialog
          open={showConnectionDialog}
          onOpenChange={setShowConnectionDialog}
          targetUser={selectedUser}
          onSuccess={() => {
            setShowConnectionDialog(false);
            searchUsers(searchQuery); // Refresh results
          }}
        />
      )}
    </>
  );
};
