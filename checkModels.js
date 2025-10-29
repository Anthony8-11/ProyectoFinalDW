// Carga las variables de entorno (como tu GEMINI_API_KEY)
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

// Esta es la URL del endpoint "listModels"
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function getAvailableModels() {
  if (!apiKey) {
    console.error('Error: No se encontró la variable GEMINI_API_KEY en tu archivo .env');
    return;
  }

  console.log('Consultando la API de Google para listar modelos...');

  try {
    const response = await fetch(url);
    const data = await response.json();

    // Si la respuesta no es 200 OK, muestra el error
    if (!response.ok) {
      console.error('Error al contactar la API de Google:');
      console.error(JSON.stringify(data, null, 2)); // Muestra el error
      return;
    }

    // Si todo sale bien, imprime los modelos
    console.log('\n--- ¡Éxito! Modelos disponibles para tu clave: ---\n');

    data.models.forEach(model => {
      console.log(`Nombre: ${model.name}`);
      console.log(`  - Métodos Soportados: ${model.supportedGenerationMethods.join(', ')}`);
      console.log('-------------------------------------------------');
    });

  } catch (error) {
    console.error('Error de conexión:', error.message);
  }
}

getAvailableModels();