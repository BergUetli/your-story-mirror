// WhatsApp webhook Edge Function (inlined adapters)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import OpenAI from "https://esm.sh/openai@4.53.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

class MetaWhatsAppAdapter {
  name = 'meta';
  accessToken;
  phoneNumberId;
  verifyToken;

  constructor() {
    this.accessToken = Deno.env.get('WHATSAPP_META_ACCESS_TOKEN') || '';
    this.phoneNumberId = Deno.env.get('WHATSAPP_META_PHONE_NUMBER_ID') || '';
    this.verifyToken = Deno.env.get('WHATSAPP_META_VERIFY_TOKEN') || 'solin_verify_token_2025';
    
    if (!this.accessToken || !this.phoneNumberId) {
      console.warn('⚠️ Meta WhatsApp credentials not configured');
    }
  }

  async verifyWebhook(request) {
    const url = new URL(request.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === this.verifyToken) {
      return new Response(challenge || '', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    return false;
  }

  async parseIncomingMessage(request) {
    try {
      const body = await request.json();
      
      if (body.object !== 'whatsapp_business_account') return null;

      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages || value.messages.length === 0) return null;

      const message = value.messages[0];
      const from = message.from;
      const messageId = message.id;
      const timestamp = message.timestamp;

      let text = '';
      if (message.type === 'text') {
        text = message.text?.body || '';
      } else if (message.type === 'interactive') {
        text = message.interactive?.button_reply?.title || 
               message.interactive?.list_reply?.title || '';
      } else {
        return null;
      }

      const metadata = value.metadata || {};

      return {
        from,
        to: metadata.phone_number_id || this.phoneNumberId,
        text,
        messageId,
        timestamp,
        metadata: {
          name: value.contacts?.[0]?.profile?.name,
          provider: 'meta',
          messageType: message.type
        }
      };
    } catch (error) {
      console.error('❌ Error parsing Meta message:', error);
      return null;
    }
  }

  async sendMessage(options) {
    try {
      const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: options.to,
          type: 'text',
          text: {
            preview_url: false,
            body: options.message
          }
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`Meta API error: ${JSON.stringify(result)}`);
      }

      return {
        success: true,
        messageId: result.messages?.[0]?.id
      };
    } catch (error) {
      console.error('❌ Error sending Meta message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

class TwilioWhatsAppAdapter {
  name = 'twilio';
  accountSid;
  authToken;
  fromNumber;

  constructor() {
    this.accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
    this.authToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    this.fromNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+14155238886';
    
    if (!this.accountSid || !this.authToken) {
      console.warn('⚠️ Twilio credentials not configured');
    }
  }

  async verifyWebhook(_) {
    console.log('📱 Twilio webhook - signature validation recommended but skipped');
    return true;
  }

  async parseIncomingMessage(request) {
    try {
      const formData = await request.formData();
      
      const from = formData.get('From')?.toString() || '';
      const to = formData.get('To')?.toString() || '';
      const body = formData.get('Body')?.toString() || '';
      const messageSid = formData.get('MessageSid')?.toString() || '';
      const profileName = formData.get('ProfileName')?.toString() || '';

      const cleanFrom = from.replace('whatsapp:', '');
      const cleanTo = to.replace('whatsapp:', '');

      return {
        from: cleanFrom,
        to: cleanTo,
        text: body,
        messageId: messageSid,
        metadata: {
          name: profileName,
          provider: 'twilio'
        }
      };
    } catch (error) {
      console.error('❌ Error parsing Twilio message:', error);
      return null;
    }
  }

  async sendMessage(options) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      
      const formBody = new URLSearchParams({
        From: this.fromNumber,
        To: `whatsapp:${options.to}`,
        Body: options.message
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.accountSid}:${this.authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formBody.toString()
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`Twilio API error: ${JSON.stringify(result)}`);
      }

      return {
        success: true,
        messageId: result.sid
      };
    } catch (error) {
      console.error('❌ Error sending Twilio message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

function getWhatsAppAdapter(provider) {
  const activeProvider = provider || Deno.env.get('WHATSAPP_PROVIDER') || 'meta';
  
  if (activeProvider === 'twilio') {
    return new TwilioWhatsAppAdapter();
  }
  
  return new MetaWhatsAppAdapter();
}

// -------- End inlined adapters --------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Supabase environment not configured");
  return createClient(url, serviceKey);
}

async function findOrCreateUserByPhone(supabase, phoneNumber) {
  const { data: phoneRecord } = await supabase
    .from('user_phone_numbers')
    .select('user_id')
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  if (phoneRecord?.user_id) return phoneRecord.user_id;

  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    phone: phoneNumber,
    phone_confirm: true,
    user_metadata: {
      phone_number: phoneNumber,
      source: 'whatsapp',
      created_via: 'whatsapp_webhook'
    }
  });

  if (createError || !newUser?.user) {
    throw new Error(`Failed to create user: ${createError?.message}`);
  }

  await supabase.from('user_phone_numbers').insert({
    user_id: newUser.user.id,
    phone_number: phoneNumber,
    verified: true,
    provider: 'whatsapp'
  });

  return newUser.user.id;
}

async function getOrCreateSession(supabase, userId, phoneNumber) {
  const { data, error } = await supabase.rpc('get_or_create_whatsapp_session', {
    p_user_id: userId,
    p_phone_number: phoneNumber,
    p_conversation_mode: 'chat'
  });

  if (error) throw error;
  return data;
}

async function saveMessage(supabase, { userId, phoneNumber, direction, messageText, provider, providerMessageId, sessionId, memoryId }) {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .insert({
      user_id: userId,
      phone_number: phoneNumber,
      direction,
      message_text: messageText,
      provider,
      provider_message_id: providerMessageId,
      session_id: sessionId,
      memory_id: memoryId,
      status: 'delivered'
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

async function getConversationContext(supabase, userId, sessionId, limit = 10) {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('direction, message_text, created_at')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];

  return (data || []).reverse().map((msg) => ({
    role: msg.direction === 'inbound' ? 'user' : 'assistant',
    content: msg.message_text
  }));
}

async function searchRelevantMemories(supabase, userId, userMessage, limit = 5) {
  // Get user's recent memories that might be relevant
  const { data, error } = await supabase
    .from('memories')
    .select('id, title, text, memory_date, created_at, tags')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20); // Get more to search through

  if (error || !data) {
    console.error('Error fetching memories:', error);
    return [];
  }

  // Simple keyword matching for relevance
  const messageLower = userMessage.toLowerCase();
  const keywords = messageLower.split(' ').filter(word => word.length > 3);

  const scoredMemories = data.map(memory => {
    const memoryText = `${memory.title} ${memory.text}`.toLowerCase();
    const score = keywords.reduce((acc, keyword) => {
      return acc + (memoryText.includes(keyword) ? 1 : 0);
    }, 0);

    return { ...memory, relevanceScore: score };
  });

  // Return top relevant memories
  return scoredMemories
    .filter(m => m.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit)
    .map(m => ({
      id: m.id,
      title: m.title,
      text: m.text.substring(0, 200), // Limit context size
      date: m.memory_date || m.created_at
    }));
}

async function generateSolinResponse(userMessage, conversationHistory, userName, relevantMemories = []) {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  let memoryContext = '';
  if (relevantMemories.length > 0) {
    memoryContext = '\n\nRelevant memories from past conversations:\n' + 
      relevantMemories.map(m => 
        `- ${m.title} (${m.date ? new Date(m.date).toLocaleDateString() : 'recent'}): ${m.text}`
      ).join('\n');
  }

  const systemPrompt = `You are Solin, an empathetic AI memory companion. You're conversing with ${userName || 'a user'} over WhatsApp.

Your purpose:
- Have natural, warm conversations about their life, memories, and experiences
- Help them preserve important moments by identifying stories worth saving
- Reference their past memories when relevant to show you remember
- Be concise but meaningful (WhatsApp is for quick exchanges)
- When they share a significant memory or story, acknowledge it and indicate you'll save it

When to save memories:
- User shares a specific life event or experience
- User explicitly asks to save/remember something
- A meaningful story or moment is described in detail

Keep responses conversational and under 3-4 sentences unless they're sharing a detailed story.${memoryContext}

If the message seems like a memory worth preserving, end your response with:
[SAVE_MEMORY: brief title of the memory]

Example:
User: "I just got back from an amazing trip to Japan. We visited Kyoto and saw the most beautiful temples."
Solin: "That sounds incredible! Kyoto temples are truly magical. I'd love to hear more about what stood out to you most. [SAVE_MEMORY: Trip to Japan - Kyoto temples]"`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage }
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-2025-04-14",
    messages: messages,
    temperature: 0.8,
    max_tokens: 500
  });

