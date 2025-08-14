import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface AIVoice {
  id: number
  created_at: string
  name: string
  provider: string
  voice_id: string
}

// GET - Fetch all voices or voices for a specific provider
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    let query = supabase
      .from('ai_voices')
      .select('*')
      .order('created_at', { ascending: false })

    if (provider) {
      query = query.eq('provider', provider)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching voices:', error)
      return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 })
    }

    return NextResponse.json({ voices: data || [] })
  } catch (error: any) {
    console.error('Error in GET /api/voices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add a new voice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, provider, voice_id } = body

    if (!name || !provider || !voice_id) {
      return NextResponse.json({ 
        error: 'Name, provider, and voice_id are required' 
      }, { status: 400 })
    }

    // Check if voice_id already exists for this provider
    const { data: existingVoice } = await supabase
      .from('ai_voices')
      .select('id')
      .eq('provider', provider)
      .eq('voice_id', voice_id)
      .single()

    if (existingVoice) {
      return NextResponse.json({ 
        error: 'Voice ID already exists for this provider' 
      }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('ai_voices')
      .insert([{ name, provider, voice_id }])
      .select()
      .single()

    if (error) {
      console.error('Error creating voice:', error)
      return NextResponse.json({ error: 'Failed to create voice' }, { status: 500 })
    }

    console.log(`✅ Created new voice: ${name} (${provider}:${voice_id})`)
    return NextResponse.json({ voice: data }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/voices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update an existing voice
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, provider, voice_id } = body

    if (!id || !name || !provider || !voice_id) {
      return NextResponse.json({ 
        error: 'ID, name, provider, and voice_id are required' 
      }, { status: 400 })
    }

    // Check if voice_id already exists for this provider (excluding current voice)
    const { data: existingVoice } = await supabase
      .from('ai_voices')
      .select('id')
      .eq('provider', provider)
      .eq('voice_id', voice_id)
      .neq('id', id)
      .single()

    if (existingVoice) {
      return NextResponse.json({ 
        error: 'Voice ID already exists for this provider' 
      }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('ai_voices')
      .update({ name, provider, voice_id })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating voice:', error)
      return NextResponse.json({ error: 'Failed to update voice' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Voice not found' }, { status: 404 })
    }

    console.log(`✅ Updated voice: ${name} (${provider}:${voice_id})`)
    return NextResponse.json({ voice: data })
  } catch (error: any) {
    console.error('Error in PUT /api/voices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a voice
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Voice ID is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('ai_voices')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error deleting voice:', error)
      return NextResponse.json({ error: 'Failed to delete voice' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Voice not found' }, { status: 404 })
    }

    console.log(`✅ Deleted voice: ${data.name} (${data.provider}:${data.voice_id})`)
    return NextResponse.json({ message: 'Voice deleted successfully' })
  } catch (error: any) {
    console.error('Error in DELETE /api/voices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 