import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    console.log('🔄 GET /api/prompts - Starting to fetch prompts...');
    const supabase = await createClient()
    console.log('✅ Supabase client created successfully');
    
    const { data: prompts, error } = await supabase
      .from('prompts')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('📊 Database query completed. Error:', error);
    console.log('📊 Retrieved prompts:', prompts?.length || 0, 'records');

    if (error) {
      console.error('❌ Database error fetching prompts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch prompts' },
        { status: 500 }
      )
    }

    console.log('✅ Returning prompts successfully');
    return NextResponse.json(prompts)
  } catch (error) {
    console.error('❌ Unexpected error in GET /api/prompts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { prompt, title, theme, audience, additional_context, POV, format } = body

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Prompt name is required' },
        { status: 400 }
      )
    }

    const { data: newPrompt, error } = await supabase
      .from('prompts')
      .insert([
        {
          prompt: prompt.trim(),
          title: title?.trim() || null,
          theme: theme?.trim() || null,
          audience: audience?.trim() || null,
          additional_context: additional_context?.trim() || null,
          POV: POV || null,
          format: format || null,
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating prompt:', error)
      return NextResponse.json(
        { error: 'Failed to create prompt' },
        { status: 500 }
      )
    }

    return NextResponse.json(newPrompt, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/prompts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Prompt ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting prompt:', error)
      return NextResponse.json(
        { error: 'Failed to delete prompt' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/prompts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Prompt ID is required' },
        { status: 400 }
      )
    }

    const { prompt, title, theme, audience, additional_context, POV, format } = body

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Prompt name is required' },
        { status: 400 }
      )
    }

    const { data: updatedPrompt, error } = await supabase
      .from('prompts')
      .update({
        prompt: prompt.trim(),
        title: title?.trim() || null,
        theme: theme?.trim() || null,
        audience: audience?.trim() || null,
        additional_context: additional_context?.trim() || null,
        POV: POV || null,
        format: format || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating prompt:', error)
      return NextResponse.json(
        { error: 'Failed to update prompt' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedPrompt)
  } catch (error) {
    console.error('Error in PATCH /api/prompts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 