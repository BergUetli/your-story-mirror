import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize phone number by removing all non-digit characters except leading +
const normalizePhone = (phone: string) => {
  if (!phone) return '';
  // Keep only digits and leading +
  const cleaned = phone.trim().replace(/[^\d+]/g, '');
  // If it starts with +, keep it. Otherwise ensure it's just digits
  return cleaned.startsWith('+') ? cleaned : cleaned.replace(/\+/g, '');
};

// Check if two phone numbers match (with or without + prefix)
const phonesMatch = (phone1: string, phone2: string) => {
  const norm1 = normalizePhone(phone1).replace(/^\+/, '');
  const norm2 = normalizePhone(phone2).replace(/^\+/, '');
  return norm1 === norm2;
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

      // Check if phone already exists for another user (normalize for comparison)
      const { data: allPhoneNumbers } = await supabase
        .from('user_phone_numbers')
        .select('user_id, phone_number');

      let existingUserId = null;
      if (allPhoneNumbers) {
        for (const record of allPhoneNumbers) {
          if (phonesMatch(record.phone_number, phone_number) && record.user_id !== user.id) {
            existingUserId = record.user_id;
            console.log(`📞 Found existing phone record for user ${existingUserId}`);
            break;
          }
        }
      }

      // If phone belongs to a different user, update it to current user
      // Otherwise insert new record
      let insertError;
      if (existingUserId) {
        console.log(`🔄 Updating phone record from user ${existingUserId} to ${user.id}`);
        const { error } = await supabase
          .from('user_phone_numbers')
          .update({
            user_id: user.id,
            phone_number,
            verification_code: code,
            verification_expires_at: expiresAt.toISOString(),
            verified: false,
            provider: 'whatsapp',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', existingUserId);
        insertError = error;
      } else {
        const { error } = await supabase
          .from('user_phone_numbers')
          .insert({
            user_id: user.id,
            phone_number,
            verification_code: code,
            verification_expires_at: expiresAt.toISOString(),
            verified: false,
            provider: 'whatsapp',
          });
        insertError = error;
      }

      if (insertError) {
        console.error('Error inserting phone record:', insertError);
        throw insertError;
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

      // Find ALL phone records that match this number (including duplicates)
      const { data: allPhones } = await supabase
        .from('user_phone_numbers')
        .select('*');
      
      const matchingPhones = allPhones?.filter(p => phonesMatch(p.phone_number, phone_number)) || [];
      
      if (matchingPhones.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Phone number record not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📱 Found ${matchingPhones.length} matching phone record(s)`);

      // Find the record for the current user
      const currentUserPhone = matchingPhones.find(p => p.user_id === user.id);
      
      if (!currentUserPhone) {
        return new Response(
          JSON.stringify({ error: 'Phone number not linked to this account' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if any OTHER user has this phone (potential merge scenario)
      const otherUserPhones = matchingPhones.filter(p => p.user_id !== user.id);
      
      if (otherUserPhones.length > 0) {
        console.log(`🔄 Found ${otherUserPhones.length} duplicate phone record(s) under different user(s). Starting merge...`);
        
        for (const otherPhone of otherUserPhones) {
          const whatsappUserId = otherPhone.user_id;
          console.log(`🔄 Merging WhatsApp user ${whatsappUserId} into web user ${user.id}`);

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

          // Fetch and merge profile data from both users
          const [whatsappUserData, whatsappProfileData, webUserData, webProfileData] = await Promise.all([
            supabase.from('users').select('*').eq('user_id', whatsappUserId).maybeSingle(),
            supabase.from('user_profiles').select('*').eq('user_id', whatsappUserId).maybeSingle(),
            supabase.from('users').select('*').eq('user_id', user.id).maybeSingle(),
            supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle()
          ]);

          // Merge users table data (fill in nulls in web profile with WhatsApp data)
          if (whatsappUserData.data && webUserData.data) {
            const mergedUserData: any = {};
            ['name', 'age', 'birth_date', 'birth_place', 'current_location', 'email'].forEach(field => {
              if (!webUserData.data[field] && whatsappUserData.data[field]) {
                mergedUserData[field] = whatsappUserData.data[field];
              }
            });

            if (Object.keys(mergedUserData).length > 0) {
              await supabase
                .from('users')
                .update(mergedUserData)
                .eq('user_id', user.id);
              console.log('✅ Users table data merged:', Object.keys(mergedUserData));
            }
          }

          // Merge user_profiles table data
          if (whatsappProfileData.data && webProfileData.data) {
            const mergedProfileData: any = {};
            [
              'preferred_name', 'age', 'hometown', 'location', 'occupation',
              'relationship_status', 'education_background', 'hobbies_interests',
              'core_values', 'personality_traits', 'life_goals', 'family_members',
              'close_friends', 'significant_others', 'major_life_events'
            ].forEach(field => {
              if (!webProfileData.data[field] && whatsappProfileData.data[field]) {
                mergedProfileData[field] = whatsappProfileData.data[field];
              }
            });

            if (Object.keys(mergedProfileData).length > 0) {
              await supabase
                .from('user_profiles')
                .update(mergedProfileData)
                .eq('user_id', user.id);
              console.log('✅ User profiles data merged:', Object.keys(mergedProfileData));
            }
          }

          // Delete old user's records
          await supabase.from('users').delete().eq('user_id', whatsappUserId);
          await supabase.from('user_profiles').delete().eq('user_id', whatsappUserId);
          await supabase.from('user_phone_numbers').delete().eq('id', otherPhone.id);
          
          console.log(`✅ Old user records deleted for ${whatsappUserId}`);
        }
      }

      // Now update the current user's phone record to verified and normalized
      const { error: updateError } = await supabase
        .from('user_phone_numbers')
        .update({
          verified: true,
          phone_number: normalizedPhone,
          verification_code: null,
          verification_expires_at: null,
        })
        .eq('id', currentUserPhone.id);

      if (updateError) throw updateError;


      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Phone number verified successfully',
          accountLinked: otherUserPhones.length > 0
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
