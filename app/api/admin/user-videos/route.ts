import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// GET - Fetch all videos for a specific user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('🎬 Admin: Fetching videos for user:', userId)

    // Fetch all videos for the user
    const { data: videos, error: videosError } = await supabaseAdmin
      .from('video_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (videosError) {
      console.error('❌ Error fetching user videos:', videosError)
      throw new Error(`Failed to fetch user videos: ${videosError.message}`)
    }

    console.log(`✅ Successfully fetched ${videos?.length || 0} videos for user ${userId}`)

    return NextResponse.json({
      success: true,
      videos: videos || [],
      count: videos?.length || 0
    })

  } catch (error: any) {
    console.error('💥 Admin user videos fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user videos' },
      { status: 500 }
    )
  }
}

// DELETE - Delete specific video for a user
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const videoId = searchParams.get('videoId')

    if (!userId || !videoId) {
      return NextResponse.json(
        { error: 'User ID and Video ID are required' },
        { status: 400 }
      )
    }

    console.log('🗑️ Admin: Deleting video for user:', { userId, videoId })

    // Delete the specific video
    const { error: deleteError } = await supabaseAdmin
      .from('video_records')
      .delete()
      .eq('id', videoId)
      .eq('user_id', userId) // Ensure video belongs to the user

    if (deleteError) {
      console.error('❌ Error deleting video:', deleteError)
      throw new Error(`Failed to delete video: ${deleteError.message}`)
    }

    console.log('✅ Successfully deleted video:', videoId)

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully'
    })

  } catch (error: any) {
    console.error('💥 Admin video deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete video' },
      { status: 500 }
    )
  }
} 