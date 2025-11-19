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
      let mediaId = null;
      let mediaType = null;
      let mimeType = null;
      let caption = null;

      if (message.type === 'text') {
        text = message.text?.body || '';
      } else if (message.type === 'interactive') {
        text = message.interactive?.button_reply?.title || 
               message.interactive?.list_reply?.title || '';
      } else if (message.type === 'image') {
        mediaId = message.image?.id;
        mediaType = 'image';
        mimeType = message.image?.mime_type || 'image/jpeg';
        caption = message.image?.caption || '';
        text = caption;
      } else if (message.type === 'video') {
        mediaId = message.video?.id;
        mediaType = 'video';
        mimeType = message.video?.mime_type || 'video/mp4';
        caption = message.video?.caption || '';
        text = caption;
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
        mediaId,
        mediaType,
        mimeType,
        caption,
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

  async downloadMedia(mediaId) {
    try {
      // Get media URL from Meta
      const urlResponse = await fetch(
        `https://graph.facebook.com/v18.0/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      const urlData = await urlResponse.json();
      if (!urlData.url) throw new Error('No media URL returned');

      // Download the actual media file
      const mediaResponse = await fetch(urlData.url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!mediaResponse.ok) throw new Error('Failed to download media');

      return {
        data: await mediaResponse.arrayBuffer(),
        mimeType: mediaResponse.headers.get('content-type') || 'application/octet-stream'
      };
    } catch (error) {
      console.error('❌ Error downloading media:', error);
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

async function getSessionContext(supabase, sessionId) {
  const { data } = await supabase
    .from('whatsapp_sessions')
    .select('context')
    .eq('session_id', sessionId)
    .single();
  
  return data?.context || {};
}

async function updateSessionContext(supabase, sessionId, context) {
  await supabase
    .from('whatsapp_sessions')
    .update({ context })
    .eq('session_id', sessionId);
}

async function uploadMediaAsArtifact(supabase, userId, mediaData, mimeType, filename) {
  try {
    const fileExt = mimeType.split('/')[1] || 'jpg';
    const storagePath = `${userId}/${Date.now()}_${filename || 'media'}.${fileExt}`;
    
    // Upload to memory-images bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('memory-images')
      .upload(storagePath, mediaData, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Create artifact record
    const { data: artifactData, error: artifactError } = await supabase
      .from('artifacts')
      .insert({
        artifact_type: mimeType.startsWith('image/') ? 'image' : 'video',
        storage_path: uploadData.path,
        mime_type: mimeType,
        file_name: filename
      })
      .select('id')
      .single();

    if (artifactError) throw artifactError;

    return artifactData.id;
  } catch (error) {
    console.error('❌ Error uploading media artifact:', error);
    return null;
  }
}

async function linkArtifactToMemory(supabase, memoryId, artifactId) {
  const { error } = await supabase
    .from('memory_artifacts')
    .insert({
      memory_id: memoryId,
      artifact_id: artifactId
    });

  if (error) {
    console.error('❌ Error linking artifact to memory:', error);
    return false;
  }

  return true;
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

async function generateSolinResponse(userMessage, conversationHistory, userName, relevantMemories = [], sessionContext = {}) {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  let memoryContext = '';
  if (relevantMemories.length > 0) {
    memoryContext = '\n\nRelevant memories:\n' + 
      relevantMemories.map(m => 
        `- When you ${m.title.toLowerCase()}: ${m.text}`
      ).join('\n');
  }

  // Check if user is confirming to save a memory
  const confirmationKeywords = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'save it', 'please', 'definitely'];
  const isConfirmingSave = sessionContext.awaiting_save_confirmation && 
    confirmationKeywords.some(word => userMessage.toLowerCase().includes(word));

  const systemPrompt = `You are Solin, a warm childhood friend helping ${userName || 'your friend'} preserve life memories over WhatsApp.

PERSONALITY:
- Playful, fun, and supportive - like a close friend from childhood
- Culturally neutral - avoid strong Americanisms 
- Keep responses SHORT (1-3 sentences, 5-10 words per sentence)
- Sound like someone their age, not a formal assistant

YOUR APPROACH TO MEMORIES:
1. When someone shares a story or experience, ask 2-3 follow-up questions to explore it
2. Ask about: feelings, specific details, why it mattered, who was involved
3. After exploring (3-4 exchanges about the topic), ask: "Want me to save this memory?"
4. ONLY save when they explicitly confirm "yes"

IMPORTANT RULES:
- Ask ONE question at a time
- Keep it conversational, not interrogative
- Reference their past memories naturally when relevant${memoryContext}
${sessionContext.awaiting_save_confirmation ? '\n\nNOTE: User is responding to your question about saving a memory. If they confirm, acknowledge and mark [SAVE_MEMORY].' : ''}
${sessionContext.memory_discussion_count >= 2 ? '\n\nNOTE: You\'ve asked a couple follow-up questions. After one more, you can ask if they want to save this memory.' : ''}

Response format:
- Normal conversation: Just respond naturally
- When asking to save: "Want me to save this memory?"
- When user confirms save: "Got it, saved! 💫 [SAVE_MEMORY: brief descriptive title]"`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage }
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-2025-04-14",
    messages: messages,
    max_completion_tokens: 500
  });

  const responseText = completion.choices[0]?.message?.content || "I'm here to listen and remember with you.";

  const saveMemoryMatch = responseText.match(/\[SAVE_MEMORY:\s*(.+?)\]/);
  const shouldCreateMemory = !!saveMemoryMatch && isConfirmingSave;
  const cleanResponse = responseText.replace(/\[SAVE_MEMORY:\s*.+?\]/, '').trim();
  
  // Detect if asking about saving memory
  const isAskingToSave = cleanResponse.toLowerCase().includes('want me to save') || 
                         cleanResponse.toLowerCase().includes('save this memory');

  return {
    response: cleanResponse,
    shouldCreateMemory,
    memoryContent: shouldCreateMemory ? userMessage : undefined,
    isAskingToSave
  };
}

async function createMemoryFromMessage(supabase, userId, conversationHistory, sessionContext) {
  // Get the relevant parts of the conversation that led to this memory
  const recentExchanges = conversationHistory.slice(-6); // Last 3 exchanges (6 messages)
  const memoryText = recentExchanges
    .map(msg => `${msg.role === 'user' ? 'Me' : 'Solin'}: ${msg.content}`)
    .join('\n\n');
  
  const title = recentExchanges[0]?.content?.split('\n')[0].substring(0, 100) || 'WhatsApp Memory';
  
  const { data, error } = await supabase
    .from('memories')
    .insert({
      user_id: userId,
      title,
      text: memoryText,
      tags: ['whatsapp', 'conversation'],
      recipient: 'private',
      source_type: 'whatsapp'
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

      // Get session context to check if we're expecting media
      let sessionContext = await getSessionContext(supabase, sessionId);

      // Handle media upload if user sent an image/video
      if (message.mediaId && sessionContext.awaiting_media_for_memory) {
        console.log(`📸 Processing media upload for memory ${sessionContext.awaiting_media_for_memory}`);
        
        const mediaData = await adapter.downloadMedia(message.mediaId);
        if (mediaData) {
          const artifactId = await uploadMediaAsArtifact(
            supabase,
            userId,
            new Uint8Array(mediaData.data),
            message.mimeType,
            `whatsapp_${message.messageId}`
          );

          if (artifactId) {
            await linkArtifactToMemory(supabase, sessionContext.awaiting_media_for_memory, artifactId);
            
            // Clear the waiting state
            sessionContext.awaiting_media_for_memory = null;
            sessionContext.media_count = (sessionContext.media_count || 0) + 1;
            await updateSessionContext(supabase, sessionId, sessionContext);

            const response = "Got it! 📸 I've added that to your memory. Feel free to send more photos/videos, or just say 'done' when you're finished.";
            
            await saveMessage(supabase, {
              userId,
              phoneNumber: message.from,
              direction: 'outbound',
              messageText: response,
              provider: adapter.name,
              sessionId
            });

            await adapter.sendMessage({
              to: message.from,
              message: response,
              sessionId
            });

            return new Response(
              JSON.stringify({ success: true, mediaUploaded: true }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      // Check if user is done uploading media
      const isDoneWithMedia = sessionContext.awaiting_media_for_memory && 
        (message.text.toLowerCase().includes('done') || 
         message.text.toLowerCase().includes('no more') ||
         message.text.toLowerCase().includes('that\'s all'));

      if (isDoneWithMedia) {
        sessionContext.awaiting_media_for_memory = null;
        await updateSessionContext(supabase, sessionId, sessionContext);
        
        const response = `Perfect! I've saved ${sessionContext.media_count || 0} item(s) with your memory. 💫`;
        
        await saveMessage(supabase, {
          userId,
          phoneNumber: message.from,
          direction: 'outbound',
          messageText: response,
          provider: adapter.name,
          sessionId
        });

        await adapter.sendMessage({
          to: message.from,
          message: response,
          sessionId
        });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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

      // Get session context for memory discussion tracking
      sessionContext = await getSessionContext(supabase, sessionId);
      
      // Detect if this message is part of an ongoing memory discussion
      const isMemoryDiscussion = message.text.length > 50 || 
        conversationHistory.slice(-3).some(msg => 
          msg.role === 'assistant' && (
            msg.content.includes('?') || 
            msg.content.toLowerCase().includes('tell me') ||
            msg.content.toLowerCase().includes('what')
          )
        );

      if (isMemoryDiscussion) {
        sessionContext.memory_discussion_count = (sessionContext.memory_discussion_count || 0) + 1;
      } else {
        sessionContext.memory_discussion_count = 0;
      }

      const { response, shouldCreateMemory, memoryContent, isAskingToSave } = await generateSolinResponse(
        message.text,
        conversationHistory,
        userData?.name || message.metadata?.name,
        relevantMemories,
        sessionContext
      );

      // Update session context
      sessionContext.awaiting_save_confirmation = isAskingToSave;
      await updateSessionContext(supabase, sessionId, sessionContext);

      let memoryId = null;
      if (shouldCreateMemory) {
        memoryId = await createMemoryFromMessage(supabase, userId, conversationHistory, sessionContext);
        console.log(`💾 Memory saved with ID: ${memoryId}`);
        
        // After saving, ask about media
        sessionContext.memory_discussion_count = 0;
        sessionContext.awaiting_save_confirmation = false;
        sessionContext.awaiting_media_for_memory = memoryId;
        sessionContext.media_count = 0;
        await updateSessionContext(supabase, sessionId, sessionContext);

        // Send follow-up asking about media
        const mediaPrompt = "Do you have any pictures or videos of this memory? Feel free to send them to me!";
        
        await saveMessage(supabase, {
          userId,
          phoneNumber: message.from,
          direction: 'outbound',
          messageText: mediaPrompt,
          provider: adapter.name,
          sessionId
        });

        await adapter.sendMessage({
          to: message.from,
          message: mediaPrompt,
          sessionId
        });

        return new Response(
          JSON.stringify({
            success: true,
            messageId: message.messageId,
            memoryCreated: true,
            awaitingMedia: true
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
