import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'

// Zod schema for video summary with enhanced dramatic elements
const VideoSummarySchema = z.object({
  videoId: z.string().describe("The video ID"),
  title: z.string().describe("The video title"),
  keyPoints: z.array(z.string()).describe("Main points with specific quotes and dramatic elements (3-5 points)"),
  mainTopic: z.string().describe("The primary topic or theme of the video"),
  timestamp: z.string().optional().describe("Most important timestamp if applicable"),
  narrativeElements: z.array(z.string()).describe("Story elements, characters, conflicts, or narrative structures with specific details"),
  emotionalTone: z.string().describe("The overall emotional tone or mood of the content"),
  dramaticElements: z.array(z.string()).describe("Key dramatic moments, conflicts, or tensions identified"),
  keyQuotes: z.array(z.string()).describe("Most impactful direct quotes from the transcript"),
  contextualInfo: z.string().describe("Background context and significance of the content")
})

// Zod schema for overall summary with enhanced dramatic format
const VideosSummarySchema = z.object({
  overallTheme: z.string().describe("Common theme with specific quotes and dramatic references"),
  keyInsights: z.array(z.string()).describe("Top 5-7 insights with specific quotes and references"),
  videoSummaries: z.array(VideoSummarySchema).describe("Individual summaries for each video"),
  commonPatterns: z.array(z.string()).describe("Common patterns with specific examples and quotes"),
  actionableItems: z.array(z.string()).describe("Actionable insights with supporting evidence"),
  narrativeThemes: z.array(z.string()).describe("Central themes with dramatic elements and quotes"),
  characterInsights: z.array(z.string()).describe("Character insights with specific behavioral examples"),
  conflictElements: z.array(z.string()).describe("Conflicts with specific quotes and dramatic moments"),
  storyIdeas: z.array(z.string()).describe("Story concepts with specific dramatic scenarios"),
  creativePrompt: z.string().describe("A compelling paragraph with specific references and dramatic elements")
})

interface SummarizeVideosRequest {
  videos: Array<{
    videoId: string
    title: string
    srtContent: string
  }>
}

