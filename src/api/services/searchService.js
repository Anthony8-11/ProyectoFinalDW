const supabase = require('../../config/supabase');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function search(query) {
  // 1. Embed-Query
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const embedResult = await embeddingModel.embedContent(query);
  const queryVector = embedResult.embedding.values;

  // 2. Retrieve-Context (chunks should contain at least `content` and some document identifiers/metadata)
  const { data: chunks, error } = await supabase.rpc('match_documents', {
    query_embedding: queryVector,
    match_threshold: 0.5,
    match_count: 5
  });

  if (error) {
    throw new Error(`Error retrieving context: ${error.message}`);
  }

  // 3. Build-Prompt
  const contextText = (chunks || []).map(chunk => chunk.content).join('\n');
  const prompt = `Answer the question based only on the following context:\n\n${contextText}\n\nQuestion: ${query}\n\nAnswer:`;

  // 4. Generate-Response
  const generativeModel = genAI.getGenerativeModel({ model: 'models/gemini-flash-latest' });
  const response = await generativeModel.generateContent(prompt);
  const answer = await response.response.text();

  // 5. Extract source document metadata from chunks
  // Be defensive: different RPC/DB setups may return different field names. We'll try common ones.
  const sourcesMap = new Map();
  (chunks || []).forEach((chunk) => {
    // Prefer metadata fields if present (some pipelines store document id/name inside metadata JSON)
    const meta = chunk.metadata || (chunk.metadata === null ? null : undefined);
    const id = (meta && (meta.document_id || meta.doc_id || meta.file_id)) || chunk.document_id || chunk.doc_id || chunk.document || chunk.source_id || chunk.file_id || chunk.id || null;
    const name = (meta && (meta.document_name || meta.file_name || meta.filename || meta.title)) || chunk.document_name || chunk.file_name || chunk.filename || chunk.source || chunk.title || null;
    const snippet = chunk.content || chunk.text || (meta && (meta.text || meta.content)) || null;
    const page = (meta && (meta.page || meta.page_number)) || chunk.page || chunk.page_number || null;
    const url = chunk.public_url || chunk.url || chunk.file_url || (meta && meta.public_url) || null;

    // Choose a key to dedupe sources; fall back to name or content slice if no id
    const key = id || name || (snippet ? snippet.slice(0, 40) : `chunk-${Math.random().toString(36).slice(2,8)}`);

    if (!sourcesMap.has(key)) {
      sourcesMap.set(key, {
        id: id || null,
        name: name || (id ? `doc-${id}` : (snippet ? snippet.slice(0, 60) : 'unknown')),
        snippets: snippet ? [snippet] : [],
        page: page,
        url: url
      });
    } else {
      const entry = sourcesMap.get(key);
      if (snippet) entry.snippets.push(snippet);
    }
  });

  const sources = Array.from(sourcesMap.values());

  // Try to normalize each source to a document record in the DB when possible.
  // Do lookups in parallel to avoid serial DB calls.
  const normalizedPromises = sources.map(async (src) => {
    try {
      let found = null;

      // If source provides an id-like value, try direct lookup by id
      if (src.id) {
        const { data: doc, error: docErr } = await supabase
          .from('documents')
          .select('id, file_name, storage_path')
          .eq('id', src.id)
          .maybeSingle();
        if (!docErr && doc) found = doc;
      }

      // If not found and we have a name, try exact or partial match by file_name
      if (!found && src.name) {
        // Try exact match
        const { data: exact, error: exactErr } = await supabase
          .from('documents')
          .select('id, file_name, storage_path')
          .eq('file_name', src.name)
          .limit(1);
        if (!exactErr && exact && exact.length > 0) found = exact[0];
      }

      if (!found && src.name) {
        // Try partial, case-insensitive match
        const { data: partial, error: partialErr } = await supabase
          .from('documents')
          .select('id, file_name, storage_path')
          .ilike('file_name', `%${src.name}%`)
          .limit(1);
        if (!partialErr && partial && partial.length > 0) found = partial[0];
      }

      if (found) {
        // Attach canonical fields back to the source
        src.id = found.id;
        src.name = found.file_name || src.name;
        src.storage_path = found.storage_path || null;

        // Try to obtain a public URL if possible
        try {
          const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(found.storage_path);
          if (urlData && urlData.publicUrl) src.url = urlData.publicUrl;
        } catch (e) {
          // ignore storage errors; we still return the normalized id/name
        }
      }

      return src;
    } catch (err) {
      // If any lookup fails, return the original src silently
      console.warn('Error normalizing source:', err.message || err);
      return src;
    }
  });

  const normalized = await Promise.all(normalizedPromises);

  return { answer, sources: normalized };
}

module.exports = {
  search
};