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