import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/rag-engine';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini for generating the final chat response
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY');
}
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request: NextRequest) {
  try {
    // 1. Get the user's question from the frontend
    const body = await request.json();
    const userMessage = body.message;

    if (!userMessage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 2. Generate a vector embedding for the user's question
    const queryEmbedding = await generateEmbedding(userMessage);

    // 3. RETRIEVAL: Search Supabase for the most relevant document chunks
    const { data: matchedDocuments, error: matchError } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7, // 70% similarity threshold
      match_count: 5,       // Get the top 5 most relevant chunks
    });

    if (matchError) {
      console.error('Supabase match error:', matchError);
      throw matchError;
    }

    // 4. Build the Context String
    let contextText = '';
    if (matchedDocuments && matchedDocuments.length > 0) {
      // Combine all retrieved chunks into one big string separated by dashed lines
      contextText = matchedDocuments.map((doc: { content: string }) => doc.content).join('\n\n---\n\n');
    } else {
      contextText = "No relevant context found in the uploaded documents.";
    }

    // 5. GENERATION: Construct the prompt for Gemini
    const systemPrompt = `You are a helpful, intelligent AI assistant. Answer the user's question based ONLY on the provided context below. 
If the answer cannot be found in the context, do not make one up. Instead, politely say "I don't have enough information to answer that based on the uploaded documents."

Context Documents:
${contextText}`;

    // Combine the system prompt with the user's actual question
    const finalPrompt = `${systemPrompt}\n\nUser Question: ${userMessage}`;

    // 6. Send to Gemini and create a Streaming Response
    // We use gemini-1.5-flash as it is lightning fast for chat responses
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContentStream(finalPrompt);

    // Convert Gemini's stream into a standard Web ReadableStream so the frontend can display it in real-time
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          controller.enqueue(new TextEncoder().encode(chunkText));
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 });
  }
}