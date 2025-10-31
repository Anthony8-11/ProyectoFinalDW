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

      // Llamamos al servicio para manejar la subida de un solo archivo
      const newDocument = await documentService.uploadAndTriggerProcessing(file, userId);

      // Responder con 202 Accepted
      return res.status(202).json({
        message: 'Archivo recibido y en cola para procesamiento.',
        document: newDocument,
      });

    } catch (error) {
      // Log completo para diagnóstico
      console.error('Error en uploadDocument Controller:', error && error.stack ? error.stack : error);
      // En desarrollo es útil devolver el detalle del error para depuración en frontend
      const detail = (error && error.message) ? error.message : 'Error interno al procesar el archivo.';
      res.status(500).json({ message: 'Error interno del servidor al procesar el archivo.', detail });
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

  // Get a document's public URL by ID
  async getPublicUrl(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'Document id required' });
      const url = await documentService.getPublicUrl(id);
      if (!url) return res.status(404).json({ error: 'Public URL not found' });
      res.json({ url });
    } catch (error) {
      console.error('Error getting public URL:', error);
      res.status(500).json({ error: 'Failed to get public URL' });
    }
  }

  // Get all documents
  async getAllDocuments(req, res) {
    try {
      // Support optional query params for filtering/sorting/search
      const userId = req.user && req.user.id ? req.user.id : null;
      const { status, sort, q } = req.query;
      const documents = await documentService.getAllDocuments(userId, { status, sort, q });
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

  // Summarize a document
  async summarizeDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user && req.user.id ? req.user.id : null;
      const result = await documentService.summarizeDocument(id, userId);
      res.json({ summary: result.summary });
    } catch (error) {
      console.error('Error summarizing document:', error);
      const status = error && error.status ? error.status : 500;
      res.status(status).json({ error: error.message || 'Failed to summarize document' });
    }
  }
}

module.exports = new DocumentController();