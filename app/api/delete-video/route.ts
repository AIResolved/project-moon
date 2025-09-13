import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    console.log('🗑️ User: Deleting video:', videoId)

    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ Authentication error:', userError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // First, check if the video belongs to this user
    const { data: video, error: fetchError } = await supabase
      .from('video_records')
      .select('id, user_id')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !video) {
      console.error('❌ Video not found or access denied:', fetchError)
      return NextResponse.json(
        { error: 'Video not found or access denied' },
        { status: 404 }
      )
    }

    // Delete the video record
    const { error: deleteError } = await supabase
      .from('video_records')
      .delete()
      .eq('id', videoId)
      .eq('user_id', user.id) // Double-check ownership

    if (deleteError) {
      console.error('❌ Error deleting video:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete video: ${deleteError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Successfully deleted video:', videoId)

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully',
      videoId: videoId
    })

  } catch (error: any) {
    console.error('💥 Video deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete video' },
      { status: 500 }
    )
  }
}
