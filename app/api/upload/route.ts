import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { processAndStoreDocument } from '@/lib/rag-engine';

export async function POST(request: NextRequest) {
  try {
    // 1. Read the incoming JSON directly (Bypassing FormData completely)
    const body = await request.json();
    const { fileName, fileSize, fileType, rawText } = body;

    if (!rawText || !fileName) {
      return NextResponse.json({ error: 'Missing file data or text content' }, { status: 400 });
    }

    // 2. Register the file in the Supabase 'files' table
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .insert({
        file_name: fileName,
        file_size: fileSize,
        content_type: fileType,
      })
      .select()
      .single();

    if (fileError) {
      console.error('Error saving file record:', fileError);
      return NextResponse.json({ error: 'Failed to save file log to database' }, { status: 500 });
    }

    // 3. Send the text to our RAG Engine for chunking and embedding
    const ragResult = await processAndStoreDocument(fileRecord.id, rawText);

    if (!ragResult.success) {
      // Clean up the file record if RAG embedding fails
      await supabase.from('files').delete().eq('id', fileRecord.id);
      return NextResponse.json({ error: 'Failed to generate vector embeddings' }, { status: 500 });
    }

    // 4. Return success response
    return NextResponse.json({
      success: true,
      message: 'File uploaded and vectorized successfully!',
      fileId: fileRecord.id,
      chunks: ragResult.chunksProcessed,
    });

  } catch (error) {
    console.error('Upload API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}