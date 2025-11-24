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

      // If phone belongs to a different user, delete their record first
      if (existingUserId) {
        console.log(`🗑️ Deleting old phone record for user ${existingUserId}`);
        await supabase
          .from('user_phone_numbers')
          .delete()
          .eq('user_id', existingUserId);
      }

      // Insert new verification record
      const { error: insertError } = await supabase
        .from('user_phone_numbers')
        .insert({
          user_id: user.id,
          phone_number,
          verification_code: code,
          verification_expires_at: expiresAt.toISOString(),
          verified: false,
          provider: 'whatsapp',
        });

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

      // Mark as verified - find the phone record flexibly
      const { data: allUserPhones } = await supabase
        .from('user_phone_numbers')
        .select('*')
        .eq('user_id', user.id);
      
      const matchingPhone = allUserPhones?.find(p => phonesMatch(p.phone_number, phone_number));
      
      if (!matchingPhone) {
        return new Response(
          JSON.stringify({ error: 'Phone number record not found for this user' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateError } = await supabase
        .from('user_phone_numbers')
        .update({
          verified: true,
          phone_number: normalizedPhone, // Normalize the stored format
          verification_code: null,
          verification_expires_at: null,
        })
        .eq('id', matchingPhone.id);

      if (updateError) throw updateError;

      // Find WhatsApp-only user by checking user_phone_numbers table
      // We need to find users with matching phone numbers (normalized)
      const { data: allPhoneNumbers } = await supabase
        .from('user_phone_numbers')
        .select('user_id, phone_number, provider');
      
      let whatsappUserId = null;
      if (allPhoneNumbers) {
        for (const phoneRecord of allPhoneNumbers) {
          if (phonesMatch(phoneRecord.phone_number, phone_number) && 
              phoneRecord.user_id !== user.id &&
              phoneRecord.provider === 'whatsapp') {
            whatsappUserId = phoneRecord.user_id;
            console.log(`🔍 Found WhatsApp user ${whatsappUserId} with phone ${phoneRecord.phone_number} matching ${phone_number}`);
            break;
          }
        }
      }

      if (whatsappUserId) {
        console.log(`🔗 Starting merge: WhatsApp account ${whatsappUserId} → Web account ${user.id}`);
        
        // Count data before migration
        const { count: memoryCount } = await supabase
          .from('memories')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', whatsappUserId);
        
        const { count: messageCount } = await supabase
          .from('whatsapp_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', whatsappUserId);

        console.log(`📊 Data to migrate: ${memoryCount} memories, ${messageCount} messages`);
        
        // Migrate memories
        const { error: memoriesError } = await supabase
          .from('memories')
          .update({ user_id: user.id })
          .eq('user_id', whatsappUserId);

        if (memoriesError) {
          console.error('❌ Error migrating memories:', memoriesError);
        } else {
          console.log(`✅ Migrated ${memoryCount} memories`);
        }

        // Migrate WhatsApp messages
        const { error: messagesError } = await supabase
          .from('whatsapp_messages')
          .update({ user_id: user.id })
          .eq('user_id', whatsappUserId);

        if (messagesError) {
          console.error('❌ Error migrating messages:', messagesError);
        } else {
          console.log(`✅ Migrated ${messageCount} messages`);
        }

        // Migrate WhatsApp sessions
        const { error: sessionsError } = await supabase
          .from('whatsapp_sessions')
          .update({ user_id: user.id })
          .eq('user_id', whatsappUserId);

        if (sessionsError) {
          console.error('❌ Error migrating sessions:', sessionsError);
        } else {
          console.log('✅ Sessions migrated');
        }

        // Migrate memory insights
        const { error: insightsError } = await supabase
          .from('memory_insights')
          .update({ user_id: user.id })
          .eq('user_id', whatsappUserId);

        if (insightsError) {
          console.error('❌ Error migrating insights:', insightsError);
        } else {
          console.log('✅ Insights migrated');
        }

        // Delete old phone number record for WhatsApp user
        await supabase
          .from('user_phone_numbers')
          .delete()
          .eq('user_id', whatsappUserId);
        
        console.log('✅ Old phone record deleted');

        // Ensure web user's phone is in normalized format and verified
        const { data: webUserPhones } = await supabase
          .from('user_phone_numbers')
          .select('*')
          .eq('user_id', user.id);
        
        const webUserPhone = webUserPhones?.find(p => phonesMatch(p.phone_number, normalizedPhone));
        
        if (webUserPhone) {
          await supabase
            .from('user_phone_numbers')
            .update({
              phone_number: normalizedPhone, // Normalize
              verified: true,
              verification_code: null,
              verification_expires_at: null
            })
            .eq('id', webUserPhone.id);
          console.log('✅ Web user phone normalized and verified');
        }
        
        console.log('✅ Old phone record deleted');

        // Merge profile data from WhatsApp user to web user
        const { data: whatsappUsersData } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', whatsappUserId)
          .maybeSingle();
        
        const { data: webUsersData } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data: whatsappProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', whatsappUserId)
          .maybeSingle();

        const { data: webProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        // Merge users table data - fill in missing web user fields from WhatsApp user
        if (whatsappUsersData && webUsersData) {
          const mergedData: any = {};
          if (!webUsersData.name && whatsappUsersData.name) mergedData.name = whatsappUsersData.name;
          if (!webUsersData.age && whatsappUsersData.age) mergedData.age = whatsappUsersData.age;
          if (!webUsersData.birth_date && whatsappUsersData.birth_date) mergedData.birth_date = whatsappUsersData.birth_date;
          if (!webUsersData.birth_place && whatsappUsersData.birth_place) mergedData.birth_place = whatsappUsersData.birth_place;
          if (!webUsersData.current_location && whatsappUsersData.current_location) mergedData.current_location = whatsappUsersData.current_location;
          
          if (Object.keys(mergedData).length > 0) {
            await supabase
              .from('users')
              .update(mergedData)
              .eq('user_id', user.id);
            console.log('✅ Merged users table data from WhatsApp to web user');
          }
        }

        // Merge user_profiles data
        if (whatsappProfile && !webProfile) {
          // Move WhatsApp profile to web user
          await supabase
            .from('user_profiles')
            .update({ user_id: user.id })
            .eq('user_id', whatsappUserId);
          console.log('✅ Moved WhatsApp profile to web user');
        } else if (whatsappProfile && webProfile) {
          // Both exist - merge data, web profile takes precedence for filled fields
          const mergedProfileData: any = {};
          if (!webProfile.preferred_name && whatsappProfile.preferred_name) mergedProfileData.preferred_name = whatsappProfile.preferred_name;
          if (!webProfile.age && whatsappProfile.age) mergedProfileData.age = whatsappProfile.age;
          if (!webProfile.hometown && whatsappProfile.hometown) mergedProfileData.hometown = whatsappProfile.hometown;
          if (!webProfile.location && whatsappProfile.location) mergedProfileData.location = whatsappProfile.location;
          if (!webProfile.occupation && whatsappProfile.occupation) mergedProfileData.occupation = whatsappProfile.occupation;
          if (!webProfile.relationship_status && whatsappProfile.relationship_status) mergedProfileData.relationship_status = whatsappProfile.relationship_status;
          if (!webProfile.education_background && whatsappProfile.education_background) mergedProfileData.education_background = whatsappProfile.education_background;
          
          if (Object.keys(mergedProfileData).length > 0) {
            await supabase
              .from('user_profiles')
              .update(mergedProfileData)
              .eq('user_id', user.id);
            console.log('✅ Merged user_profiles data from WhatsApp to web user');
          }
          
          // Delete WhatsApp profile after merge
          await supabase
            .from('user_profiles')
            .delete()
            .eq('user_id', whatsappUserId);
          console.log('✅ Deleted WhatsApp profile after merge');
        } else if (!whatsappProfile && !webProfile) {
          // Neither exists - create a basic one for the merged account
          await supabase
            .from('user_profiles')
            .insert({
              user_id: user.id,
              onboarding_completed: false,
              profile_completeness_score: 0
            });
          console.log('✅ Created new user_profiles for merged account');
        }
        // If only webProfile exists, no action needed

        // Delete WhatsApp users table entry after merge
        if (whatsappUsersData) {
          await supabase
            .from('users')
            .delete()
            .eq('user_id', whatsappUserId);
          console.log('✅ Deleted WhatsApp users table entry');
        }

        // Finally, delete the WhatsApp-only auth user
        const { error: deleteUserError } = await supabase.auth.admin.deleteUser(whatsappUserId);
        
        if (deleteUserError) {
          console.error('❌ Error deleting WhatsApp user:', deleteUserError);
        } else {
          console.log('✅ WhatsApp auth user deleted');
        }
        
        console.log(`🎉 Account merge complete! Migrated ${memoryCount} memories and ${messageCount} messages`);
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
