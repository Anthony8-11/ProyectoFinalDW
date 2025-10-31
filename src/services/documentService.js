// Importamos el cliente de Supabase
const supabase = require('../config/supabase');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Servicio para manejar la lógica de documentos.
 * Ya no procesa IA; ahora delega el trabajo pesado a n8n.
 */
class DocumentService {

  /**
   * Sube un archivo, crea un registro 'Pendiente' y dispara el webhook de n8n.
   * @param {object} file - El objeto 'file' de Multer (req.file).
   * @param {string} userId - El ID del usuario autenticado (req.user.id).
   * @returns {object} El registro del documento creado en la DB.
   */
  async uploadAndTriggerProcessing(file, userId) {
    if (!file) {
      throw new Error('No se proporcionó ningún archivo.');
    }

    // 1. Definir la ruta en Supabase Storage
    // Sanitize filename to avoid invalid storage keys (remove/replace special chars)
    const original = file.originalname || 'file';
    const sanitized = original
      .normalize('NFKD') // decompose accents
      .replace(/\p{Diacritic}/gu, '') // remove diacritics
      .replace(/[^a-zA-Z0-9._-]/g, '-') // replace unsafe chars with '-'
      .replace(/-+/g, '-') // collapse multiple dashes
      .replace(/^-|-$/g, ''); // trim leading/trailing dashes

    const fileName = `${Date.now()}-${sanitized}`;
    const storagePath = `public/${fileName}`;

    try {
      // 2. Subir el archivo a Supabase Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
        });

      if (storageError) {
        console.error('Error en Supabase Storage:', storageError.message);
        throw new Error(`Error al subir el archivo: ${storageError.message}`);
      }

      // --- ¡¡ESTE ES EL BLOQUE QUE TE FALTABA!! ---
      // 3. Crear el registro en la DB
      const { data: dbData, error: dbError } = await supabase
        .from('documents')
        .insert({
          file_name: file.originalname,
          storage_path: storagePath,
          user_id: userId,
          status: 'Pendiente',
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error en Base de Datos Supabase:', dbError.message);
        throw new Error(`Error al crear registro en DB: ${dbError.message}`);
      }

      // 4. ¡Ahora SÍ definimos newDocument!
      const newDocument = dbData;
      // ---------------------------------------------

      // 5. Obtener la URL pública del archivo
      // (Ahora 'newDocument' existe y esto funciona)
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(newDocument.storage_path);
      
      const publicURL = urlData.publicUrl;

      // 6. Llamar al Webhook de n8n
      const webhookUrl = process.env.N8N_WEBHOOK_URL;
      if (!webhookUrl) {
        console.warn('Advertencia: N8N_WEBHOOK_URL no está configurada.');
        return newDocument; // Devolvemos el documento aunque el webhook no esté
      }

      // Preparamos los datos para n8n
      const payload = {
        documentId: newDocument.id,
        storagePath: newDocument.storage_path,
        publicURL: publicURL, // <-- Añadimos la URL pública
        fileName: newDocument.file_name, // <-- Usamos la variable correcta
        userId: userId
      };

      // Usamos fetch para llamar al webhook
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(err => {
        console.error('Error al llamar al webhook de n8n:', err.message);
      });
      
      // 7. Devolver el documento creado al controlador
      return newDocument;

    } catch (error) {
      console.error('Error en uploadAndTriggerProcessing:', error);
      throw error;
    }
  }

  // ... Aquí puedes mantener tus otras funciones CRUD si las necesitas
  // (ej. getDocumentById, deleteDocument)
}

module.exports = new DocumentService();

// Additional helper: get public URL for a document by id
DocumentService.prototype.getPublicUrl = async function(documentId) {
  try {
    // Use maybeSingle to avoid throwing when no rows are found
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('id, storage_path')
      .eq('id', documentId)
      .maybeSingle();

    if (docErr) {
      console.error('Error fetching document record:', docErr.message);
      return null;
    }

    if (!doc) {
      // no row found
      console.warn('No document record found for id:', documentId);
      return null;
    }

    const { data: urlData, error: urlErr } = supabase.storage
      .from('documents')
      .getPublicUrl(doc.storage_path);

    if (urlErr) {
      console.error('Error getting public URL from storage:', urlErr.message);
      throw new Error('No se pudo obtener la URL pública');
    }

    return urlData?.publicUrl || null;
  } catch (err) {
    console.error('getPublicUrl error:', err);
    throw err;
  }
};

