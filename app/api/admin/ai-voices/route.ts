import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getToken } from 'next-auth/jwt'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: voices, error } = await supabase
      .from('ai_voices')
      .select('*')
      .order('provider', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching AI voices:', error)
      return NextResponse.json({ error: 'Failed to fetch AI voices' }, { status: 500 })
    }

    return NextResponse.json({ success: true, voices })
  } catch (error) {
    console.error('Error in AI voices GET route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
  
    const { provider, voice_id, name } = await request.json()

    if (!provider || !voice_id || !name) {
      return NextResponse.json({ error: 'Provider, voice_id, and name are required' }, { status: 400 })
    }

    if (!['murf', 'elevenlabs', 'speechify', 'playai', 'minimax', 'fishaudio', 'voicemaker'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider. Must be murf, elevenlabs, speechify, playai, minimax, fishaudio, or voicemaker' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Check if voice already exists
    const { data: existingVoice } = await supabase
      .from('ai_voices')
      .select('id')
      .eq('provider', provider)
      .eq('voice_id', voice_id)
      .single()

    if (existingVoice) {
      return NextResponse.json({ error: 'Voice with this provider and voice_id already exists' }, { status: 409 })
    }

    const { data: voice, error } = await supabase
      .from('ai_voices')
      .insert([{ provider, voice_id, name }])
      .select()
      .single()

    if (error) {
      console.error('Error creating AI voice:', error)
      return NextResponse.json({ error: 'Failed to create AI voice' }, { status: 500 })
    }

    return NextResponse.json({ success: true, voice })
  } catch (error) {
    console.error('Error in AI voices POST route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id, provider, voice_id, name } = await request.json()

    if (!id || !provider || !voice_id || !name) {
      return NextResponse.json({ error: 'ID, provider, voice_id, and name are required' }, { status: 400 })
    }

    if (!['murf', 'elevenlabs', 'speechify', 'playai', 'minimax', 'fishaudio', 'voicemaker'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider. Must be murf, elevenlabs, speechify, playai, minimax, fishaudio, or voicemaker' }, { status: 400 })
    }

    const supabase = await createClient()
    
    const { data: voice, error } = await supabase
      .from('ai_voices')
      .update({ provider, voice_id, name })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating AI voice:', error)
      return NextResponse.json({ error: 'Failed to update AI voice' }, { status: 500 })
    }

    return NextResponse.json({ success: true, voice })
  } catch (error) {
    console.error('Error in AI voices PUT route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Voice ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    const { error } = await supabase
      .from('ai_voices')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting AI voice:', error)
      return NextResponse.json({ error: 'Failed to delete AI voice' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in AI voices DELETE route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 