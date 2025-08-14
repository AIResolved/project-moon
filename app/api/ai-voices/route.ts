"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface AIVoice {
  id?: number;
  name: string;
  provider: string;
  voice_id: string;
  created_at?: string;
}

// GET - Fetch all AI voices or filter by provider
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    const supabase = await createClient();
    
    let query = supabase
      .from('ai_voices')
      .select('*')
      .order('provider', { ascending: true })
      .order('name', { ascending: true });

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data: voices, error } = await query;

    if (error) {
      console.error('Error fetching AI voices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch AI voices', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ voices: voices || [] });
  } catch (error: any) {
    console.error('Error in GET /api/ai-voices:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new AI voice
export async function POST(request: NextRequest) {
  try {
    const body: Omit<AIVoice, 'id' | 'created_at'> = await request.json();
    const { name, provider, voice_id } = body;

    if (!name || !provider || !voice_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, provider, and voice_id are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if voice_id already exists for this provider
    const { data: existingVoice } = await supabase
      .from('ai_voices')
      .select('id')
      .eq('provider', provider)
      .eq('voice_id', voice_id)
      .single();

    if (existingVoice) {
      return NextResponse.json(
        { error: 'A voice with this voice_id already exists for this provider' },
        { status: 409 }
      );
    }

    const { data: newVoice, error } = await supabase
      .from('ai_voices')
      .insert({ name, provider, voice_id })
      .select()
      .single();

    if (error) {
      console.error('Error creating AI voice:', error);
      return NextResponse.json(
        { error: 'Failed to create AI voice', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ voice: newVoice }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/ai-voices:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update an existing AI voice
export async function PUT(request: NextRequest) {
  try {
    const body: AIVoice = await request.json();
    const { id, name, provider, voice_id } = body;

    if (!id || !name || !provider || !voice_id) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, provider, and voice_id are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if voice_id already exists for this provider (excluding current record)
    const { data: existingVoice } = await supabase
      .from('ai_voices')
      .select('id')
      .eq('provider', provider)
      .eq('voice_id', voice_id)
      .neq('id', id)
      .single();

    if (existingVoice) {
      return NextResponse.json(
        { error: 'A voice with this voice_id already exists for this provider' },
        { status: 409 }
      );
    }

    const { data: updatedVoice, error } = await supabase
      .from('ai_voices')
      .update({ name, provider, voice_id })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating AI voice:', error);
      return NextResponse.json(
        { error: 'Failed to update AI voice', details: error.message },
        { status: 500 }
      );
    }

    if (!updatedVoice) {
      return NextResponse.json(
        { error: 'AI voice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ voice: updatedVoice });
  } catch (error: any) {
    console.error('Error in PUT /api/ai-voices:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete an AI voice
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('ai_voices')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('Error deleting AI voice:', error);
      return NextResponse.json(
        { error: 'Failed to delete AI voice', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'AI voice deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/ai-voices:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 