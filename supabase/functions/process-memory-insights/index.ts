import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types
interface MemoryInsights {
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

interface MemoryCoreData {
  title: string;
  memory_date: string | null;
  memory_location: string | null;
  summary: string;
}

interface ProcessedMemory {
  memory_id: string;
  insights: MemoryInsights;
  core_data: MemoryCoreData;
  conversation_context: {
    key_moments: string[];
    emotional_tone: string;
    narrative_arc: string;
  };
  metadata: {
    word_count: number;
    estimated_time_span: string | null;
    confidence_scores: {
      date_extraction: number;
      location_extraction: number;
      people_extraction: number;
    };
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { memory_id, conversation_text, user_id } = await req.json();

    if (!memory_id || !conversation_text) {
      throw new Error("Missing required fields: memory_id, conversation_text");
    }

    console.log(`[ProcessInsights] Starting processing for memory: ${memory_id}`);
    
    // Get the original conversation text to archive it
    const { data: existingMemory, error: fetchError } = await supabase
      .from("memories")
      .select("text, title")
      .eq("id", memory_id)
      .single();
    
    if (fetchError) {
      console.error("[ProcessInsights] Failed to fetch existing memory:", fetchError);
      throw fetchError;
    }

    // Step 1: Extract core memory data (most critical)
    let coreData: MemoryCoreData;
    try {
      coreData = await extractMemoryCoreData(conversation_text);
      console.log(`[ProcessInsights] Extracted core data:`, JSON.stringify(coreData));
    } catch (error) {
      console.error("[ProcessInsights] Failed to extract core data:", error);
      // Fallback: create basic title from first 50 chars
      const fallbackTitle = conversation_text.substring(0, 50).replace(/\n/g, ' ') + '...';
      coreData = {
        title: fallbackTitle,
        memory_date: null,
        memory_location: null,
        summary: conversation_text.substring(0, 500)
      };
    }

    // Step 2: Extract insights (optional, can fail gracefully)
    let insights: MemoryInsights;
    try {
      insights = await extractConversationInsights(conversation_text);
    } catch (error) {
      console.error("[ProcessInsights] Failed to extract insights:", error);
      insights = {
        people: [],
        places: [],
        dates: [],
        events: [],
        themes: [],
        emotions: [],
        objects: [],
        relationships: [],
        time_periods: []
      };
    }

    // Step 3: Analyze conversation context (optional)
    let conversationContext;
    try {
      conversationContext = await analyzeConversationContext(conversation_text);
    } catch (error) {
      console.error("[ProcessInsights] Failed to analyze context:", error);
      conversationContext = {
        key_moments: [],
        emotional_tone: "neutral",
        narrative_arc: "unknown"
      };
    }

    // Step 4: Calculate metadata
    const metadata = calculateMetadata(conversation_text, insights);

    // Step 5: Build structured output
    const processedMemory: ProcessedMemory = {
      memory_id,
      insights,
      core_data: coreData,
      conversation_context: conversationContext,
      metadata,
    };

    // Step 6: Update memory record with extracted data
    // Flatten insights into tag array for memories.tags column
    const allTags = [
      ...(insights.people || []),
      ...(insights.places || []),
      ...(insights.events || []),
      ...(insights.themes || []),
      ...(insights.emotions || [])
    ].filter(tag => tag && tag.length > 0);

    // Normalize date to PostgreSQL date format (YYYY-MM-DD)
    let normalizedDate = coreData.memory_date;
    if (normalizedDate) {
      // If date is YYYY-MM format, convert to YYYY-MM-01
      if (/^\d{4}-\d{2}$/.test(normalizedDate)) {
        normalizedDate = `${normalizedDate}-01`;
      }
      // If date is YYYY format, convert to YYYY-01-01
      else if (/^\d{4}$/.test(normalizedDate)) {
        normalizedDate = `${normalizedDate}-01-01`;
      }
    }

    const { error: updateError } = await supabase
      .from("memories")
      .update({
        title: coreData.title,
        text: coreData.summary, // Replace raw transcript with AI-generated summary
        memory_date: normalizedDate,
        memory_location: coreData.memory_location,
        tags: allTags,
        show_on_timeline: !!normalizedDate, // Only show if date exists
        metadata: {
          ...metadata,
          original_transcript: existingMemory?.text, // Archive original conversation
          processed_at: new Date().toISOString(),
          original_date_format: coreData.memory_date, // Store original format
        },
      })
      .eq("id", memory_id);

    if (updateError) {
      console.error("[ProcessInsights] Error updating memory:", updateError);
      throw updateError;
    }

    // Step 7: Store insights in separate table for analytics
    const { error: insightsError } = await supabase
      .from("memory_insights")
      .insert({
        memory_id,
        user_id,
        insights: processedMemory.insights,
        conversation_context: processedMemory.conversation_context,
        metadata: processedMemory.metadata,
        created_at: new Date().toISOString(),
      });

    if (insightsError) {
      console.error("[ProcessInsights] Error storing insights:", insightsError);
    }

    console.log(`[ProcessInsights] Successfully processed memory: ${memory_id}`);

    return new Response(JSON.stringify(processedMemory), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[ProcessInsights] Error:", error);
    console.error("[ProcessInsights] Error stack:", error.stack);
    
    // Try to update memory with a fallback title so it's not stuck as "Processing"
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      const { memory_id } = await req.json();
      if (memory_id) {
        await supabase
          .from("memories")
          .update({
            title: "Memory (processing failed)",
            tags: ["error", "needs_review"],
            metadata: {
              processing_error: error.message,
              error_timestamp: new Date().toISOString()
            }
          })
          .eq("id", memory_id);
        
        console.log(`[ProcessInsights] Updated memory with error fallback title`);
      }
    } catch (fallbackError) {
      console.error("[ProcessInsights] Failed to update with fallback:", fallbackError);
    }
    
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function extractConversationInsights(
  conversationText: string
): Promise<MemoryInsights> {
  const openAIKey = Deno.env.get("OPENAI_API_KEY");

  const prompt = `You are an expert memory analyst. Extract ALL identifiable entities and themes from this conversation.

Conversation:
"""
${conversationText}
"""

Extract and categorize:
1. PEOPLE: Names, relationships (e.g., "Mom", "Sarah", "my brother John")
2. PLACES: Locations, addresses, landmarks, cities, countries
3. DATES: Specific dates, time periods, years, seasons, age references
4. EVENTS: Birthdays, weddings, graduations, trips, accidents, milestones
5. THEMES: Life lessons, values, recurring topics, life phases
6. EMOTIONS: Expressed feelings, emotional tone, mood
7. OBJECTS: Significant items mentioned (gifts, possessions, heirlooms)
8. RELATIONSHIPS: Connection types (family, friends, colleagues, romantic)
9. TIME_PERIODS: Historical context, eras, life stages

Return ONLY valid JSON. Be comprehensive. If a category has no items, return empty array.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openAIKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You extract structured data from conversations. Always return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  const extracted = JSON.parse(data.choices[0].message.content);

  return {
    people: extracted.people || [],
    places: extracted.places || [],
    dates: extracted.dates || [],
    events: extracted.events || [],
    themes: extracted.themes || [],
    emotions: extracted.emotions || [],
    objects: extracted.objects || [],
    relationships: extracted.relationships || [],
    time_periods: extracted.time_periods || [],
  };
}

async function extractMemoryCoreData(
  conversationText: string
): Promise<MemoryCoreData> {
  const openAIKey = Deno.env.get("OPENAI_API_KEY");

  const prompt = `Extract core memory metadata from this conversation. Look carefully through the ENTIRE conversation for temporal and location clues.

Conversation:
"""
${conversationText}
"""

Extract:
1. TITLE: A concise, descriptive title (5-8 words max)
2. MEMORY_DATE: The primary date/time this memory occurred. Look for explicit years (e.g., "2008", "in 1995"), months (e.g., "July", "in December"), or date references anywhere in the conversation. Format as ISO 8601: YYYY-MM-DD or YYYY-MM or YYYY. Use null ONLY if absolutely no date information exists.
3. MEMORY_LOCATION: The primary location where this memory took place. Look for city names, places, addresses, venues mentioned anywhere in the conversation. Be specific (include city and country if mentioned). Use null if unknown.
4. SUMMARY: A 2-3 sentence summary capturing the essence of the memory. Write as a coherent narrative, not a chat transcript.

IMPORTANT: Search the ENTIRE conversation for date and location clues, not just recent messages. Often date/location are mentioned early in the discussion.

Return ONLY valid JSON with these exact keys: title, memory_date, memory_location, summary`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openAIKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You extract structured metadata from conversations. Always return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function analyzeConversationContext(conversationText: string) {
  const openAIKey = Deno.env.get("OPENAI_API_KEY");

  const prompt = `Analyze the narrative structure and emotional context of this conversation.

Conversation:
"""
${conversationText}
"""

Provide:
1. KEY_MOMENTS: Array of 3-5 pivotal moments/quotes from the conversation
2. EMOTIONAL_TONE: Overall emotional atmosphere (e.g., "nostalgic and warm", "bittersweet", "joyful")
3. NARRATIVE_ARC: The story structure (e.g., "Beginning: childhood → Middle: conflict → End: resolution")

Return ONLY valid JSON with keys: key_moments, emotional_tone, narrative_arc`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openAIKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You analyze narrative structure in conversations. Always return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

function calculateMetadata(conversationText: string, insights: MemoryInsights) {
  const wordCount = conversationText.split(/\s+/).length;

  let estimatedTimeSpan = null;
  if (insights.dates.length > 0) {
    if (insights.dates.length > 1) {
      estimatedTimeSpan = `Multiple time periods mentioned (${insights.dates.length} dates)`;
    } else {
      estimatedTimeSpan = "Single time period";
    }
  }

  const dateConfidence = insights.dates.length > 0 ? 0.9 : 0.3;
  const locationConfidence = insights.places.length > 0 ? 0.85 : 0.2;
  const peopleConfidence = insights.people.length > 0 ? 0.95 : 0.5;

  return {
    word_count: wordCount,
    estimated_time_span: estimatedTimeSpan,
    confidence_scores: {
      date_extraction: dateConfidence,
      location_extraction: locationConfidence,
      people_extraction: peopleConfidence,
    },
  };
}
