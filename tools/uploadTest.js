require('dotenv').config();
const supabase = require('../src/config/supabase');
const fs = require('fs');

async function run() {
  try {
    const email = 'ejemplo2@correo.com';
    const password = 'ContraseñaSegura123';

    console.log('Signing in...');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Sign-in error:', error);
      return;
    }
    const token = data?.session?.access_token;
    console.log('Got token:', !!token);
    if (!token) {
      console.error('No token returned. Data:', JSON.stringify(data, null, 2));
      return;
    }

    // Read test file
    const filePath = 'test-upload.txt';
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, 'contenido de prueba');
    }

    // Build multipart body manually so we can send the file buffer
    const fileBuffer = fs.readFileSync(filePath);
    const boundary = '----node-multipart-' + Date.now();
    const prefix = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test-upload.txt"\r\nContent-Type: text/plain\r\n\r\n`);
    const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
    const bodyBuffer = Buffer.concat([prefix, fileBuffer, suffix]);

    console.log('Uploading file to /api/documents...');
    const resp = await fetch('http://localhost:3000/api/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(bodyBuffer.length)
      },
      body: bodyBuffer
    });

    const text = await resp.text();
    console.log('Upload status:', resp.status);
    console.log('Upload response body:', text);

  } catch (err) {
    console.error('Exception in upload test:', err);
  }
}

run();