// Get a document record by id
DocumentService.prototype.getDocument = async function(documentId) {
  try {
    const { data: doc, error } = await supabase
      .from('documents')
    .select('id, file_name, storage_path, user_id, status, uploaded_at')
    .eq('id', documentId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching document by id:', error.message);
      throw error;
    }

    return doc || null;
  } catch (err) {
    console.error('getDocument error:', err);
    throw err;
  }
};

// Get all documents (basic listing)
DocumentService.prototype.getAllDocuments = async function(userId = null, opts = {}) {
  try {
    let query = supabase
      .from('documents')
      .select('id, file_name, storage_path, user_id, status, uploaded_at');

    if (userId) query = query.eq('user_id', userId);

    // Filtering by status
    if (opts.status) {
      query = query.eq('status', opts.status);
    }

    // Search by name (partial, case-insensitive)
    if (opts.q) {
      query = query.ilike('file_name', `%${opts.q}%`);
    }

    // Sorting
    const sort = opts.sort || 'uploaded_desc';
    if (sort === 'uploaded_asc') query = query.order('uploaded_at', { ascending: true });
    else if (sort === 'name_asc') query = query.order('file_name', { ascending: true });
    else if (sort === 'name_desc') query = query.order('file_name', { ascending: false });
    else query = query.order('uploaded_at', { ascending: false });

    const { data: docs, error } = await query;

    if (error) {
      console.error('Error fetching documents list:', error.message);
      throw error;
    }

    return docs || [];
  } catch (err) {
    console.error('getAllDocuments error:', err);
    throw err;
  }
};

// Delete a document record (and attempt to remove from storage)
DocumentService.prototype.deleteDocument = async function(documentId) {
  try {
    // Fetch record first
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('id, storage_path')
      .eq('id', documentId)
      .maybeSingle();

    if (docErr) {
      console.error('Error finding document to delete:', docErr.message);
      throw docErr;
    }

    if (doc && doc.storage_path) {
      // Attempt to remove from storage
      const { error: rmErr } = await supabase.storage.from('documents').remove([doc.storage_path]);
      if (rmErr) console.warn('Could not remove storage object:', rmErr.message);
    }

    // Remove DB record
    const { error: delErr } = await supabase.from('documents').delete().eq('id', documentId);
    if (delErr) {
      console.error('Error deleting document record:', delErr.message);
      throw delErr;
    }

    return true;
  } catch (err) {
    console.error('deleteDocument error:', err);
    throw err;
  }
};

