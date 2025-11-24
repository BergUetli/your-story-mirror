import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MemoryInsightsDisplayProps {
  memoryId: string;
}

interface Insights {
  people: string[];
  places: string[];
  dates: string[];
  events: string[];
  themes: string[];
  emotions: string[];
  objects: string[];
  relationships: string[];
  time_periods: string[];
}

interface ProcessedMemory {
  insights: Insights;
  core_data: {
    title: string;
    memory_date: string | null;
    memory_location: string | null;
    summary: string;
  };
  conversation_context: {
    key_moments: string[];
    emotional_tone: string;
    narrative_arc: string;
  };
  metadata: {
    word_count: number;
    confidence_scores: {
      date_extraction: number;
      location_extraction: number;
      people_extraction: number;
    };
  };
}

export function MemoryInsightsDisplay({ memoryId }: MemoryInsightsDisplayProps) {
  const [insights, setInsights] = useState<ProcessedMemory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [memoryId]);

  async function loadInsights() {
    try {
      const { data, error } = await supabase
        .from("memory_insights")
        .select("*")
        .eq("memory_id", memoryId)
        .single();

      if (error) throw error;

      setInsights({
        insights: data.insights,
        core_data: {
          title: data.insights.title || "",
          memory_date: data.insights.memory_date || null,
          memory_location: data.insights.memory_location || null,
          summary: data.insights.summary || "",
        },
        conversation_context: data.conversation_context,
        metadata: data.metadata,
      });
    } catch (error) {
      console.error("Error loading insights:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="text-sm text-muted-foreground">
        No insights available yet. Processing may take a moment.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Core Data */}
      <div>
        <h3 className="text-xl font-semibold mb-2">{insights.core_data.title}</h3>
        <p className="text-muted-foreground">{insights.core_data.summary}</p>
        
        <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
          {insights.core_data.memory_date && (
            <span>📅 {insights.core_data.memory_date}</span>
          )}
          {insights.core_data.memory_location && (
            <span>📍 {insights.core_data.memory_location}</span>
          )}
        </div>
      </div>

      {/* Emotional Tone */}
      {insights.conversation_context.emotional_tone && (
        <div>
          <h4 className="font-medium text-sm mb-2">Emotional Tone</h4>
          <p className="text-muted-foreground italic text-sm">
            {insights.conversation_context.emotional_tone}
          </p>
        </div>
      )}

      {/* Key Moments */}
      {insights.conversation_context.key_moments.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-2">Key Moments</h4>
          <ul className="list-disc list-inside space-y-1">
            {insights.conversation_context.key_moments.map((moment, i) => (
              <li key={i} className="text-muted-foreground text-sm">{moment}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags Grid */}
      <div className="grid grid-cols-2 gap-4">
        {insights.insights.people.length > 0 && (
          <TagSection title="👥 People" items={insights.insights.people} />
        )}
        {insights.insights.places.length > 0 && (
          <TagSection title="📍 Places" items={insights.insights.places} />
        )}
        {insights.insights.events.length > 0 && (
          <TagSection title="🎉 Events" items={insights.insights.events} />
        )}
        {insights.insights.themes.length > 0 && (
          <TagSection title="💭 Themes" items={insights.insights.themes} />
        )}
        {insights.insights.emotions.length > 0 && (
          <TagSection title="❤️ Emotions" items={insights.insights.emotions} />
        )}
        {insights.insights.relationships.length > 0 && (
          <TagSection title="🤝 Relationships" items={insights.insights.relationships} />
        )}
      </div>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground pt-4 border-t">
        <div className="flex justify-between">
          <span>{insights.metadata.word_count} words</span>
          <span>
            Confidence: Date {(insights.metadata.confidence_scores.date_extraction * 100).toFixed(0)}% 
            | Location {(insights.metadata.confidence_scores.location_extraction * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function TagSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h5 className="text-sm font-medium mb-2">{title}</h5>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
