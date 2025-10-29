const supabase = require('../../config/supabase');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function search(query) {
  // 1. Embed-Query
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const embedResult = await embeddingModel.embedContent(query);
  const queryVector = embedResult.embedding.values;

  // 2. Retrieve-Context
  const { data: chunks, error } = await supabase.rpc('match_documents', {
    query_embedding: queryVector,
    match_threshold: 0.5,
    match_count: 5
  });

  if (error) {
    throw new Error(`Error retrieving context: ${error.message}`);
  }

  // 3. Build-Prompt
  const contextText = chunks.map(chunk => chunk.content).join('\n');
  const prompt = `Answer the question based only on the following context:\n\n${contextText}\n\nQuestion: ${query}\n\nAnswer:`;

  // 4. Generate-Response
  const generativeModel = genAI.getGenerativeModel({ model: 'models/gemini-flash-latest' });
  const response = await generativeModel.generateContent(prompt);
  const answer = await response.response.text();

  return answer;
}

module.exports = {
  search
};