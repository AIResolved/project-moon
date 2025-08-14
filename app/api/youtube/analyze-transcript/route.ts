import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'

// Zod schema for individual timestamp result
const TimestampResultSchema = z.object({
  timestamp: z.string().describe("Timestamp in SRT format (HH:MM:SS,mmm) where the relevant content starts"),
  summary: z.string().describe("Detailed summary with specific quotes and dramatic elements"),
  relevantContent: z.string().describe("The actual transcript content that matches the query with exact quotes"),
  confidence: z.number().min(0).max(1).describe("Confidence score of the match (0-1)"),
  dramaticElements: z.array(z.string()).describe("Key dramatic moments, conflicts, or tensions identified"),
  keyQuotes: z.array(z.string()).describe("Most impactful direct quotes from the transcript"),
  contextualInfo: z.string().describe("Background context and significance of this moment")
})

// Zod schema for structured output with up to 3 results
const TranscriptAnalysisSchema = z.object({
  results: z.array(TimestampResultSchema).min(1).max(3).describe("Up to 3 most relevant timestamp results, ordered by relevance, no longer than 3 minutes each")
})

interface AnalyzeTranscriptRequest {
  srtContent: string
  query: string
  videoTitle: string
  videoId?: string // Make videoId optional for backward compatibility
}

interface SRTEntry {
  index: number
  startTime: string
  endTime: string
  text: string
  startSeconds: number
  endSeconds: number
}

// Helper function to convert SRT timestamp to seconds
function srtToSeconds(srtTimestamp: string): number {
  try {
    // Parse HH:MM:SS,mmm format
    const [time, milliseconds] = srtTimestamp.split(',')
    const [hours, minutes, seconds] = time.split(':').map(Number)
    const ms = parseInt(milliseconds) || 0
    
    return hours * 3600 + minutes * 60 + seconds + ms / 1000
  } catch (error) {
    console.error('Error parsing SRT timestamp:', srtTimestamp, error)
    return 0
  }
}

// Helper function to parse SRT content into structured entries
function parseSRTContent(srtContent: string): SRTEntry[] {
  const entries: SRTEntry[] = []
  const blocks = srtContent.trim().split(/\n\s*\n/)
  
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length >= 3) {
      const index = parseInt(lines[0])
      const [startTime, endTime] = lines[1].split(' --> ')
      const text = lines.slice(2).join('\n').trim()
      
      if (!isNaN(index) && startTime && endTime && text) {
        entries.push({
          index,
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          text,
          startSeconds: srtToSeconds(startTime.trim()),
          endSeconds: srtToSeconds(endTime.trim())
        })
      }
    }
  }
  
  return entries
}

// Helper function to convert entries back to SRT format
function entriesToSRT(entries: SRTEntry[]): string {
  return entries.map(entry => 
    `${entry.index}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}`
  ).join('\n\n')
}

