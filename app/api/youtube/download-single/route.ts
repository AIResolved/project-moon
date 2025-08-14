import type { NextRequest } from "next/server"
import { Supadata } from '@supadata/js'

// Supadata configuration
const supadata = new Supadata({
  apiKey: process.env.SUPADATA_API_KEY!,
})

interface SingleVideoRequest {
  videoId: string
}

// YouTube validation function
function isValidYouTubeVideoId(videoId: string): boolean {
  const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/
  return videoIdRegex.test(videoId)
}

// Get YouTube video transcript using Supadata
async function getVideoTranscript(videoId: string): Promise<{ srtContent: string; title: string }> {
  try {
    console.log(`📝 Fetching transcript for video ID: ${videoId}`)
    
    const transcript = await supadata.youtube.transcript({
      videoId: videoId,
    })
    
    console.log(`✅ Transcript received, content items: ${Array.isArray(transcript.content) ? transcript.content.length : 0}`)
    
    if (!transcript.content || !Array.isArray(transcript.content) || transcript.content.length === 0) {
      throw new Error('No transcript content available for this video')
    }
    
    // Convert transcript to SRT format
    let srtContent = ''
    transcript.content.forEach((item: any, index: number) => {
      const startTime = formatTime(item.start || 0)
      const endTime = formatTime((item.start || 0) + (item.duration || 0))
      const text = item.text || ''
      
      srtContent += `${index + 1}\n${startTime} --> ${endTime}\n${text}\n\n`
    })
    
    // Get video title (you might want to make another API call to get video info)
    const title = `YouTube Video ${videoId}`
    
    console.log(`📄 Generated SRT content length: ${srtContent.length} characters`)
    
    return {
      srtContent: srtContent.trim(),
      title
    }
  } catch (error) {
    console.error("❌ Error fetching transcript via Supadata:", error)
    throw error
  }
}

// Helper function to format time in SRT format (HH:MM:SS,mmm)
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds % 1) * 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
}

export async function POST(request: NextRequest) {
  try {
    const { videoId }: SingleVideoRequest = await request.json()
    
    if (!videoId) {
      return Response.json(
        { error: 'Please provide a video ID' },
        { status: 400 }
      )
    }

    if (!isValidYouTubeVideoId(videoId)) {
      return Response.json(
        { error: 'Invalid YouTube video ID format' },
        { status: 400 }
      )
    }

    if (!process.env.SUPADATA_API_KEY) {
      return Response.json(
        { error: 'Supadata API key is not configured' },
        { status: 500 }
      )
    }

    console.log(`Starting transcript extraction for video: ${videoId}`)
    
    // Get transcript directly from YouTube via Supadata
    const { srtContent, title } = await getVideoTranscript(videoId)

    const subtitleFile = {
      videoId,
      title,
      filename: `${title.replace(/[^\w\s-]/g, '_')}_subtitles.srt`,
      srtContent,
      size: Buffer.byteLength(srtContent, 'utf-8'),
      status: 'completed' as const,
      method: 'supadata' as const
    }

    console.log(`✅ Completed processing video ${videoId}`)
    
    return Response.json({
      success: true,
      subtitleFile
    })

  } catch (error) {
    console.error('Transcript extraction error:', error)
    return Response.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return Response.json({
    message: 'Single video transcript extraction API is working',
    method: 'GET',
    usage: 'Use POST method with video ID to extract transcript using Supadata',
    requirements: 'Ensure SUPADATA_API_KEY is configured'
  })
} 