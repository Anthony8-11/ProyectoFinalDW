require('dotenv').config();
const supabase = require('../src/config/supabase');

async function test() {
  try {
    const email = 'ejemplo2@correo.com';
  const password = 'ContraseñaSegura123';
    console.log('Attempting signInWithPassword for', email);
    let res = await supabase.auth.signInWithPassword({ email, password });
    console.log('Sign-in attempt:', JSON.stringify(res, null, 2));

    if (res.error && res.error.status === 400) {
      console.log('Sign-in failed, trying signUp...');
      const signup = await supabase.auth.signUp({ email, password });
      console.log('Sign-up result:', JSON.stringify(signup, null, 2));
      // After signup, try sign-in again
      const signin2 = await supabase.auth.signInWithPassword({ email, password });
      console.log('Second sign-in attempt:', JSON.stringify(signin2, null, 2));
    }
  } catch (err) {
    console.error('EXCEPTION', err);
  }
}

test();
