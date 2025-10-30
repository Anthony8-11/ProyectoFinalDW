const documentService = require('../../services/documentService');

class DocumentController {

  /**
   * Maneja la subida de un nuevo documento.
   */
  async uploadDocument(req, res) {
    try {
      const files = req.files; // ahora recibimos múltiples archivos
      const userId = req.user.id; // 'user' viene de tu AuthMiddleware

      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No se adjuntó ningún archivo.' });
      }

      // Procesar todos los archivos en paralelo
      const results = await Promise.all(files.map(f => documentService.uploadAndTriggerProcessing(f, userId)));

      // Responder con 202 y lista de documentos creados
      res.status(202).json({
        message: 'Archivos recibidos y en cola para procesamiento.',
        documents: results,
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