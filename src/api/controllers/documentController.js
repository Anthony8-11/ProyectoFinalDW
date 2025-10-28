const documentService = require('../../services/documentService');

class DocumentController {

  /**
   * Maneja la subida de un nuevo documento.
   */
  async uploadDocument(req, res) {
    try {
      const file = req.file; // 'file' viene de Multer
      const userId = req.user.id; // 'user' viene de tu AuthMiddleware

      if (!file) {
        return res.status(400).json({ message: 'No se adjuntó ningún archivo.' });
      }

      // Llamamos al nuevo servicio
      const newDocument = await documentService.uploadAndTriggerProcessing(file, userId);

      // ¡Respuesta Clave! 202 Accepted
      // Le decimos al cliente: "Recibido, tu solicitud está siendo procesada."
      res.status(202).json({
        message: 'Archivo recibido y en cola para procesamiento.',
        document: newDocument,
      });

    } catch (error) {
      console.error('Error en uploadDocument Controller:', error.message);
      res.status(500).json({ message: 'Error interno del servidor al procesar el archivo.' });
    }
  }

  // Get a document by ID
  async getDocument(req, res) {
    try {
      const { id } = req.params;
      const document = await documentService.getDocument(id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      res.json(document);
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  }

  // Get all documents
  async getAllDocuments(req, res) {
    try {
      const documents = await documentService.getAllDocuments();
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  }

  // Delete a document
  async deleteDocument(req, res) {
    try {
      const { id } = req.params;
      await documentService.deleteDocument(id);
      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }
}

module.exports = new DocumentController();