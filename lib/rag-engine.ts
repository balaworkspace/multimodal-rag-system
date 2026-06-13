import { supabase } from './supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Gemini API client
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY in .env.local');
}
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * STEP 1: Chunking
 * Splits a large text document into smaller, manageable paragraphs.
 */
export function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += paragraph + '\n\n';
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
/**
 * STEP 2: Embedding
 * Sends a chunk of text to Google Gemini to get its vector representation.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // 🚀 Switch to embedding-001 which is fully supported on the v1beta endpoint
  const model = genAI.getGenerativeModel({ model: 'embedding-001' });

  const result = await model.embedContent({
    content: { parts: [{ text }], role: 'user' },
    taskType: 'RETRIEVAL_DOCUMENT' as any,
  });

  return result.embedding.values;
}

/**
 * STEP 3: Processing and Storing
 * Takes a file's ID and its raw text, chunks it, embeds it, and saves it to Supabase.
 */
export async function processAndStoreDocument(fileId: string, rawText: string) {
  try {
    console.log(`Processing document for file: ${fileId}`);

    // 1. Chunk the text
    const chunks = chunkText(rawText);
    console.log(`Split document into ${chunks.length} chunks.`);

    // 2. Process each chunk
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;

      // Generate the embedding using Gemini
      const embedding = await generateEmbedding(chunk);

      // 3. Save the chunk and its embedding to Supabase
      const { error } = await supabase
        .from('document_embeddings')
        .insert({
          file_id: fileId,
          content: chunk,
          embedding: embedding, // vector(768) ✅
        });

      if (error) {
        console.error('Error inserting chunk into Supabase:', error);
        throw error;
      }
    }

    console.log('Successfully processed and stored all document chunks.');
    return { success: true, chunksProcessed: chunks.length };

  } catch (error) {
    console.error('Failed to process document:', error);
    return { success: false, error };
  }
}