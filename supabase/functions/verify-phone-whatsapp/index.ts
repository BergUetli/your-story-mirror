import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, phone_number, verification_code } = await req.json();

    if (action === 'send_code') {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save or update phone number with verification code
      const { error: upsertError } = await supabase
        .from('user_phone_numbers')
        .upsert({
          user_id: user.id,
          phone_number,
          verification_code: code,
          verification_expires_at: expiresAt.toISOString(),
          verified: false,
          provider: 'whatsapp',
        }, {
          onConflict: 'user_id,phone_number',
        });

      if (upsertError) throw upsertError;

      // Send code via WhatsApp
      const metaToken = Deno.env.get('WHATSAPP_META_ACCESS_TOKEN');
      const phoneNumberId = Deno.env.get('WHATSAPP_META_PHONE_NUMBER_ID');

      if (!metaToken || !phoneNumberId) {
        throw new Error('WhatsApp credentials not configured');
      }

      const message = `Your 1000years.ai verification code is: ${code}\n\nThis code expires in 10 minutes.`;

      const response = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${metaToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone_number,
            type: 'text',
            text: { body: message },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('WhatsApp API error:', error);
        throw new Error(`Failed to send verification code: ${JSON.stringify(error)}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Verification code sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify_code') {
      // Check verification code
      const { data: phoneData, error: fetchError } = await supabase
        .from('user_phone_numbers')
        .select('*')
        .eq('user_id', user.id)
        .eq('phone_number', phone_number)
        .single();

      if (fetchError || !phoneData) {
        return new Response(
          JSON.stringify({ error: 'Phone number not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if code matches and hasn't expired
      if (phoneData.verification_code !== verification_code) {
        return new Response(
          JSON.stringify({ error: 'Invalid verification code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (new Date(phoneData.verification_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Verification code expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark as verified
      const { error: updateError } = await supabase
        .from('user_phone_numbers')
        .update({
          verified: true,
          verification_code: null,
          verification_expires_at: null,
        })
        .eq('user_id', user.id)
        .eq('phone_number', phone_number);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: 'Phone number verified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
