# 📚 Documentación Técnica - Gestor Documental Muni Inteligente

## 🏗️ Arquitectura Detallada del Sistema

### Estructura del Proyecto

```
ProyectoFinalDW/
├── src/                          # Código fuente del backend
│   ├── index.js                  # Punto de entrada de la aplicación
│   ├── api/                      # Lógica de la API
│   │   ├── controllers/          # Controladores de rutas
│   │   │   ├── authController.js # Autenticación de usuarios
│   │   │   ├── documentController.js # Gestión de documentos
│   │   │   └── searchController.js   # Búsqueda semántica
│   │   ├── middleware/           # Middleware personalizado
│   │   │   └── authMiddleware.js # Verificación de autenticación
│   │   ├── routes/               # Definición de rutas
│   │   │   ├── authRoutes.js     # Rutas de autenticación
│   │   │   ├── documentRoutes.js # Rutas de documentos
│   │   │   └── searchRoutes.js   # Rutas de búsqueda
│   │   └── services/             # Servicios de negocio
│   │       └── searchService.js  # Lógica de búsqueda
│   ├── config/                   # Configuraciones
│   │   ├── documentAI.js         # Configuración Document AI
│   │   ├── gemini.js             # Configuración Gemini
│   │   └── supabase.js           # Configuración Supabase
│   └── services/                 # Servicios principales
│       ├── authService.js        # Servicio de autenticación
│       └── documentService.js    # Servicio de documentos
├── frontend/                     # Frontend estático
│   ├── index.html               # Página de login
│   ├── dashboard.html           # Dashboard principal
│   └── assets/                  # Recursos estáticos
│       ├── css/
│       │   └── style.css        # Estilos principales
│       └── js/
│           └── main.js          # Lógica del frontend
├── tools/                       # Herramientas de desarrollo
│   └── debugChunks.js          # Script de debug
├── gcp-credentials.json         # Credenciales de Google Cloud
├── package.json                 # Dependencias del proyecto
└── .env                         # Variables de entorno
```

## 🔧 Tecnologías y Dependencias

### Backend Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",           // Framework web
    "@supabase/supabase-js": "^2.38.0", // Cliente de Supabase
    "@google-cloud/documentai": "^8.3.0", // Document AI
    "@google/generative-ai": "^0.2.1",    // Gemini AI
    "multer": "^1.4.5-lts.1",      // Manejo de archivos
    "cors": "^2.8.5",              // CORS policy
    "dotenv": "^16.3.1",           // Variables de entorno
    "express-rate-limit": "^7.1.5" // Rate limiting
  }
}
```

### Frontend Technologies

- **HTML5**: Estructura semántica moderna
- **CSS3**: Con características avanzadas:
  - CSS Grid y Flexbox
  - CSS Variables (Custom Properties)
  - CSS Animations y Transitions
  - Backdrop-filter para efectos glass
  - Media queries para responsive design
- **JavaScript ES6+**: Características modernas:
  - Async/await para operaciones asíncronas
  - Fetch API para peticiones HTTP
  - Clipboard API para copiar texto
  - File API para manejo de archivos
  - Local Storage para persistencia

## 🗄️ Esquema de Base de Datos

### Tabla: `documents`

```sql
CREATE TABLE documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    file_size BIGINT,
    mime_type TEXT,
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'ready', 'error'))
);
```

**Descripción de campos:**
- `id`: Identificador único del documento
- `user_id`: Referencia al usuario propietario
- `file_name`: Nombre original del archivo
- `storage_path`: Ruta en Supabase Storage
- `status`: Estado del procesamiento
- `uploaded_at`: Timestamp de subida
- `processed_at`: Timestamp de procesamiento completo
- `file_size`: Tamaño del archivo en bytes
- `mime_type`: Tipo MIME del archivo

### Tabla: `document_chunks`

```sql
CREATE TABLE document_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Descripción de campos:**
- `id`: Identificador único del chunk
- `content`: Contenido textual del fragmento
- `metadata`: Metadatos en formato JSON
- `embedding`: Vector de embeddings (768 dimensiones)
- `created_at`: Timestamp de creación

