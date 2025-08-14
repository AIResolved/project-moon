import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'

// Zod schema for Gemini video analysis (moved from gemini-analyze route)
const GeminiVideoAnalysisSchema = z.object({
  videoId: z.string().describe("The YouTube video ID"),
  title: z.string().describe("The video title"),
  summary: z.string().describe("Comprehensive summary of the video content"),
  keyPoints: z.array(z.string()).describe("Main points and insights from the video (5-8 points)"),
  timestamps: z.array(z.object({
    time: z.string().describe("Timestamp in format MM:SS or HH:MM:SS"),
    description: z.string().describe("What happens at this timestamp"),
    significance: z.string().describe("Why this moment is important")
  })).describe("Key timestamps and moments in the video"),
  topics: z.array(z.string()).describe("Main topics and themes discussed"),
  emotionalTone: z.string().describe("Overall emotional tone and mood"),
  keyQuotes: z.array(z.string()).describe("Important quotes or statements"),
  actionableInsights: z.array(z.string()).describe("Practical takeaways and insights"),
  characterInsights: z.array(z.string()).describe("Insights about people or characters mentioned"),
  conflictElements: z.array(z.string()).describe("Conflicts, tensions, or dramatic moments"),
  storyIdeas: z.array(z.string()).describe("Potential story concepts inspired by the content"),
  creativePrompt: z.string().describe("A creative writing prompt based on the video content")
})

interface ParseGeminiRequest {
  videoId: string
  videoTitle: string
  videoUrl: string
  geminiRawResponse: string
  query?: string
}

export async function POST(request: NextRequest) {
  console.log('🤖 GPT-4o-mini Gemini parsing endpoint hit')
  
  try {
    const { videoId, videoTitle, videoUrl, geminiRawResponse, query }: ParseGeminiRequest = await request.json()
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    if (!geminiRawResponse || !videoId || !videoTitle) {
      return NextResponse.json(
        { error: 'Missing required fields: videoId, videoTitle, and geminiRawResponse' },
        { status: 400 }
      )
    }

    console.log(`📝 Parsing Gemini response for video: ${videoTitle}`)
    console.log('Raw response length:', geminiRawResponse.length)

    // Create ChatOpenAI model
    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY,
    })

    // Bind schema to model using structured output
    const modelWithStructure = model.withStructuredOutput(GeminiVideoAnalysisSchema)

    const prompt = `You are a structured data parser specializing in video analysis. Parse the provided Gemini AI video analysis response into the exact structured format required.

Video Information:
- Video ID: ${videoId}
- Title: ${videoTitle}
- Video URL: ${videoUrl}
${query ? `- Analysis Focus: ${query}` : ''}

Your task is to extract and organize the following information from the Gemini response:
- summary: A comprehensive overall summary
- keyPoints: Array of 5-8 main points and insights
- timestamps: Array of objects with {time, description, significance} - CAREFULLY extract any timestamps mentioned in MM:SS or HH:MM:SS format
- topics: Array of main topics and themes covered
- emotionalTone: Overall emotional tone and mood description
- keyQuotes: Array of important quotes from the video
- actionableInsights: Array of practical takeaways and insights
- characterInsights: Array of insights about people/characters mentioned
- conflictElements: Array of conflicts, tensions, or dramatic moments
- storyIdeas: Array of creative story concepts inspired by the content
- creativePrompt: A creative writing prompt based on the video content

SPECIAL ATTENTION TO TIMESTAMPS:
Look for any time references in these formats:
- MM:SS (e.g., "2:45", "15:32")
- HH:MM:SS (e.g., "1:23:45")
- "At X:XX", "Around X:XX", "The moment at X:XX"
- Any numerical time references followed by descriptions

For each timestamp found, create an object with:
- time: The timestamp in MM:SS or HH:MM:SS format
- description: What happens at that moment (extract from surrounding context)
- significance: Why this moment is important (infer from context)

Extract this information accurately from the Gemini response while maintaining the original meaning and context. If certain fields are not present in the response, provide reasonable defaults based on the available content.

Gemini AI Response to Parse:
${geminiRawResponse}`

    console.log('Sending to GPT-4o-mini with LangChain structured output...')
    
    // Invoke the model to produce structured output
    const structuredOutput = await modelWithStructure.invoke(prompt)
    
    console.log('LangChain structured output received')
    
    // Validate the structured output with our schema
    const validatedAnalysis = GeminiVideoAnalysisSchema.parse(structuredOutput)

    console.log('Validated analysis:', validatedAnalysis)
    
    console.log('✅ Successfully parsed Gemini response with GPT-4o-mini and LangChain')
    console.log('Parsed analysis:', {
      summaryLength: validatedAnalysis.summary.length,
      keyPointsCount: validatedAnalysis.keyPoints.length,
      timestampsCount: validatedAnalysis.timestamps.length,
      topicsCount: validatedAnalysis.topics.length
    })

    return NextResponse.json({
      success: true,
      analysis: validatedAnalysis,
      parsedWithGPT: true,
      originalGeminiResponse: geminiRawResponse
    })

  } catch (error) {
    console.error('💥 Error parsing Gemini response:', error)
    return NextResponse.json(
      { 
        error: 'Failed to parse Gemini response', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
} 