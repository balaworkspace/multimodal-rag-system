import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch all files sorted by latest upload
    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, files });
  } catch (error) {
    console.error('Files API Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve files' }, { status: 500 });
  }
}