**Estructura del metadata:**
```json
{
  "documentId": "uuid-del-documento",
  "document_id": "uuid-del-documento", // Fallback
  "page": 1,
  "chunk_index": 0,
  "loc": {
    "lines": {
      "from": 1,
      "to": 10
    }
  },
  "source": "nombre-archivo.pdf"
}
```

### Índices y Optimizaciones

```sql
-- Índice para búsqueda vectorial (cosine similarity)
CREATE INDEX document_chunks_embedding_idx 
ON document_chunks USING ivfflat (embedding vector_cosine_ops);

-- Índice para búsqueda por documento
CREATE INDEX document_chunks_metadata_document_idx 
ON document_chunks USING gin ((metadata->>'documentId'));

-- Índice para documentos por usuario
CREATE INDEX documents_user_id_idx ON documents(user_id);

-- Índice para documentos por estado
CREATE INDEX documents_status_idx ON documents(status);
```

## 🔐 Sistema de Autenticación

### Flow de Autenticación

1. **Registro/Login**: Frontend envía credenciales a Supabase Auth
2. **Token JWT**: Supabase retorna un JWT con información del usuario
3. **Middleware**: `authMiddleware.js` valida el token en cada request
4. **RLS**: Row Level Security asegura que usuarios solo accedan a sus datos

### Middleware de Autenticación

```javascript
// src/api/middleware/authMiddleware.js
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Error de autenticación' });
  }
};
```

## 📄 Procesamiento de Documentos

### Pipeline de Procesamiento

1. **Upload**: Archivo se sube a Supabase Storage
2. **Document AI**: Google Document AI extrae texto y estructura
3. **Chunking**: Texto se divide en fragmentos semánticamente coherentes
4. **Embedding**: Cada chunk se convierte en vector usando embeddings
5. **Storage**: Chunks y vectores se almacenan en PostgreSQL
6. **Indexing**: Se actualizan índices para búsqueda rápida

### Servicio de Documentos

```javascript
// src/services/documentService.js - Función de procesamiento
const processDocument = async (documentId, filePath) => {
  try {
    // 1. Actualizar estado a 'processing'
    await updateDocumentStatus(documentId, 'processing');
    
    // 2. Extraer texto con Document AI
    const extractedText = await extractTextFromDocument(filePath);
    
    // 3. Dividir en chunks
    const chunks = await chunkDocument(extractedText, documentId);
    
    // 4. Generar embeddings y almacenar
    await storeDocumentChunks(chunks, documentId);
    
    // 5. Actualizar estado a 'ready'
    await updateDocumentStatus(documentId, 'ready');
    
  } catch (error) {
    await updateDocumentStatus(documentId, 'error');
    throw error;
  }
};
```

## 🔍 Sistema de Búsqueda Semántica

### Algoritmo de Búsqueda

1. **Query Processing**: La consulta del usuario se convierte en embedding
2. **Vector Search**: Se buscan chunks similares usando cosine similarity
3. **Ranking**: Resultados se ordenan por relevancia semántica
4. **Context Assembly**: Se ensambla contexto coherente de múltiples chunks
5. **Response**: Se retorna contexto con metadatos de fuente

### Implementación de Búsqueda

```javascript
// src/api/services/searchService.js
const semanticSearch = async (query, userId, limit = 10) => {
  // 1. Generar embedding de la query
  const queryEmbedding = await generateEmbedding(query);
  
  // 2. Búsqueda vectorial con filtro por usuario
  const { data: chunks } = await supabase.rpc('search_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: limit,
    user_id: userId
  });
  
  // 3. Procesar y retornar resultados
  return processSearchResults(chunks);
};
```

### Función SQL para Búsqueda Vectorial

