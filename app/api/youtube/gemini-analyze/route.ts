import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface GeminiAnalyzeRequest {
  videoId: string
  videoUrl: string
  title: string
  query?: string
}

export async function POST(request: NextRequest) {
  console.log('=== POST /api/youtube/gemini-analyze ===')
  
  try {
    console.log('Parsing request body...')
    const requestBody: GeminiAnalyzeRequest = await request.json()
    console.log('Request body received:', {
      videoId: requestBody.videoId,
      videoUrl: requestBody.videoUrl,
      title: requestBody.title,
      query: requestBody.query
    })
    
    const { videoId, videoUrl, title, query } = requestBody

    if (!videoId || !videoUrl) {
      console.log('Validation failed: missing required fields')
      return NextResponse.json(
        { error: 'Video ID and URL are required' },
        { status: 400 }
      )
    }

    console.log('Checking Google API key...')
    if (!process.env.GOOGLE_API_KEY) {
      console.error('Google API key not found')
      return NextResponse.json(
        { error: 'Google API key not configured. Please contact administrator.' },
        { status: 500 }
      )
    }

    console.log(`🚀 Analyzing video with Gemini: "${title}" (${videoId})`)

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" })

    // Create analysis prompt
    const analysisPrompt = query 
      ? `Analyze this YouTube video with a focus on: "${query}". Provide detailed analysis including timestamps, key moments, quotes, and insights. Pay special attention to elements related to the query while still providing comprehensive coverage of the video content.`
      : `Analyze this YouTube video comprehensively. Provide detailed analysis including timestamps, key moments, quotes, character insights, conflicts, and story elements. Focus on dramatic moments, important revelations, and content that would be valuable for storytelling or content creation.`

    const fullPrompt = `${analysisPrompt}

Please provide your analysis in a detailed format covering:
- Comprehensive summary of the video content
- Key points and insights
- Important timestamps with descriptions and significance
- Main topics and themes
- Emotional tone and mood
- Key quotes or statements
- Actionable insights and takeaways
- Character insights (if applicable)
- Conflict elements or dramatic moments
- Story ideas inspired by the content
- A creative writing prompt based on the video
- timestamps in the format of MM:SS or HH:MM:SS

IMPORTANT: Throughout your analysis, please include SPECIFIC TIMESTAMPS in MM:SS or HH:MM:SS format whenever you reference moments in the video. For example:
- "At 2:45, the speaker says..."
- "The dramatic moment at 15:32 shows..."
- "Key insight occurs at 1:23:45..."

Include at least 15-20 timestamps throughout your analysis, marking important moments, key quotes, topic changes, dramatic moments, or significant insights. Format timestamps clearly as MM:SS or HH:MM:SS followed by a description of what happens at that moment.

Be thorough and include specific details, quotes, and references to moments in the video. Focus on elements that would be valuable for content creators, writers, or researchers.`

    console.log('Sending request to Gemini AI...')
    
    // Generate content using Gemini with video URL
    const result = await model.generateContent([
      fullPrompt,
      {
        fileData: {
          fileUri: videoUrl,
          mimeType: 'video/mp4'
        },
      },
    ])

    console.log('Gemini AI response received')
    const responseText = result.response.text()
    
    console.log(`✅ Gemini analysis completed for video: "${title}"`)
    console.log('Raw response length:', responseText.length)
    
    return NextResponse.json({
      success: true,
      rawResponse: responseText,
      videoId,
      title,
      query: query || null,
      usingGemini: true
    })

  } catch (error) {
    console.error('Error in gemini-analyze:', error)
    console.error('Error details:', {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack
    })
    
    // Check if it's a specific Gemini API error
    if ((error as Error).message.includes('fileUri')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to analyze video: Video may not be accessible or supported by Gemini AI. Try using the standard analysis method instead.'
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to analyze video with Gemini: ' + (error as Error).message
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Gemini video analysis API is running',
    endpoints: {
      POST: 'Analyze YouTube video using Google Gemini AI (returns raw response)'
    }
  })
} 