export async function POST(request: NextRequest) {
  console.log('=== POST /api/summarize-videos ===')
  
  try {
    console.log('Parsing request body...')
    const requestBody: SummarizeVideosRequest = await request.json()
    console.log('Request body received:', {
      videoCount: requestBody.videos?.length || 0,
      videoTitles: requestBody.videos?.map(v => v.title) || []
    })
    
    const { videos } = requestBody

    if (!videos || videos.length === 0) {
      console.log('Validation failed: no videos provided')
      return NextResponse.json(
        { error: 'At least one video with transcript is required' },
        { status: 400 }
      )
    }

    console.log('Checking OpenAI API key...')
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not found')
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please contact administrator.' },
        { status: 500 }
      )
    }

    console.log(`🚀 Summarizing ${videos.length} videos`)

    // Create ChatOpenAI model
    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY,
    })

    // Bind schema to model using structured output
    const modelWithStructure = model.withStructuredOutput(VideosSummarySchema)

    // Helper function to truncate content to fit within character limit
    const truncateContentToLimit = (videos: Array<{ videoId: string; title: string; srtContent: string }>, maxChars: number = 120000) => {
      const basePromptLength = 3000 // Estimated prompt overhead
      const availableChars = maxChars - basePromptLength
      
      let currentLength = 0
      const truncatedVideos = []
      
      for (const video of videos) {
        const headerLength = `### Video: ${video.title} (ID: ${video.videoId})\n\nTranscript:\n\n---\n\n`.length
        const availableForContent = availableChars - currentLength - headerLength
        
        if (availableForContent <= 0) {
          console.log(`⚠️ Reached character limit, stopping at ${truncatedVideos.length} videos`)
          break
        }
        
        let content = video.srtContent
        if (content.length > availableForContent) {
          // Truncate content but try to end at a complete sentence
          content = content.substring(0, availableForContent)
          const lastPeriod = content.lastIndexOf('.')
          const lastExclamation = content.lastIndexOf('!')
          const lastQuestion = content.lastIndexOf('?')
          const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion)
          
          if (lastSentenceEnd > availableForContent * 0.8) {
            content = content.substring(0, lastSentenceEnd + 1)
          }
          
          content += '\n\n[Content truncated due to length limits]'
          console.log(`⚠️ Truncated video "${video.title}" from ${video.srtContent.length} to ${content.length} characters`)
        }
        
        truncatedVideos.push({
          ...video,
          srtContent: content
        })
        
        currentLength += headerLength + content.length
      }
      
      console.log(`📏 Content limited to ${currentLength} characters (limit: ${maxChars})`)
      console.log(`📹 Processing ${truncatedVideos.length} of ${videos.length} videos`)
      
      return truncatedVideos
    }

    // Truncate content to fit within limits
    const processedVideos = truncateContentToLimit(videos, 120000)

    // Prepare video content for analysis
    const videoContents = processedVideos.map(video => `
### Video: ${video.title} (ID: ${video.videoId})

Transcript:
${video.srtContent}

---
`).join('\n')

    console.log('Final content length:', videoContents.length)

    const prompt = `You are an expert story consultant and content analyst specializing in extracting dramatic moments, compelling quotes, and specific details from video transcripts. Your analysis should be detailed and reference-rich, similar to court transcripts, investigative journalism, and news reports.

I will provide you with transcripts from multiple YouTube videos. Your task is to analyze them from a storytelling perspective and extract narrative elements with specific quotes, dramatic moments, and detailed references.

Your analysis should focus on:
1. Extracting direct quotes verbatim from the transcripts
2. Identifying dramatic moments, conflicts, confrontations, or emotionally charged content
3. Providing specific details like names, locations, events, and timestamps
4. Creating rich contextual information about what's happening
5. Formatting summaries like detailed news reports or court documentation
6. Including specific references to what people said, when they said it, and the circumstances

Video Count: ${processedVideos.length}${processedVideos.length < videos.length ? ` (${videos.length - processedVideos.length} videos truncated due to length limits)` : ''}

${videoContents}

ANALYSIS REQUIREMENTS:
- Extract direct quotes verbatim from transcripts whenever possible
- Focus on dramatic moments, conflicts, revelations, or emotionally charged content
- Identify specific details like names, locations, events mentioned
- Look for moments of tension, surprise, revelation, or conflict
- Provide rich contextual information about what's happening
- Format summaries like detailed news reports or court documentation
- Include specific references to what people said, when they said it, and the circumstances

EXAMPLE FORMAT FOR KEY INSIGHTS:
"At timestamp 00:15:23, the speaker revealed: 'I never thought this would happen to me.' This moment marked a dramatic shift in the narrative as tensions escalated. The speaker's voice became noticeably strained, and background voices can be heard expressing shock. This revelation occurred immediately after [context], making it particularly significant because [explanation]."

EXAMPLE FORMAT FOR DRAMATIC ELEMENTS:
"According to the transcript at 00:08:45, the confrontation reached its peak when the participant declared: 'This ends right now!' The emotional intensity was palpable as multiple voices began speaking over each other. Witness accounts from the video show visible tension in body language, with the speaker's hands gesturing emphatically during this exchange."

Instructions:
- For each video, extract specific quotes and dramatic moments with timestamps
- Identify narrative elements with precise details and emotional context
- Look for conflicts, challenges, and tensions with specific quotes
- Generate story concepts grounded in actual dramatic moments from the content
- Create a final creative prompt that incorporates real quotes and dramatic elements
- Focus on moments that would translate well to dramatic storytelling
- Consider how real conflicts and tensions could inspire compelling narratives
- Extract character insights from actual behavior and statements observed

Return only the structured data without any additional text or formatting.`

    console.log('Sending request to OpenAI via LangChain...')
    console.log('Total content length:', videoContents.length)
    console.log('Videos processed:', processedVideos.length, 'of', videos.length)

    // Invoke the model to produce structured output
    const structuredOutput = await modelWithStructure.invoke(prompt)

    console.log('LangChain structured output received')
    console.log('Structured output keys:', Object.keys(structuredOutput))
    
    // Validate the structured output with our schema
    const validatedSummary = VideosSummarySchema.parse(structuredOutput)
    
    console.log(`✅ Summary completed for ${processedVideos.length} videos`)
    console.log('Overall theme:', validatedSummary.overallTheme)
    console.log('Key insights count:', validatedSummary.keyInsights.length)
    
    return NextResponse.json({
      success: true,
      summary: validatedSummary,
      usingMock: false,
      videosProcessed: processedVideos.length,
      totalVideos: videos.length,
      truncated: processedVideos.length < videos.length
    })

  } catch (error) {
    console.error('Error in summarize-videos:', error)
    console.error('Error details:', {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack
    })
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to summarize videos: ' + (error as Error).message
      },
      { status: 500 }
    )
  }
}


export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Video summarization API is running',
    endpoints: {
      POST: 'Summarize multiple video transcripts and extract key insights'
    }
  })
} 