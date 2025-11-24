import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWhatsAppMemories } from "@/hooks/useWhatsAppMemories";
import { Calendar, MapPin, Tag, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function WhatsAppMemoriesPanel() {
  const { memories, loading, error, refresh } = useWhatsAppMemories();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            WhatsApp Memories
          </CardTitle>
          <CardDescription>
            Memories created via WhatsApp conversations
          </CardDescription>
        </div>
        <Button onClick={refresh} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-sm text-destructive mb-4">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            {error}
          </div>
        )}

        {loading && !memories.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm">Loading memories...</p>
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No WhatsApp memories yet</p>
            <p className="text-xs mt-1">Memories will appear here after conversations with Solin</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {memories.map((memory) => (
              <div
                key={memory.id}
                className="border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors"
              >
                {/* Title and Status */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm flex-1">
                    {memory.title}
                  </h3>
                  {memory.metadata?.ai_extracted ? (
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      AI Processed
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Processing...
                    </Badge>
                  )}
                </div>

                {/* Summary */}
                {memory.metadata?.summary && (
                  <p className="text-sm text-muted-foreground">
                    {memory.metadata.summary}
                  </p>
                )}

                {/* Date and Location */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {memory.memory_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {memory.memory_date}
                    </div>
                  )}
                  {memory.memory_location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {memory.memory_location}
                    </div>
                  )}
                  {!memory.memory_date && !memory.memory_location && (
                    <span className="text-yellow-600">
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      Missing date/location - won't appear on timeline
                    </span>
                  )}
                </div>

                {/* Tags */}
                {memory.tags && memory.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {memory.tags.slice(0, 8).map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {memory.tags.length > 8 && (
                      <Badge variant="outline" className="text-xs">
                        +{memory.tags.length - 8} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-muted-foreground pt-2 border-t flex justify-between">
                  <span>
                    Created {formatDistanceToNow(new Date(memory.created_at), { addSuffix: true })}
                  </span>
                  {memory.metadata?.confidence && (
                    <span>
                      Confidence: Date {(memory.metadata.confidence.date * 100).toFixed(0)}%
                      {memory.metadata.confidence.location > 0 && 
                        ` | Loc ${(memory.metadata.confidence.location * 100).toFixed(0)}%`
                      }
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {memories.length > 0 && (
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{memories.length}</div>
              <div className="text-xs text-muted-foreground">Total Memories</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {memories.filter(m => m.memory_date).length}
              </div>
              <div className="text-xs text-muted-foreground">With Dates</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {memories.filter(m => m.metadata?.ai_extracted).length}
              </div>
              <div className="text-xs text-muted-foreground">AI Processed</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
