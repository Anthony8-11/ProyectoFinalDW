const express = require('express');
const router = express.Router();
const multer = require('multer');
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware'); // Asumiendo que lo tienes

// Configuración de Multer para guardar en memoria (buffer)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  // Aumentado temporalmente para pruebas a 50MB. Ajustar según necesidades.
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Aplicamos el middleware de autenticación a todas las rutas de documentos
// `authMiddleware` exporta { authenticate }, así que apuntamos a la función.
router.use(authMiddleware.authenticate);

// POST /api/v1/documents
// 1. authMiddleware (verifica token)
// 2. upload.single('file') (procesa un único archivo con Multer)
// 3. documentController.uploadDocument (nuestra lógica)
router.post('/', upload.single('file'), documentController.uploadDocument);

// GET /api/documents/:id/url - obtiene la URL pública (protegido)
router.get('/:id/url', documentController.getPublicUrl);

// GET /api/documents - listar documentos
router.get('/', documentController.getAllDocuments);

// GET /api/documents/:id - obtener documento (debe ir después de /:id/url)
router.get('/:id', documentController.getDocument);

// POST /api/documents/:id/summarize - generar resumen del documento
router.post('/:id/summarize', documentController.summarizeDocument);

// Additional routes (e.g., GET, DELETE) can be added here if needed, but for now, focusing on upload

module.exports = router;