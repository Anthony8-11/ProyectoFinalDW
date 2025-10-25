const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;

// Initialize Document AI client
const documentAIClient = new DocumentProcessorServiceClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

module.exports = documentAIClient;