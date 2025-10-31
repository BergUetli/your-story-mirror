import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  // This is a WebSocket upgrade request
  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    let openaiWs: WebSocket | null = null;
    
    socket.onopen = () => {
      console.log('✅ Client WebSocket connected');
      
      // Connect to OpenAI Realtime API
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (!OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY not set');
        socket.send(JSON.stringify({ error: 'Server configuration error' }));
        socket.close();
        return;
      }
      
      const openaiUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';
      openaiWs = new WebSocket(openaiUrl, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });
      
      openaiWs.onopen = () => {
        console.log('✅ Connected to OpenAI Realtime API');
      };
      
      openaiWs.onmessage = (event) => {
        // Forward messages from OpenAI to client
        socket.send(event.data);
      };
      
      openaiWs.onerror = (error) => {
        console.error('❌ OpenAI WebSocket error:', error);
        socket.send(JSON.stringify({ error: 'OpenAI connection error' }));
      };
      
      openaiWs.onclose = () => {
        console.log('🔌 OpenAI WebSocket closed');
        socket.close();
      };
    };
    
    socket.onmessage = (event) => {
      // Forward messages from client to OpenAI
      if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.send(event.data);
      }
    };
    
    socket.onclose = () => {
      console.log('🔌 Client WebSocket closed');
      if (openaiWs) {
        openaiWs.close();
      }
    };
    
    socket.onerror = (error) => {
      console.error('❌ Client WebSocket error:', error);
      if (openaiWs) {
        openaiWs.close();
      }
    };
    
    return response;
  }
  
  return new Response('Expected WebSocket connection', { 
    status: 400,
    headers: corsHeaders 
  });
});