```sql
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  user_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = (dc.metadata->>'documentId')::uuid
  WHERE d.user_id = search_documents.user_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## 🤖 Integración con IA

### Google Gemini para Resúmenes

```javascript
// src/config/gemini.js
const generateSummary = async (content) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const prompt = `
    Analiza el siguiente contenido de documento municipal y genera un resumen ejecutivo conciso:
    
    ${content}
    
    El resumen debe:
    - Ser máximo 3-4 párrafos
    - Destacar puntos clave y decisiones importantes
    - Usar lenguaje formal apropiado para documentos municipales
    - Incluir fechas, números y datos relevantes
  `;
  
  const result = await model.generateContent(prompt);
  return result.response.text();
};
```

### Google Document AI para Extracción

```javascript
// src/config/documentAI.js
const extractTextFromDocument = async (filePath) => {
  const client = new DocumentProcessorServiceClient();
  
  const request = {
    name: `projects/${projectId}/locations/us/processors/${processorId}`,
    rawDocument: {
      content: fs.readFileSync(filePath),
      mimeType: 'application/pdf'
    }
  };
  
  const [result] = await client.processDocument(request);
  return result.document.text;
};
```

## 🎨 Frontend Architecture

### Estructura del Frontend

```javascript
// frontend/assets/js/main.js - Estructura principal
const DocumentManager = {
  // Gestión de documentos
  fetchDocuments: async () => { /* ... */ },
  uploadDocument: async (file) => { /* ... */ },
  summarizeDocument: async (id) => { /* ... */ },
  
  // UI Management
  renderDocuments: (documents) => { /* ... */ },
  showPopup: (element, content) => { /* ... */ },
  closeAllPopups: () => { /* ... */ },
  
  // Utilidades
  apiFetch: async (url, options) => { /* ... */ },
  copyTextToClipboard: async (text) => { /* ... */ }
};
```

### Sistema de Estilos CSS

```css
/* Variables del tema */
:root {
  /* Colores principales */
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --accent-color: #f093fb;
  
  /* Efectos glass */
  --glass-bg: rgba(255, 255, 255, 0.25);
  --glass-border: rgba(255, 255, 255, 0.18);
  
  /* Sombras */
  --shadow-sm: 0 2px 4px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 25px rgba(0,0,0,0.12);
}

/* Animaciones principales */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes cardSlideIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

## 🔄 API Reference

### Endpoints de Autenticación

#### POST /api/auth/signup
```json
// Request
{
  "email": "usuario@example.com",
  "password": "password123"
}

// Response
{
  "user": {
    "id": "uuid",
    "email": "usuario@example.com"
  },
  "session": {
    "access_token": "jwt_token",
    "expires_at": 1234567890
  }
}
```

#### POST /api/auth/signin
```json
// Request
{
  "email": "usuario@example.com",
  "password": "password123"
}

// Response (igual que signup)
```

### Endpoints de Documentos

#### GET /api/documents
```json
// Query Parameters
{
  "status": "ready|pending|processing|error", // Opcional
  "limit": 20,  // Opcional
  "offset": 0   // Opcional
}

// Response
{
  "documents": [
    {
      "id": "uuid",
      "file_name": "documento.pdf",
      "status": "ready",
      "uploaded_at": "2024-01-01T00:00:00Z",
      "file_size": 1024000,
      "mime_type": "application/pdf"
    }
  ],
  "total": 1
}
```

#### POST /api/documents/upload
```javascript
// Request (FormData)
const formData = new FormData();
formData.append('file', fileObject);

// Response
{
  "message": "Archivo subido exitosamente",
  "document": {
    "id": "uuid",
    "file_name": "documento.pdf",
    "status": "pending"
  }
}
```

#### POST /api/documents/:id/summarize
```json
// Response
{
  "summary": "Resumen generado por IA del documento...",
  "generated_at": "2024-01-01T00:00:00Z"
}
```

### Endpoints de Búsqueda

#### GET /api/search
```json
// Query Parameters
{
  "q": "texto a buscar",
  "limit": 10  // Opcional
}

// Response
{
  "results": [
    {
      "content": "Fragmento de texto relevante...",
      "document": {
        "id": "uuid",
        "file_name": "documento.pdf"
      },
      "similarity": 0.85,
      "metadata": {
        "page": 1,
        "chunk_index": 0
      }
    }
  ],
  "query": "texto a buscar",
  "total_results": 1
}
```

