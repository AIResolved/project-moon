import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { audioUrl } = await request.json()
    
    if (!audioUrl) {
      return NextResponse.json(
        { success: false, error: 'Audio URL is required' },
        { status: 400 }
      )
    }

    // Extract the base URL to construct the subtitles URL
    // Assuming subtitles are stored alongside audio with .srt extension
    const baseUrl = audioUrl.replace(/\.(mp3|wav|m4a)$/i, '')
    const subtitlesUrl = `${baseUrl}.srt`
    
    try {
      // Check if subtitles file exists by making a HEAD request
      const checkResponse = await fetch(subtitlesUrl, { method: 'HEAD' })
      
      if (checkResponse.ok) {
        return NextResponse.json({
          success: true,
          subtitlesUrl: subtitlesUrl,
          ready: true
        })
      } else {
        return NextResponse.json({
          success: false,
          ready: false,
          message: 'Subtitles not yet available'
        })
      }
    } catch (error) {
      // If HEAD request fails, subtitles are not ready
      return NextResponse.json({
        success: false,
        ready: false,
        message: 'Subtitles generation in progress'
      })
    }

  } catch (error) {
    console.error('Error checking subtitles status:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 