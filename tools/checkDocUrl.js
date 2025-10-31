require('dotenv').config();
const supabase = require('../src/config/supabase');
const fetch = global.fetch || require('node-fetch');

async function main() {
  const email = 'ejemplo2@correo.com';
  const password = 'ContraseñaSegura123';

  console.log('Signing in...');
  const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signErr) {
    console.error('Sign-in error:', signErr);
    process.exit(1);
  }
  const token = signData?.session?.access_token;
  console.log('Got token?', !!token);

  // Get latest document (using service role key via supabase client)
  const { data: docs, error: docsErr } = await supabase.from('documents').select('id, file_name, storage_path').order('uploaded_at', { ascending: false }).limit(5);
  if (docsErr) {
    console.error('Error fetching documents from supabase:', docsErr);
    process.exit(1);
  }
  if (!docs || docs.length === 0) {
    console.error('No documents found in DB');
    process.exit(1);
  }

  const doc = docs[0];
  console.log('Using document:', doc);

  // Call backend endpoint to get public URL
  const url = `http://localhost:3000/api/documents/${doc.id}/url`;
  console.log('Requesting:', url);

  try {
    const resp = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', resp.status);
    const text = await resp.text();
    console.log('Body:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

main();
