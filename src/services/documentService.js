// Importamos el cliente de Supabase
const supabase = require('../config/supabase');

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
    const fileName = `${Date.now()}-${file.originalname}`;
    const storagePath = `public/${fileName}`; // 'public' o el nombre de tu bucket

    try {
      // 2. Subir el archivo a Supabase Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('documents') // Asegúrate que tu bucket se llame 'documents'
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
        });

      if (storageError) {
        console.error('Error en Supabase Storage:', storageError.message);
        throw new Error(`Error al subir el archivo: ${storageError.message}`);
      }

      // 3. Crear el registro 'Pendiente' en la tabla 'documents'
      const { data: dbData, error: dbError } = await supabase
        .from('documents')
        .insert({
          file_name: file.originalname,
          storage_path: storagePath,
          user_id: userId,
          status: 'Pendiente', // Marcamos como Pendiente
        })
        .select() // .select() devuelve el registro creado
        .single(); // Esperamos un solo resultado

      if (dbError) {
        console.error('Error en Base de Datos Supabase:', dbError.message);
        throw new Error(`Error al crear registro en DB: ${dbError.message}`);
      }

      const newDocument = dbData;

      // 4. Llamar al Webhook de n8n (¡El paso clave!)
      const webhookUrl = process.env.N8N_WEBHOOK_URL;
      if (!webhookUrl) {
        console.warn('Advertencia: N8N_WEBHOOK_URL no está configurada. El procesamiento no se iniciará.');
        // En un caso real, podrías querer re-intentar esto.
        // Por ahora, continuamos para no romper el flujo de subida.
        return newDocument;
      }

      // Preparamos los datos para n8n
      const payload = {
        documentId: newDocument.id,
        storagePath: newDocument.storage_path,
        fileName: newDocument.file_name,
        userId: userId
      };

      // Usamos fetch (nativo en Node.js 18+) para llamar al webhook
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(err => {
        // La llamada al webhook es "dispara y olvida".
        // Si falla, no queremos que falle la subida del usuario.
        // Solo lo registramos en la consola.
        console.error('Error al llamar al webhook de n8n:', err.message);
      });

      // 5. Devolver el documento creado al controlador
      return newDocument;

    } catch (error) {
      console.error('Error en uploadAndTriggerProcessing:', error);
      // Si algo falla (subida o DB), lanzamos el error para que el controlador lo atrape
      throw error;
    }
  }

  // ... Aquí puedes mantener tus otras funciones CRUD si las necesitas
  // (ej. getDocumentById, deleteDocument)
}

module.exports = new DocumentService();