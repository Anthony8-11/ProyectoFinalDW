const express = require('express');
const router = express.Router();
const multer = require('multer');
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware'); // Asumiendo que lo tienes

// Configuración de Multer para guardar en memoria (buffer)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Límite de 10MB
});

// Aplicamos el middleware de autenticación a todas las rutas de documentos
router.use(authMiddleware);

// POST /api/v1/documents
// 1. authMiddleware (verifica token)
// 2. upload.single('file') (procesa el archivo con Multer)
// 3. documentController.uploadDocument (nuestra lógica)
router.post('/', upload.single('file'), documentController.uploadDocument);

// Additional routes (e.g., GET, DELETE) can be added here if needed, but for now, focusing on upload

module.exports = router;