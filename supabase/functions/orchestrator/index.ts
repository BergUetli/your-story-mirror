import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import OpenAI from "https://esm.sh/openai@4.53.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OrchestratorRequest = {
  userId: string;
  message?: string;
  action?: 'get_timeline' | 'manage_elevenlabs_session' | 'chat';
  limit?: number;
  sessionParams?: {
    agentId?: string;
    action?: 'start' | 'end' | 'status';
  };
};

// Helper – build Supabase admin client
function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Supabase env not configured");
  return createClient(url, serviceKey);
}

// Tool handlers
async function retrieveMemories(userId: string, query?: string, limit = 5) {
  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("memories")
    .select("id,title,text,created_at,tags")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 10));

  if (query && query.trim()) {
    const escaped = query.replace(/%/g, "%25").replace(/\\/g, "\\\\");
    q = q.or(`title.ilike.%${escaped}%,text.ilike.%${escaped}%`);
  }

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    preview: (m.text || "").replace(/\s+/g, " ").slice(0, 180),
    created_at: m.created_at,
    tags: m.tags ?? [],
  }));
}

async function saveMemory(userId: string, title: string, text: string, tags?: string[]) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("memories")
    .insert([{ user_id: userId, title, text, tags: tags ?? [] }])
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return { id: data?.id };
}

async function summarizeMemories(items: Array<{ title: string; preview: string }>) {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const text = items.slice(0, 10).map((m, i) => `${i + 1}. ${m.title}: ${m.preview}`).join("\n");
  const system = "You summarize memory lists into 2-3 bullet points emphasizing themes. Keep it under 120 words.";

  const resp = await openai.chat.completions.create({
    model: "gpt-4.1-2025-04-14",
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Memories:\n${text}` },
    ],
    // For 4.1, use max_completion_tokens, not max_tokens. No temperature parameter.
    max_completion_tokens: 220,
  } as any);

  const content = resp.choices?.[0]?.message?.content ?? "";
  return { summary: content };
}

// Timeline handler - optimized to fetch only essential data
async function getTimelineData(userId: string) {
  const supabase = getSupabaseAdmin();
  
  // Fetch memories with only essential fields (no image_urls for performance)
  const { data: memories, error: memError } = await supabase
    .from("memories")
    .select("id,title,text,created_at,memory_date,memory_location,tags")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  
  if (memError) throw memError;

  // Fetch user profile for birth date
  const { data: profile, error: profError } = await supabase
    .from("users")
    .select("birth_date,birth_place")
    .eq("user_id", userId)
    .maybeSingle();
  
  if (profError) console.warn("Profile fetch warning:", profError);

  return {
    memories: memories ?? [],
    profile: profile ?? null,
  };
}

// ElevenLabs session manager
async function manageElevenLabsSession(action: string, agentId?: string) {
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

  if (action === "start" && agentId) {
    console.log("🔑 Orchestrator: Generating ElevenLabs signed URL for agent:", agentId);
    
    // Request signed URL with extended inactivity timeout
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}&inactivity_timeout=180`,
      {
        method: "GET",
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ ElevenLabs API error:", response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Orchestrator: Signed URL generated successfully");
    return data;
  }

  if (action === "status") {
    return { status: "ready", message: "ElevenLabs service available" };
  }

  return { status: "unknown_action" };
}

// Define tool schema for GPT function calling
const tools = [
  {
    type: "function",
    function: {
      name: "retrieve_memories",
      description: "Retrieve recent or matching memories for a user.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Optional search query." },
          limit: { type: "number", description: "Max items (1-10)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Save a new memory for the user.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          text: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title", "text"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "summarize_memories",
      description: "Summarize a list of memories into key themes.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                preview: { type: "string" },
              },
              required: ["title", "preview"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, message, action, limit, sessionParams }: OrchestratorRequest = await req.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle timeline data request
    if (action === "get_timeline") {
      console.log("📊 Orchestrator: Fetching timeline data for user:", userId);
      const timelineData = await getTimelineData(userId);
      return new Response(
        JSON.stringify(timelineData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle ElevenLabs session management
    if (action === "manage_elevenlabs_session" && sessionParams) {
      console.log("🎙️ Orchestrator: Managing ElevenLabs session:", sessionParams.action);
      const result = await manageElevenLabsSession(
        sessionParams.action || "status",
        sessionParams.agentId
      );
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default chat/memory orchestration
    if (!message) {
      return new Response(JSON.stringify({ error: "message is required for chat action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const systemPrompt =
      "You are the Orchestrator agent for Solon. Decide when to fetch memories, summarize them, or save new ones. " +
      "Prefer tool calls over long text. Keep replies concise. If user is sharing a new story, call save_memory.";

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ];

    // First call – may request tools
    let response = await openai.chat.completions.create({
      model: "gpt-4.1-2025-04-14",
      messages,
      tools,
      tool_choice: "auto",
      max_completion_tokens: 300,
    } as any);

    let resultMessage = response.choices?.[0]?.message as any;

    // Handle one round of tool calls (expandable if needed)
    if (resultMessage?.tool_calls?.length) {
      for (const tc of resultMessage.tool_calls) {
        const name = tc.function?.name;
        let args: any = {};
        try {
          args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        } catch {}

        if (name === "retrieve_memories") {
          const items = await retrieveMemories(userId, args.query, args.limit ?? limit ?? 5);
          messages.push(resultMessage);
          messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ items }) });
        } else if (name === "save_memory") {
          const out = await saveMemory(userId, args.title, args.text, args.tags);
          messages.push(resultMessage);
          messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(out) });
        } else if (name === "summarize_memories") {
          const out = await summarizeMemories(args.items || []);
          messages.push(resultMessage);
          messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(out) });
        }
      }

      // Second call – produce final assistant reply
      response = await openai.chat.completions.create({
        model: "gpt-4.1-2025-04-14",
        messages,
        max_completion_tokens: 400,
      } as any);
      resultMessage = response.choices?.[0]?.message as any;
    }

    const content = resultMessage?.content ?? "";
    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("orchestrator error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});