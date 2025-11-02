# 📄 Gestor Documental Muni Inteligente

Un sistema de gestión documental inteligente con capacidades de procesamiento de documentos, búsqueda semántica y análisis de contenido mediante IA, diseñado específicamente para entidades municipales.

![Tecnologías](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Google AI](https://img.shields.io/badge/Google%20AI-4285F4?style=for-the-badge&logo=google&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

## 🚀 Características Principales

- **📤 Subida de Documentos**: Soporte para múltiples formatos (PDF, DOC, TXT)
- **🔍 Búsqueda Semántica**: Búsqueda inteligente basada en contenido y contexto
- **📝 Resúmenes Automáticos**: Generación de resúmenes usando Google Gemini AI
- **🔒 Autenticación Segura**: Sistema de usuarios con Supabase Auth
- **📊 Análisis de Documentos**: Procesamiento automático con Google Document AI
- **💬 Chat Inteligente**: Interacción con documentos mediante IA conversacional
- **🎨 UI Contemporánea**: Diseño moderno con animaciones y efectos glass

## 🛠️ Tecnologías Implementadas

### Backend
- **Node.js**: Runtime de JavaScript para el servidor
- **Express.js**: Framework web minimalista y flexible
- **Supabase**: 
  - Base de datos PostgreSQL
  - Autenticación de usuarios
  - Almacenamiento de archivos
  - Vectores de embeddings para búsqueda semántica

### Inteligencia Artificial
- **Google Gemini AI**: Generación de resúmenes y análisis de contenido
- **Google Document AI**: Procesamiento y extracción de texto de documentos
- **Embeddings**: Vectorización de contenido para búsqueda semántica

### Frontend
- **HTML5**: Estructura semántica
- **CSS3**: Estilos modernos con:
  - CSS Variables para theming
  - Flexbox y Grid Layout
  - Animaciones y transiciones
  - Glass morphism effects
  - Responsive design
- **JavaScript (Vanilla)**: Lógica del cliente sin frameworks
- **Google Fonts (Inter)**: Tipografía moderna

### Servicios en la Nube
- **Google Cloud Platform**: 
  - Document AI API
  - Gemini API
- **Supabase Cloud**: Base de datos y autenticación

## 📋 Prerrequisitos

- **Node.js** v18 o superior
- **npm** v8 o superior
- Cuenta en **Google Cloud Platform** con APIs habilitadas
- Cuenta en **Supabase**

## 🔧 Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/Anthony8-11/ProyectoFinalDW.git
cd ProyectoFinalDW
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
# Supabase Configuration
SUPABASE_URL=tu_supabase_url
SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=tu_project_id
GOOGLE_APPLICATION_CREDENTIALS=./gcp-credentials.json

# Google Gemini AI
GEMINI_API_KEY=tu_gemini_api_key

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 4. Configurar Google Cloud

1. **Crear un proyecto** en Google Cloud Platform
2. **Habilitar las APIs**:
   - Document AI API
   - Gemini API
3. **Crear credenciales** de servicio:
   - Ir a IAM & Admin > Service Accounts
   - Crear nueva cuenta de servicio
   - Descargar el archivo JSON de credenciales
   - Guardarlo como `gcp-credentials.json` en la raíz del proyecto

### 5. Configurar Supabase

1. **Crear un proyecto** en Supabase
2. **Configurar la base de datos**:

```sql
-- Tabla de documentos
CREATE TABLE documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    file_size BIGINT,
    mime_type TEXT
);

-- Tabla de chunks de documentos
CREATE TABLE document_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsqueda vectorial
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops);

-- Políticas de seguridad (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Política para documentos - los usuarios solo ven sus documentos
CREATE POLICY "Users can view own documents" ON documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON documents
    FOR UPDATE USING (auth.uid() = user_id);
```

3. **Configurar Storage**:
   - Crear un bucket llamado `documents`
   - Configurar políticas de acceso para usuarios autenticados

### 6. Iniciar el Servidor

```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📖 Uso del Sistema

### 1. Registro e Inicio de Sesión

1. Acceder a `http://localhost:3000`
2. Crear una nueva cuenta o iniciar sesión
3. Acceder al dashboard principal

### 2. Subir Documentos

1. Hacer clic en **"Subir Documento"**
2. Seleccionar archivos o arrastrar al área de drop
3. Los documentos se procesan automáticamente
4. El estado cambia de "Pendiente" a "Listo" cuando termina el procesamiento

### 3. Buscar Documentos

1. Usar la barra de búsqueda en el dashboard
2. El sistema realiza búsqueda semántica en el contenido
3. Los resultados se ordenan por relevancia

### 4. Generar Resúmenes

1. Hacer clic en **"Resumir"** en cualquier documento
2. El sistema genera un resumen automático usando IA
3. Usar el botón **"Copiar resumen"** para copiar al portapapeles

### 5. Chat con Documentos

1. Acceder a la sección de chat
2. Hacer preguntas sobre el contenido de los documentos
3. El sistema responde basándose en el contexto de los documentos

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│    Frontend     │────│    Backend      │────│   Supabase      │
│   (HTML/CSS/JS) │    │   (Node.js)     │    │   (PostgreSQL)  │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              │
                    ┌─────────────────┐
                    │                 │
                    │  Google Cloud   │
                    │  (AI Services)  │
                    │                 │
                    └─────────────────┘
```

### Flujo de Procesamiento de Documentos

1. **Subida**: El usuario sube un documento
2. **Almacenamiento**: Se guarda en Supabase Storage
3. **Procesamiento**: Document AI extrae el texto
4. **Chunking**: El texto se divide en fragmentos
5. **Vectorización**: Se generan embeddings para cada fragmento
6. **Indexación**: Los vectores se almacenan en la base de datos
7. **Disponibilidad**: El documento queda listo para búsqueda y análisis

## 🔌 API Endpoints

### Autenticación
- `POST /api/auth/signup` - Registro de usuario
- `POST /api/auth/signin` - Inicio de sesión
- `POST /api/auth/signout` - Cerrar sesión

### Documentos
- `GET /api/documents` - Listar documentos del usuario
- `POST /api/documents/upload` - Subir nuevo documento
- `GET /api/documents/:id` - Obtener documento específico
- `POST /api/documents/:id/summarize` - Generar resumen
- `DELETE /api/documents/:id` - Eliminar documento

### Búsqueda
- `GET /api/search` - Búsqueda semántica en documentos

### Chat
- `POST /api/chat` - Enviar mensaje al chat inteligente

## 🧪 Testing y Debugging

### Debug de Chunks

El proyecto incluye un script de debug para inspeccionar los chunks almacenados:

```bash
node tools/debugChunks.js [document_id]
```

### Variables de Debug

Agregar al `.env` para debug detallado:

```env
DEBUG=true
LOG_LEVEL=debug
```

## 🎨 Personalización del UI

### Colores del Tema

Los colores se definen en CSS Variables en `frontend/assets/css/style.css`:

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --accent-color: #f093fb;
    --success-color: #4ecdc4;
    --danger-color: #ff6b6b;
}
```

### Animaciones

El sistema incluye múltiples animaciones CSS:
- `fadeInDown` - Títulos principales
- `fadeInUp` - Secciones y formularios
- `cardSlideIn` - Tarjetas de documentos
- `backgroundShift` - Fondo animado

## 🔒 Seguridad

- **Row Level Security (RLS)** en Supabase
- **Autenticación JWT** con Supabase Auth
- **Validación de archivos** en el servidor
- **Sanitización de inputs** para prevenir XSS
- **Rate limiting** en las APIs

## 📱 Responsive Design

El sistema es completamente responsive con breakpoints:
- **Desktop**: > 768px
- **Tablet**: 768px - 480px
- **Mobile**: < 480px

## 🚀 Deployment

### Variables de Producción

```env
NODE_ENV=production
PORT=8080
# ... otras variables
```

### Servicios Recomendados

- **Backend**: Railway, Heroku, o Google Cloud Run
- **Frontend**: Netlify, Vercel, o GitHub Pages
- **Base de datos**: Supabase (incluye hosting)

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Autor

**Anthony** - [Anthony8-11](https://github.com/Anthony8-11)

## 🙏 Agradecimientos

- **Supabase** por la infraestructura de backend
- **Google Cloud** por los servicios de IA
- **Comunidad Open Source** por las librerías utilizadas

## 📞 Soporte

Si encuentras algún problema o tienes preguntas:

1. Revisa la documentación
2. Busca en los [Issues](https://github.com/Anthony8-11/ProyectoFinalDW/issues) existentes
3. Crea un nuevo Issue si es necesario

---

⭐ **¡No olvides dar una estrella al proyecto si te fue útil!** ⭐