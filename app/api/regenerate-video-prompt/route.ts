import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from "@langchain/openai"
import { ChatAnthropic } from "@langchain/anthropic"

interface RegenerateVideoPromptRequestBody {
  originalText: string
  existingPrompt: string
  summary?: string
  scriptContext?: string
  modelName?: string
  userId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RegenerateVideoPromptRequestBody
    const { 
      originalText, 
      existingPrompt, 
      summary, 
      scriptContext,
      modelName = "gpt-4o-mini", 
      userId = "unknown_user" 
    } = body

    if (!originalText || typeof originalText !== 'string' || originalText.trim() === '') {
      return NextResponse.json({ error: 'Original text is required' }, { status: 400 })
    }

    if (!existingPrompt || typeof existingPrompt !== 'string' || existingPrompt.trim() === '') {
      return NextResponse.json({ error: 'Existing prompt is required' }, { status: 400 })
    }

    console.log(`🎬 Regenerating video prompt for scene for user ${userId}`)

    // Initialize the model
    let model
    if (modelName.startsWith('claude')) {
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: 'Anthropic API key not found' }, { status: 500 })
      }
      model = new ChatAnthropic({
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        modelName: modelName,
      })
    } else {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: 'OpenAI API key not found' }, { status: 500 })
      }
      model = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: modelName,
      })
    }

    // Create the regeneration prompt
    const regenerationPrompt = `
You are a professional video prompt writer specializing in creating detailed, cinematic video descriptions for AI video generation. Your task is to regenerate/improve an existing video prompt based on a specific text segment.

CONTEXT:
${scriptContext ? `Script Context: ${scriptContext}` : ''}
${summary ? `Scene Summary: ${summary}` : ''}

ORIGINAL TEXT FROM SCRIPT:
${originalText}

EXISTING VIDEO PROMPT:
${existingPrompt}

TASK:
Generate a new, improved video prompt that:
1. Captures the same scene/moment from the original text
2. Provides more cinematic detail and visual specificity
3. Includes camera movements, lighting, character details, and atmosphere
4. Maintains the same core action/narrative as the original
5. Is optimized for AI video generation (detailed but not overly complex)

FORMAT REQUIREMENTS:
- Keep the prompt under 400 characters for optimal AI video generation
- Include specific details: character age/gender, clothing, facial expressions, camera angles, lighting
- Use cinematic language (e.g., "close-up", "wide shot", "soft lighting", "dramatic angle")
- Focus on visual elements that can be rendered in video
- Avoid abstract concepts that are difficult to visualize

EXAMPLE STYLE:
"Close-up of a 25-year-old woman with dark hair in casual clothing, looking worried as she slowly opens an old wooden door, warm indoor lighting casting shadows, cinematic depth of field, realistic style"

Generate ONLY the new video prompt, no additional commentary or explanation. The prompt should be fresh and different from the existing one while maintaining the same scene essence.`

    console.log(`📝 Sending video prompt regeneration request to ${modelName}`)
    const response = await model.invoke(regenerationPrompt)

    // Extract content from response
    let regeneratedPrompt = ""
    if (typeof response.content === 'string') {
      regeneratedPrompt = response.content
    } else if (Array.isArray(response.content)) {
      regeneratedPrompt = response.content
        .map((item: any) => {
          if (typeof item === 'string') return item
          if (typeof item === 'object' && item !== null && 'text' in item) return item.text
          return ''
        })
        .join('\n')
    }

    // Clean up the content
    regeneratedPrompt = regeneratedPrompt.trim()

    // Ensure it's under 400 characters
    if (regeneratedPrompt.length > 400) {
      regeneratedPrompt = regeneratedPrompt.substring(0, 400).trim()
      // Ensure we don't cut off mid-word
      const lastSpace = regeneratedPrompt.lastIndexOf(' ')
      if (lastSpace > 350) {
        regeneratedPrompt = regeneratedPrompt.substring(0, lastSpace)
      }
    }

    if (!regeneratedPrompt) {
      throw new Error('No content generated from model')
    }

    // Generate a search query for the new prompt
    const searchQueryPrompt = `
Based on this video prompt, generate a short search query (under 50 characters) for finding stock videos:
"${regeneratedPrompt}"

Respond with ONLY the search query, no quotes or additional text.`

    const searchResponse = await model.invoke(searchQueryPrompt)
    let searchQuery = ""
    if (typeof searchResponse.content === 'string') {
      searchQuery = searchResponse.content.trim()
    } else if (Array.isArray(searchResponse.content)) {
      searchQuery = searchResponse.content
        .map((item: any) => {
          if (typeof item === 'string') return item
          if (typeof item === 'object' && item !== null && 'text' in item) return item.text
          return ''
        })
        .join(' ').trim()
    }

    // Ensure search query is under 50 characters
    if (searchQuery.length > 50) {
      searchQuery = searchQuery.substring(0, 47) + '...'
    }

    console.log(`✅ Successfully regenerated video prompt (${regeneratedPrompt.length} chars)`)

    return NextResponse.json({
      success: true,
      regeneratedPrompt: regeneratedPrompt,
      searchQuery: searchQuery || `video scene`,
      originalPrompt: existingPrompt,
      characterCount: regeneratedPrompt.length
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error regenerating video prompt:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to regenerate video prompt' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Video Prompt Regeneration API',
    method: 'GET',
    usage: 'Use POST method to regenerate individual video prompts',
    example: {
      endpoint: '/api/regenerate-video-prompt',
      method: 'POST',
      contentType: 'application/json',
      body: {
        originalText: 'Text segment from the script',
        existingPrompt: 'Current video prompt to improve',
        summary: 'Scene 1',
        scriptContext: 'Overall script context (optional)',
        modelName: 'gpt-4o-mini'
      }
    }
  })
}