  const responseText = completion.choices[0]?.message?.content || "I'm here to listen and remember with you.";

  const saveMemoryMatch = responseText.match(/\[SAVE_MEMORY:\s*(.+?)\]/);
  const shouldCreateMemory = !!saveMemoryMatch;
  const cleanResponse = responseText.replace(/\[SAVE_MEMORY:\s*.+?\]/, '').trim();

  return {
    response: cleanResponse,
    shouldCreateMemory,
    memoryContent: shouldCreateMemory ? userMessage : undefined
  };
}

async function createMemoryFromMessage(supabase, userId, messageText, context) {
  const title = messageText.split('\n')[0].substring(0, 100) || 'WhatsApp Memory';
  
  const { data, error } = await supabase
    .from('memories')
    .insert({
      user_id: userId,
      title,
      text: messageText,
      tags: ['whatsapp', 'conversation'],
      recipient: 'private'
    })
    .select('id')
    .single();

  if (error) {
    console.error('❌ Error creating memory:', error);
    return null;
  }

  return data.id;
}

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const provider = url.searchParams.get('provider') || Deno.env.get('WHATSAPP_PROVIDER') || 'meta';
    const adapter = getWhatsAppAdapter(provider);

    if (req.method === "GET") {
      const verifyResult = await adapter.verifyWebhook(req);
      if (verifyResult instanceof Response) return verifyResult;
      if (verifyResult === true) {
        return new Response("Webhook verified", { status: 200 });
      }
      return new Response("Verification failed", { status: 403 });
    }

    if (req.method === "POST") {
      const message = await adapter.parseIncomingMessage(req);
      
      if (!message) {
        return new Response(
          JSON.stringify({ success: true, message: 'No message' }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = getSupabaseAdmin();
      const userId = await findOrCreateUserByPhone(supabase, message.from);
      const sessionId = await getOrCreateSession(supabase, userId, message.from);

      await saveMessage(supabase, {
        userId,
        phoneNumber: message.from,
        direction: 'inbound',
        messageText: message.text,
        provider: adapter.name,
        providerMessageId: message.messageId,
        sessionId
      });

      const conversationHistory = await getConversationContext(supabase, userId, sessionId);
      const relevantMemories = await searchRelevantMemories(supabase, userId, message.text);
      
      const { data: userData } = await supabase
        .from('users')
        .select('name')
        .eq('user_id', userId)
        .maybeSingle();

      console.log(`📚 Found ${relevantMemories.length} relevant memories for context`);

      const { response, shouldCreateMemory, memoryContent } = await generateSolinResponse(
        message.text,
        conversationHistory,
        userData?.name || message.metadata?.name,
        relevantMemories
      );

      let memoryId = null;
      if (shouldCreateMemory && memoryContent) {
        memoryId = await createMemoryFromMessage(supabase, userId, memoryContent, sessionId);
      }

      await saveMessage(supabase, {
        userId,
        phoneNumber: message.from,
        direction: 'outbound',
        messageText: response,
        provider: adapter.name,
        sessionId,
        memoryId: memoryId || undefined
      });

      const sendResult = await adapter.sendMessage({
        to: message.from,
        message: response,
        sessionId
      });

      return new Response(
        JSON.stringify({
          success: true,
          messageId: sendResult.messageId,
          memoryCreated: !!memoryId
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    console.error("❌ WhatsApp webhook error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
