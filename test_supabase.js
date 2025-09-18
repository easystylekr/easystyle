import { createClient } from '@supabase/supabase-js';

console.log('Testing Supabase connection...');

const supabaseUrl = 'https://zpqymfjoexvghmibnnme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwcXltZmpvZXh2Z2htaWJubm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNzE4MTksImV4cCI6MjA3Mzc0NzgxOX0.YE7IV-Sf-PBwfWYi9Q-uyEasfIQQDYjKUml8ICqszM0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  try {
    console.log('Testing connection to:', supabaseUrl);

    // Test the connection
    const { data, error } = await supabase
      .from('products_productcategory')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Supabase connection error:', error);
      return false;
    }

    console.log('✅ Supabase connection successful!');
    console.log('Categories table accessible');
    return true;
  } catch (error) {
    console.error('❌ Error testing connection:', error);
    return false;
  }
}

runTest();