// Helper function to split SRT content into chunks based on word count
function splitSRTIntoChunks(srtContent: string, maxWords: number = 15000): string[] {
  const entries = parseSRTContent(srtContent)
  const chunks: string[] = []
  let currentChunk: SRTEntry[] = []
  let currentWordCount = 0
  
  for (const entry of entries) {
    const entryWordCount = entry.text.split(/\s+/).length
    
    // If adding this entry would exceed the limit, start a new chunk
    if (currentWordCount + entryWordCount > maxWords && currentChunk.length > 0) {
      chunks.push(entriesToSRT(currentChunk))
      currentChunk = [entry]
      currentWordCount = entryWordCount
    } else {
      currentChunk.push(entry)
      currentWordCount += entryWordCount
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push(entriesToSRT(currentChunk))
  }
  
  return chunks
}

// Helper function to generate YouTube URL with timestamp
function generateYouTubeUrl(videoId: string, srtTimestamp: string): string {
  const seconds = Math.floor(srtToSeconds(srtTimestamp))
  return `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`
}

// Helper function to analyze a single chunk of SRT content
async function analyzeChunk(srtContent: string, query: string, videoTitle: string, videoId?: string): Promise<any[]> {
  // Create ChatOpenAI model
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.3, // Lower temperature for more precise analysis
    openAIApiKey: process.env.OPENAI_API_KEY,
  })

  // Bind schema to model using structured output
  const modelWithStructure = model.withStructuredOutput(TranscriptAnalysisSchema)

  const prompt = `You are an expert transcript analyzer specializing in extracting dramatic moments, conflicts, and compelling quotes from video content. Your analysis should be detailed and reference-rich, similar to court transcripts and news reports.

I will provide you with an SRT subtitle file and a specific query. Your task is to:

1. Find up to 3 most relevant sections that match the user's query
2. Extract precise timestamps where dramatic or relevant content occurs, no longer than 3 minutes each
3. Provide detailed summaries with specific quotes and dramatic elements
4. Identify key conflicts, tensions, or compelling moments
5. Extract the most impactful direct quotes from the transcript
6. Provide contextual background for each moment's significance

Video Title: ${videoTitle}
User Query: "${query}"

SRT Transcript:
${srtContent}

ANALYSIS REQUIREMENTS:
- Focus on dramatic moments, conflicts, confrontations, or emotionally charged content
- Extract direct quotes verbatim from the transcript
- Identify specific details like names, locations, events mentioned
- Look for moments of tension, surprise, revelation, or conflict
- Provide rich contextual information about what's happening
- Format summaries like detailed news reports or court documentation
- Include specific references to what people said, when they said it, and the circumstances

EXAMPLE FORMAT FOR SUMMARIES:
"At timestamp 00:15:23, the speaker revealed: 'I never thought this would happen to me.' This moment marked a dramatic shift in the narrative as tensions escalated. The speaker's voice became noticeably strained, and background voices can be heard expressing shock. This revelation occurred immediately after [context], making it particularly significant because [explanation]."

Return structured data with:
- timestamp: Exact SRT timestamp
- summary: Detailed narrative summary with quotes and dramatic elements
- relevantContent: Exact transcript text with quotation marks around spoken words
- confidence: Your confidence in the relevance (0-1)
- dramaticElements: Array of key dramatic moments identified
- keyQuotes: Array of the most impactful direct quotes
- contextualInfo: Background context and significance

Order results by dramatic impact and relevance to the query.`

  console.log('Sending chunk to OpenAI via LangChain...')
  console.log('SRT chunk length:', srtContent.length)

  // Invoke the model to produce structured output
  const structuredOutput = await modelWithStructure.invoke(prompt)

  console.log('LangChain structured output received for chunk')
  
  // Validate the structured output with our schema
  const validatedAnalysis = TranscriptAnalysisSchema.parse(structuredOutput)
  
  // Add YouTube URLs if videoId is provided
  const results = validatedAnalysis.results.map(result => {
    const enhancedResult: any = { ...result }
    if (videoId) {
      enhancedResult.youtubeUrl = generateYouTubeUrl(videoId, result.timestamp)
    }
    return enhancedResult
  })
  
  return results
}

export async function POST(request: NextRequest) {
  console.log('=== POST /api/analyze-transcript ===')
  
  try {
    console.log('Parsing request body...')
    const requestBody: AnalyzeTranscriptRequest = await request.json()
    console.log('Request body received:', {
      query: requestBody.query,
      videoTitle: requestBody.videoTitle,
      videoId: requestBody.videoId,
      srtContentLength: requestBody.srtContent?.length || 0
    })
    
    const { srtContent, query, videoTitle, videoId } = requestBody

    if (!srtContent || !query) {
      console.log('Validation failed: missing required fields')
      return NextResponse.json(
        { error: 'SRT content and query are required' },
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

    console.log(`🚀 Analyzing transcript for query: "${query}" in video: "${videoTitle}"`)

    // Check if SRT content needs to be split
    const wordCount = srtContent.split(/\s+/).length
    console.log(`SRT content word count: ${wordCount}`)
    
    let allResults: any[] = []
    
    if (wordCount > 15000) {
      // Split large content into chunks
      console.log('SRT content is large, splitting into chunks...')
      const chunks = splitSRTIntoChunks(srtContent, 15000)
      console.log(`Split into ${chunks.length} chunks`)
      
      // Process each chunk separately
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.split(/\s+/).length} words)`)
        
        try {
          const chunkResults = await analyzeChunk(chunk, query, videoTitle, videoId)
          allResults.push(...chunkResults)
          console.log(`Chunk ${i + 1} produced ${chunkResults.length} results`)
        } catch (chunkError) {
          console.error(`Error processing chunk ${i + 1}:`, chunkError)
          // Continue with other chunks even if one fails
        }
      }
      
      // Sort all results by confidence and take top 3
      allResults.sort((a, b) => b.confidence - a.confidence)
      allResults = allResults.slice(0, 3)
      
    } else {
      // Process normally for smaller content
      console.log('SRT content is small enough, processing normally...')
      allResults = await analyzeChunk(srtContent, query, videoTitle, videoId)
    }
    
    console.log(`✅ Analysis completed for query: "${query}"`)
    console.log(`Found ${allResults.length} relevant timestamps total`)
    allResults.forEach((result, index) => {
      console.log(`Result ${index + 1}: ${result.timestamp} (confidence: ${result.confidence})`)
    })
    
    return NextResponse.json({
      success: true,
      analysis: allResults,
      usingMock: false
    })

  } catch (error) {
    console.error('Error in analyze-transcript:', error)
    console.error('Error details:', {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack
    })
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to analyze transcript: ' + (error as Error).message
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Transcript analysis API is running',
    endpoints: {
      POST: 'Analyze transcript content with a specific query'
    }
  })
} 