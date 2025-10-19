import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Calendar,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { aiVoiceSearch, VoiceSearchResult } from '@/services/aiVoiceSearch';
import { AudioPlayer } from '@/components/AudioPlayer';

interface EnhancedVoiceSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EnhancedVoiceSearch = ({ open, onOpenChange }: EnhancedVoiceSearchProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<VoiceSearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<VoiceSearchResult | null>(null);

  // AI-powered voice search
  const handleSearch = async () => {
    if (!user?.id || !searchQuery.trim()) return;

    setIsSearching(true);
    try {
      console.log('🤖 Starting AI-powered voice search for:', searchQuery);

      // Use the new AI voice search service
      const results = await aiVoiceSearch.searchVoiceRecordings(user.id, searchQuery.trim(), 20);
      
      setSearchResults(results);
      console.log('✅ AI search found recordings:', results.length);

      if (results.length === 0) {
        toast({
          title: 'No results found',
          description: `No voice recordings found matching "${searchQuery}". Try different keywords or create some memories first.`,
        });
      } else {
        toast({
          title: '🤖 AI Search Complete',
          description: `Found ${results.length} relevant recordings using semantic understanding`,
        });
      }
    } catch (error) {
      console.error('❌ AI voice search error:', error);
      toast({
        title: 'AI Search Failed',
        description: error instanceof Error ? error.message : 'Unknown search error. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI-Powered Voice Search
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🤖 Smart search: 'Chicago Booth graduation', 'family memories', 'work discussions'..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch} 
              disabled={isSearching || !searchQuery.trim()}
              className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              AI Search
            </Button>
          </div>

          {/* Audio Player (when audio is selected) */}
          {selectedResult && (
            <div className="space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Now Playing (Relevance: {Math.round((selectedResult.relevance_score || 0) * 100)}%)
              </h3>
              <AudioPlayer 
                recording={selectedResult}
                searchQuery={searchQuery}
                autoSeekToMatch={true}
              />
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Search className="w-4 h-4" />
                AI Search Results ({searchResults.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <Card 
                    key={result.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedResult?.id === result.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-primary/30'
                    }`}
                    onClick={() => setSelectedResult(result)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {new Date(result.created_at).toLocaleDateString()}
                            </span>
                            <Badge 
                              variant="outline" 
                              className="text-xs bg-gradient-to-r from-purple-100 to-blue-100 border-purple-300"
                            >
                              {Math.round(result.duration_seconds)}s • {Math.round((result.relevance_score || 0) * 100)}% match
                            </Badge>
                          </div>
                          
                          {/* Matched Content Preview */}
                          {result.matched_content && (
                            <p className="text-sm text-foreground bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border-l-2 border-yellow-400 mb-2">
                              <strong>Match:</strong> {result.matched_content}
                            </p>
                          )}
                          
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {result.conversation_summary}
                          </p>
                          
                          {/* Memory Titles */}
                          {result.memory_titles && result.memory_titles.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {result.memory_titles.slice(0, 2).map((title, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  📝 {title}
                                </Badge>
                              ))}
                              {result.memory_titles.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{result.memory_titles.length - 2} memories
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {/* Topics */}
                          {result.topics && result.topics.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {result.topics.slice(0, 3).map((topic, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  🏷️ {topic}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <Button
                          variant={selectedResult?.id === result.id ? "default" : "outline"}
                          size="sm"
                          className="gap-1 flex-shrink-0"
                        >
                          {selectedResult?.id === result.id ? (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Selected
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4" />
                              Analyze
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* AI Features Info */}
          <div className="text-sm text-muted-foreground bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="font-medium mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              🤖 AI-Powered Search Features:
            </p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Semantic Understanding:</strong> Finds relevant conversations even with different words</li>
              <li>• <strong>Intelligent Matching:</strong> Understands context, topics, and memory connections</li>
              <li>• <strong>Precision Seeking:</strong> Automatically jumps to relevant parts of conversations</li>
              <li>• <strong>Smart Relevance:</strong> Shows match percentage and highlights key content</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};