## 🛠️ Herramientas de Desarrollo

### Debug de Chunks

```bash
# Inspeccionar chunks de un documento específico
node tools/debugChunks.js <document_id>

# Ejemplo de salida
Chunks encontrados para documento abc-123:
- Chunk 1: "Contenido del primer fragmento..." (Página 1)
- Chunk 2: "Contenido del segundo fragmento..." (Página 1)
- Total: 2 chunks
```

### Variables de Debug

```env
# Habilitar logs detallados
DEBUG=true
LOG_LEVEL=debug

# Logs específicos de componentes
DEBUG_SUPABASE=true
DEBUG_DOCUMENT_AI=true
DEBUG_GEMINI=true
```

## 🔒 Consideraciones de Seguridad

### Row Level Security (RLS)

```sql
-- Los usuarios solo pueden ver sus propios documentos
CREATE POLICY "users_own_documents" ON documents
  FOR ALL USING (auth.uid() = user_id);

-- Los chunks solo son accesibles a través de documentos del usuario
CREATE POLICY "users_own_chunks" ON document_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE id = (document_chunks.metadata->>'documentId')::uuid 
      AND user_id = auth.uid()
    )
  );
```

### Validación de Archivos

```javascript
// Validación en el servidor
const validateFile = (file) => {
  const allowedTypes = ['application/pdf', 'text/plain', 'application/msword'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('Tipo de archivo no permitido');
  }
  
  if (file.size > maxSize) {
    throw new Error('Archivo demasiado grande');
  }
};
```

### Rate Limiting

```javascript
// Limitación de requests
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requests por ventana
  message: 'Demasiadas solicitudes, intente más tarde'
});

app.use('/api/', limiter);
```

## 📊 Monitoreo y Logging

### Estructura de Logs

```javascript
// Ejemplo de log estructurado
const logger = {
  info: (message, data = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...data
    }));
  },
  
  error: (message, error = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    }));
  }
};
```

### Métricas Importantes

- **Tiempo de procesamiento de documentos**
- **Accuracy de la búsqueda semántica**
- **Tasa de éxito en uploads**
- **Tiempo de respuesta de la API**
- **Uso de almacenamiento**

## 🚀 Optimizaciones y Performance

### Caching de Embeddings

```javascript
// Cache de embeddings frecuentes
const embeddingCache = new Map();

const getCachedEmbedding = async (text) => {
  const hash = crypto.createHash('md5').update(text).digest('hex');
  
  if (embeddingCache.has(hash)) {
    return embeddingCache.get(hash);
  }
  
  const embedding = await generateEmbedding(text);
  embeddingCache.set(hash, embedding);
  return embedding;
};
```

### Chunking Inteligente

```javascript
// Estrategia de chunking por párrafos
const intelligentChunking = (text, maxChunkSize = 1000) => {
  const paragraphs = text.split('\n\n');
  const chunks = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
};
```

## 📝 Mejores Prácticas

### Manejo de Errores

```javascript
// Wrapper para manejo consistente de errores
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware de manejo de errores
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';
  
  logger.error('Error en API', { 
    url: req.url, 
    method: req.method, 
    error: err.message 
  });
  
  res.status(status).json({ 
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

### Optimización de Queries

```sql
-- Query optimizada para búsqueda
EXPLAIN ANALYZE
SELECT DISTINCT ON (d.id)
  d.id,
  d.file_name,
  d.status,
  string_agg(dc.content, ' ' ORDER BY dc.metadata->>'chunk_index') as preview
FROM documents d
JOIN document_chunks dc ON d.id = (dc.metadata->>'documentId')::uuid
WHERE d.user_id = $1
  AND d.status = 'ready'
  AND dc.embedding <=> $2 < 0.3
GROUP BY d.id, d.file_name, d.status
ORDER BY d.id, MIN(dc.embedding <=> $2)
LIMIT 10;
```

---

Esta documentación técnica proporciona una visión completa del sistema, desde la arquitectura hasta los detalles de implementación, facilitando el mantenimiento y la extensión del proyecto.