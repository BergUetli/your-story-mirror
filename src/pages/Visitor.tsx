import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Clock, User } from 'lucide-react';
import databaseMemoryService, { DatabaseMemory } from '@/services/databaseMemoryService';
import Solin from '@/components/Solin';

const Visitor = () => {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const [memories, setMemories] = useState<DatabaseMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);

  const visitorId = searchParams.get('visitor') || `visitor_${Date.now()}`;

  useEffect(() => {
    if (userId) {
      loadPublicMemories();
    }
  }, [userId]);

  const loadPublicMemories = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const publicMemories = await databaseMemoryService.getPublicMemories(userId);
      setMemories(publicMemories);
      
      // Log the visit (for analytics)
      if (publicMemories.length > 0) {
        await databaseMemoryService.logMemoryView(
          publicMemories[0].id,
          userId,
          visitorId
        );
      }
    } catch (error) {
      console.error('Failed to load public memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemoryView = async (memoryId: string) => {
    if (userId) {
      await databaseMemoryService.logMemoryView(memoryId, userId, visitorId);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading memories...</p>
        </div>
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Public Memories</h3>
            <p className="text-muted-foreground">
              This person hasn't shared any public memories yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Shared Memories</h1>
        <p className="text-muted-foreground">
          Exploring the life stories that {ownerProfile?.name || 'someone'} wanted to share
        </p>
        <div className="flex justify-center items-center gap-4 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span>{memories.length} memories</span>
          </div>
        </div>
      </div>

      {/* Memories Grid */}
      <div className="space-y-6 mb-8">
        {memories.map((memory) => (
          <Card 
            key={memory.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleMemoryView(memory.id)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">{memory.title}</CardTitle>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 mr-1" />
                  {new Date(memory.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                {memory.text}
              </p>
              
              {memory.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {memory.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                Shared publicly • {new Date(memory.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Floating Solin companion for visitor mode */}
      <Solin 
        mode="visitor" 
        visitorPermissions={['public']}
        defaultView="chat"
      />

      {/* Footer */}
      <div className="text-center py-8 border-t">
        <p className="text-sm text-muted-foreground">
          These memories are shared with love and intention. 
          <br />
          Thank you for taking the time to read them.
        </p>
      </div>
    </div>
  );
};

export default Visitor;