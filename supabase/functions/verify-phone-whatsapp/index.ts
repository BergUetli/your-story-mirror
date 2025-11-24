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

      // Check if phone already exists for another user (WhatsApp-only user)
      const { data: existingPhone } = await supabase
        .from('user_phone_numbers')
        .select('user_id')
        .eq('phone_number', phone_number)
        .single();

      // If phone belongs to a different user, we'll merge accounts after verification
      // For now, just create a temporary verification record for the current user
      const { error: upsertError } = await supabase
        .from('user_phone_numbers')
        .upsert({
          user_id: user.id,
          phone_number,
          verification_code: code,
          verification_expires_at: expiresAt.toISOString(),
          verified: false,
          provider: 'whatsapp',
        });

      if (upsertError) {
        // If there's a conflict, delete the old record and try again
        if (existingPhone && existingPhone.user_id !== user.id) {
          await supabase
            .from('user_phone_numbers')
            .delete()
            .eq('phone_number', phone_number)
            .eq('user_id', existingPhone.user_id);
          
          const { error: retryError } = await supabase
            .from('user_phone_numbers')
            .insert({
              user_id: user.id,
              phone_number,
              verification_code: code,
              verification_expires_at: expiresAt.toISOString(),
              verified: false,
              provider: 'whatsapp',
            });
          
          if (retryError) throw retryError;
        } else {
          throw upsertError;
        }
      }

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

      // Find WhatsApp-only user by checking auth.users for phone-based accounts
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      let whatsappUserId = null;
      if (authUsers?.users) {
        for (const authUser of authUsers.users) {
          if (authUser.phone === phone_number && 
              authUser.id !== user.id &&
              authUser.user_metadata?.source === 'whatsapp') {
            whatsappUserId = authUser.id;
            break;
          }
        }
      }

      if (whatsappUserId) {
        console.log(`🔗 Merging WhatsApp account ${whatsappUserId} into web account ${user.id}`);
        
        // Migrate memories
        const { error: memoriesError } = await supabase
          .from('memories')
          .update({ user_id: user.id })
          .eq('user_id', whatsappUserId);

        if (memoriesError) {
          console.error('Error migrating memories:', memoriesError);
        } else {
          console.log('✅ Memories migrated');
        }

        // Migrate memory artifacts ownership
        const { data: whatsappMemories } = await supabase
          .from('memories')
          .select('id')
          .eq('user_id', user.id);

        // Migrate artifacts if needed (update storage paths)
        if (whatsappMemories) {
          for (const memory of whatsappMemories) {
            const { data: artifacts } = await supabase
              .from('memory_artifacts')
              .select('artifact_id, artifacts(*)')
              .eq('memory_id', memory.id);
            
            // Artifacts are already linked, no need to change
          }
        }

        // Migrate WhatsApp messages
        const { error: messagesError } = await supabase
          .from('whatsapp_messages')
          .update({ user_id: user.id })
          .eq('user_id', whatsappUserId);

        if (messagesError) {
          console.error('Error migrating messages:', messagesError);
        } else {
          console.log('✅ Messages migrated');
        }

        // Migrate WhatsApp sessions
        const { error: sessionsError } = await supabase
          .from('whatsapp_sessions')
          .update({ user_id: user.id })
          .eq('user_id', whatsappUserId);

        if (sessionsError) {
          console.error('Error migrating sessions:', sessionsError);
        } else {
          console.log('✅ Sessions migrated');
        }

        // Migrate memory insights
        const { error: insightsError } = await supabase
          .from('memory_insights')
          .update({ user_id: user.id })
          .eq('user_id', whatsappUserId);

        if (insightsError) {
          console.error('Error migrating insights:', insightsError);
        } else {
          console.log('✅ Insights migrated');
        }

        // Delete old phone number record for WhatsApp user
        await supabase
          .from('user_phone_numbers')
          .delete()
          .eq('user_id', whatsappUserId);

        // Merge or delete user profiles
        const { data: whatsappProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', whatsappUserId)
          .single();

        const { data: webProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (whatsappProfile && !webProfile) {
          // Move WhatsApp profile to web user
          await supabase
            .from('user_profiles')
            .update({ user_id: user.id })
            .eq('user_id', whatsappUserId);
        } else if (whatsappProfile) {
          // Delete WhatsApp profile as web profile takes precedence
          await supabase
            .from('user_profiles')
            .delete()
            .eq('user_id', whatsappUserId);
        }

        // Delete users table entry if exists
        await supabase
          .from('users')
          .delete()
          .eq('user_id', whatsappUserId);

        // Finally, delete the WhatsApp-only auth user
        const { error: deleteUserError } = await supabase.auth.admin.deleteUser(whatsappUserId);
        
        if (deleteUserError) {
          console.error('Error deleting WhatsApp user:', deleteUserError);
        } else {
          console.log('✅ WhatsApp user deleted, accounts fully merged');
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Phone number verified and accounts merged',
          accountLinked: !!whatsappUserId
        }),
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
