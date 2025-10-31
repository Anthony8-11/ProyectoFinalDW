// Debug helper: inspect document_chunks rows for a given document id
// Usage: node tools/debugChunks.js <documentId>

// Ensure SUPABASE env vars are available - provide a friendly message if not
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Error: Las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_KEY no están definidas en este terminal.');
  console.error('Antes de ejecutar este script exporta las variables (PowerShell):');
  console.error("  $env:SUPABASE_URL = '<your-supabase-url>'; $env:SUPABASE_SERVICE_KEY = '<your-service-role-key>'; node tools/debugChunks.js <documentId>");
  process.exit(1);
}

const supabase = require('../src/config/supabase');

async function main() {
  const docId = process.argv[2];
  if (!docId) {
    console.error('Usage: node tools/debugChunks.js <documentId>');
    process.exit(1);
  }

  try {
    console.log('Checking table columns for document_chunks...');
    const { data: cols, error: colsErr } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'document_chunks');

    if (colsErr) {
      console.warn('Could not query information_schema.columns (may require permissions).', colsErr.message || colsErr);
    } else {
      console.log('Columns for document_chunks:');
      console.table(cols);
    }

    console.log(`\nQuerying up to 20 chunks where metadata->>document_id='${docId}'...`);
    const { data, error } = await supabase
      .from('document_chunks')
      .select('id, content, metadata')
      .eq("metadata->>document_id", docId)
      .limit(20);

    if (error) {
      console.error('Error querying document_chunks:', error.message || error);
      process.exit(2);
    }

    if (!data || data.length === 0) {
  console.log('No rows found for that document_id in document_chunks.');
      console.log('Listing up to 20 sample rows (id + metadata) to inspect how document ids are stored:');
      const { data: sample, error: sErr } = await supabase.from('document_chunks').select('id, metadata').limit(20);
      if (sErr) {
        console.warn('Could not list sample document_ids:', sErr.message || sErr);
      } else {
        // Print each metadata as JSON to reveal nested structure
        sample.forEach((row, i) => {
          console.log(`--- sample row ${i} ---`);
          console.log('id:', row.id);
          try {
            console.log('metadata:', JSON.stringify(row.metadata, null, 2));
          } catch (e) {
            console.log('metadata (raw):', row.metadata);
          }
        });
      }
      process.exit(0);
    }

    console.log(`Found ${data.length} chunk rows:`);
    data.forEach((r, i) => {
      console.log('--- row', i + 1, '---');
      console.log(JSON.stringify(r, null, 2));
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(3);
  }
}

main();
