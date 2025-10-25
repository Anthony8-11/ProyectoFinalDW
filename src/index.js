require('dotenv').config(); // Carga las variables de .env al inicio

const express = require('express');
const cors = require('cors');
const documentRoutes = require('./api/routes/documentRoutes');
const authRoutes = require('./api/routes/authRoutes');

// --- Configuración Inicial ---
const app = express();
const port = process.env.PORT || 3000;

// --- Middlewares ---
app.use(cors()); // Enable CORS
app.use(express.json()); // Permite al servidor entender JSON
app.use(express.urlencoded({ extended: true })); // Para parsear form data

// --- Rutas de la API ---
app.use('/api/documents', documentRoutes);
app.use('/api/auth', authRoutes);

// --- Ruta de Prueba ---
app.get('/', (req, res) => {
   res.json({ message: '¡El servidor del Gestor Documental Muni Inteligente está funcionando!' });
});

// --- Manejo de errores ---
app.use((err, req, res, next) => {
   console.error(err.stack);
   res.status(500).json({ error: 'Something went wrong!' });
});

// Iniciar el servidor
app.listen(port, () => {
   console.log(`Servidor escuchando en http://localhost:${port}`);
});