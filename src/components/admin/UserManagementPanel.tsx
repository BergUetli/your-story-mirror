import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Users, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserData {
  user_id: string;
  email: string | null;
  name: string | null;
  onboarding_completed: boolean;
  created_at: string;
}

interface UserRole {
  role: string;
}

interface PresenceState {
  [key: string]: Array<{
    user_id: string;
    online_at: string;
  }>;
}

export const UserManagementPanel = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch users from database
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('user_id, email, name, onboarding_completed, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch users',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [toast]);

  // Fetch user roles
  useEffect(() => {
    const fetchUserRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('user_id, role');

        if (error) throw error;

        // Group roles by user_id
        const rolesMap: Record<string, string[]> = {};
        data?.forEach((roleData) => {
          if (!rolesMap[roleData.user_id]) {
            rolesMap[roleData.user_id] = [];
          }
          rolesMap[roleData.user_id].push(roleData.role);
        });

        setUserRoles(rolesMap);
      } catch (error) {
        console.error('Error fetching user roles:', error);
      }
    };

    fetchUserRoles();
  }, []);

  // Track online users with realtime presence
  useEffect(() => {
    const channel = supabase.channel('admin-user-presence');

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState() as PresenceState;
        const onlineUserIds = new Set<string>();
        
        Object.values(presenceState).forEach((presences) => {
          presences.forEach((presence) => {
            if (presence.user_id) {
              onlineUserIds.add(presence.user_id);
            }
          });
        });

        setOnlineUsers(onlineUserIds);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this admin session
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleUserExpansion = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          User Management
        </CardTitle>
        <CardDescription className="text-slate-300">
          View and manage system users, their roles, and online status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-4 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <Circle className="w-3 h-3 fill-green-500 text-green-500" />
            <span>Online: {onlineUsers.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="w-3 h-3 fill-slate-500 text-slate-500" />
            <span>Offline: {users.length - onlineUsers.size}</span>
          </div>
          <div className="ml-auto">
            <span>Total Users: {users.length}</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-900/50">
              <TableRow className="border-slate-700 hover:bg-slate-900/50">
                <TableHead className="text-slate-300 w-10"></TableHead>
                <TableHead className="text-slate-300 w-10">Status</TableHead>
                <TableHead className="text-slate-300">Email</TableHead>
                <TableHead className="text-slate-300">Name</TableHead>
                <TableHead className="text-slate-300">Onboarding</TableHead>
                <TableHead className="text-slate-300">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isOnline = onlineUsers.has(user.user_id);
                const isExpanded = expandedUser === user.user_id;
                const roles = userRoles[user.user_id] || [];

                return (
                  <>
                    <TableRow 
                      key={user.user_id} 
                      className="border-slate-700 hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => toggleUserExpansion(user.user_id)}
                    >
                      <TableCell className="text-slate-300">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Circle
                          className={`w-3 h-3 ${
                            isOnline
                              ? 'fill-green-500 text-green-500'
                              : 'fill-slate-500 text-slate-500'
                          }`}
                        />
                      </TableCell>
                      <TableCell className="text-slate-300 font-mono text-sm">
                        {user.email || 'N/A'}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {user.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.onboarding_completed ? 'default' : 'outline'}
                          className={
                            user.onboarding_completed
                              ? 'bg-green-500/20 text-green-300 border-green-500/50'
                              : 'border-slate-600 text-slate-400'
                          }
                        >
                          {user.onboarding_completed ? 'Complete' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="border-slate-700 bg-slate-900/30">
                        <TableCell colSpan={6} className="p-4">
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-sm font-medium text-slate-300 mb-2">User ID</h4>
                              <code className="text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded font-mono">
                                {user.user_id}
                              </code>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-slate-300 mb-2">Roles</h4>
                              <div className="flex gap-2">
                                {roles.length > 0 ? (
                                  roles.map((role) => (
                                    <Badge
                                      key={role}
                                      variant={getRoleBadgeVariant(role)}
                                    >
                                      {role}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-sm text-slate-400">No roles assigned</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
