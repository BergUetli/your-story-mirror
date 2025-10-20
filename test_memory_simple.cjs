const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🧪 Testing Memory Schema Validation');
console.log('==================================');
console.log('URL:', supabaseUrl ? 'Present' : 'Missing');
console.log('Key:', supabaseKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSchema() {
  try {
    console.log('\n📝 Testing memory insert with new schema...');
    
    const testMemory = {
      user_id: '00000000-0000-0000-0000-000000000000',
      title: 'Test Memory - Schema Check',
      text: 'Testing if is_primary_chunk and source_type columns exist',
      is_primary_chunk: true,
      source_type: 'validation_test'
    };

    const { data, error } = await supabase
      .from('memories')
      .insert([testMemory])
      .select();

    if (error) {
      if (error.message.includes('foreign key') || error.message.includes('auth.users')) {
        console.log('✅ SCHEMA VALIDATION PASSED!');
        console.log('   Expected foreign key error - schema is correct');
        console.log('   is_primary_chunk and source_type columns exist');
        return true;
      } else if (error.message.includes('is_primary_chunk') || error.message.includes('source_type')) {
        console.log('❌ SCHEMA VALIDATION FAILED!');
        console.log('   Missing required columns in memories table');
        console.log('   Migration needs to be applied');
        console.log('   Error:', error.message);
        return false;
      } else {
        console.log('⚠️ Unexpected error:', error.message);
        return false;
      }
    } else {
      console.log('✅ Insert successful (cleanup needed)');
      if (data && data[0]?.id) {
        await supabase.from('memories').delete().eq('id', data[0].id);
        console.log('🧹 Test record cleaned up');
      }
      return true;
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
    return false;
  }
}

testSchema().then(success => {
  console.log('\n📊 RESULT:');
  if (success) {
    console.log('✅ Database schema is ready for memory saving');
    console.log('🎯 Voice archiving diagnostics should now pass');
  } else {
    console.log('❌ Database migration still needed');
    console.log('🔧 Apply migration from MIGRATION_INSTRUCTIONS.md');
  }
});