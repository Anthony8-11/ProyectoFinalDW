require('dotenv').config();
const supabase = require('../src/config/supabase');
const fs = require('fs');
const path = require('path');
const fetch = global.fetch || require('node-fetch');

async function ensureFiles() {
  const dir = path.join(__dirname, 'test_files');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  // small txt
  fs.writeFileSync(path.join(dir, 'small.txt'), 'Contenido pequeño para prueba.');

  // big txt ~11MB
  const bigPath = path.join(dir, 'big.txt');
  if (!fs.existsSync(bigPath) || fs.statSync(bigPath).size < 11 * 1024 * 1024) {
    const size = 11 * 1024 * 1024; // 11MB
    const stream = fs.createWriteStream(bigPath);
    const chunk = Buffer.alloc(1024 * 1024, 'a');
    for (let i = 0; i < 11; i++) stream.write(chunk);
    stream.end();
  }

  // fake docx (not a real docx, but extension)
  fs.writeFileSync(path.join(dir, 'sample.docx'), 'Fake docx content');

  // fake pdf (simple header + text, not fully compliant but ok for upload)
  fs.writeFileSync(path.join(dir, 'sample.pdf'), '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\n');

  return dir;
}

async function uploadFile(token, filePath) {
  const fileName = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  const boundary = '----node-multipart-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
  const prefix = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`);
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
  const bodyBuffer = Buffer.concat([prefix, fileBuffer, suffix]);

  const res = await fetch('http://localhost:3000/api/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(bodyBuffer.length)
    },
    body: bodyBuffer
  });

  let text;
  try { text = await res.text(); } catch (e) { text = '<no body>'; }
  return { status: res.status, body: text };
}

async function main() {
  const email = 'ejemplo2@correo.com';
  const password = 'ContraseñaSegura123';
  console.log('Preparing test files...');
  const dir = await ensureFiles();
  console.log('Files created in', dir);

  console.log('Signing in...');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('Sign-in failed:', error);
    process.exit(1);
  }
  const token = data?.session?.access_token;
  if (!token) {
    console.error('No token obtained');
    process.exit(1);
  }

  const files = ['small.txt', 'sample.pdf', 'sample.docx', 'big.txt'];
  for (const f of files) {
    const p = path.join(dir, f);
    console.log('\nUploading', f, '(size', (fs.statSync(p).size / 1024).toFixed(1), 'KB)');
    try {
      const res = await uploadFile(token, p);
      console.log('Status:', res.status);
      console.log('Body:', res.body);
    } catch (err) {
      console.error('Upload error for', f, err);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