// Summarize a document by id: gather chunks (try RPC or chunks table), assemble text and send to Gemini
DocumentService.prototype.summarizeDocument = async function(documentId, userId = null) {
  try {
    // Ensure document exists and belongs to user (if userId provided)
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('id, file_name, storage_path, user_id')
      .eq('id', documentId)
      .maybeSingle();

    if (docErr) {
      console.error('Error fetching document for summarize:', docErr.message);
      throw docErr;
    }
    if (!doc) {
      const err = new Error('Documento no encontrado');
      err.status = 404;
      throw err;
    }
    if (userId && doc.user_id !== userId) {
      const err = new Error('Permiso denegado');
      err.status = 403;
      throw err;
    }

    // Prefer the known table 'document_chunks' (as you confirmed). Fall back to RPC or other tables only if empty.
    let chunks = null;

    try {
      // document_chunks stores document id inside the jsonb `metadata` column.
      // Some pipelines use `documentId` (camelCase) or `document_id` (snake_case).
      // Try both metadata->>documentId and metadata->>document_id.
      let dChunks = null;
      try {
        const resA = await supabase
          .from('document_chunks')
          .select('id, content, metadata')
          .eq("metadata->>documentId", documentId);
        if (!resA.error && resA.data && resA.data.length) dChunks = resA.data;
      } catch (e) {
        // ignore
      }
      if (!dChunks) {
        try {
          const resB = await supabase
            .from('document_chunks')
            .select('id, content, metadata')
            .eq("metadata->>document_id", documentId);
          if (!resB.error && resB.data && resB.data.length) dChunks = resB.data;
        } catch (e) {
          // ignore
        }
      }

      if (dChunks) chunks = dChunks;
    } catch (e) {
      // ignore and try RPC
    }

    // If not found in document_chunks, try RPC then other tables as backup
    if (!chunks) {
      try {
        const { data: rpcChunks, error: rpcErr } = await supabase.rpc('get_document_chunks', { document_id: documentId });
        if (!rpcErr && rpcChunks && rpcChunks.length) chunks = rpcChunks;
      } catch (e) {
        // ignore
      }
    }

    if (!chunks) {
      const tryTables = ['documents_chunks', 'chunks', 'embeddings', 'documents_embedding_chunks'];
      for (const tbl of tryTables) {
        try {
          // Try both direct column and metadata-based filtering to be robust across schemas
          let tChunks = null;
          try {
            const res1 = await supabase.from(tbl).select('id, content, metadata').eq('document_id', documentId);
            if (res1 && !res1.error && res1.data && res1.data.length) tChunks = res1.data;
          } catch (e) {
            // ignore
          }
          if (!tChunks) {
            try {
              // try camelCase metadata key
              const res2 = await supabase.from(tbl).select('id, content, metadata').eq("metadata->>documentId", documentId);
              if (res2 && !res2.error && res2.data && res2.data.length) tChunks = res2.data;
            } catch (e) {
              // ignore
            }
          }
          if (!tChunks) {
            try {
              const res3 = await supabase.from(tbl).select('id, content, metadata').eq("metadata->>document_id", documentId);
              if (res3 && !res3.error && res3.data && res3.data.length) tChunks = res3.data;
            } catch (e) {
              // ignore
            }
          }

          if (tChunks) {
            chunks = tChunks;
            break;
          }
        } catch (e) {
          // ignore table not found
        }
      }
    }

    if (!chunks || chunks.length === 0) {
      const err = new Error('No se encontraron fragmentos para el documento');
      err.status = 404;
      throw err;
    }

    // Assemble full text ordered by page/chunk_index or by metadata fields if present
    const getNum = (meta, keys, def = 0) => {
      if (!meta) return def;
      // Check nested loc.lines.from commonly used by the ingest pipeline
      try {
        if (meta.loc && meta.loc.lines && meta.loc.lines.from !== undefined) {
          const n = Number(meta.loc.lines.from);
          if (!Number.isNaN(n)) return n;
        }
      } catch (e) {
        // ignore
      }
      for (const k of keys) {
        if (meta[k] !== undefined && meta[k] !== null) {
          const n = Number(meta[k]);
          if (!Number.isNaN(n)) return n;
        }
      }
      return def;
    };

    chunks.sort((a, b) => {
      const ma = a.metadata || {};
      const mb = b.metadata || {};
      const pa = getNum(ma, ['page', 'page_number', 'pageIndex', 'pageIndexNumber']);
      const pb = getNum(mb, ['page', 'page_number', 'pageIndex', 'pageIndexNumber']);
      if (pa !== pb) return pa - pb;
      const ca = getNum(ma, ['chunk_index', 'chunkIndex', 'index']);
      const cb = getNum(mb, ['chunk_index', 'chunkIndex', 'index']);
      return ca - cb;
    });

    let fullText = chunks.map(c => c.content || (c.metadata && c.metadata.text) || '').join('\n\n');

    // Safety: if the assembled text is very large, truncate to a reasonable size and note truncation
    const MAX_CHARS = 150000; // ~150KB
    let truncated = false;
    if (fullText.length > MAX_CHARS) {
      fullText = fullText.slice(0, MAX_CHARS);
      truncated = true;
    }

    // Build prompt
    let prompt = `Resume el siguiente documento oficial en 5 puntos clave (bullet points):\n\n${fullText}`;
    if (truncated) prompt = `Nota: el texto fue truncado por longitud. ${prompt}`;

    // Call Gemini generative model
    const generativeModel = genAI.getGenerativeModel({ model: 'models/gemini-flash-latest' });
    const response = await generativeModel.generateContent(prompt);
    const summary = await response.response.text();

    return { summary };
  } catch (err) {
    console.error('summarizeDocument error:', err);
    throw err;
  }
};