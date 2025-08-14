import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'

/**
 * Script Processing API
 * 
 * This API supports two modes:
 * 
 * 1. Script Summary Generation (summaryMode: true)
 *    - Input: { fullScript: string, summaryMode: true, visualStyle?, mood?, lighting?, customParameters? }
 *    - Output: { success: true, summary: { storySummary, mainCharacters, setting, tone } }
 * 
 * 2. Chunk Processing with Story Context
 *    - Input: { chunkText: string, chunkIndex: number, totalChunks: number, scriptSummary?: object, ... }
 *    - Output: { success: true, prompt: string, searchQuery: string, chunkId: string, chunkIndex: number }
 * 
 * The scriptSummary parameter allows chunks to be processed with full story context for better narrative consistency.
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Zod schema for structured output
const SceneAnalysisSchema = z.object({
  visualPrompt: z.string().describe("A detailed visual prompt (15-30 words) for AI image generation describing the key visual elements, setting, composition, and atmosphere"),
  searchQuery: z.string().describe("A concise search query (4-5 words max) for finding stock footage/images on platforms like Pixabay or Storyblocks")
})

// Zod schema for script summary
const ScriptSummarySchema = z.object({
  storySummary: z.string().describe("A concise summary of the overall story, plot, and narrative arc (2-3 sentences)"),
  mainCharacters: z.string().describe("Key characters or subjects mentioned in the story (1-2 sentences)"),
  setting: z.string().describe("The main setting, location, or environment of the story (1 sentence)"),
  tone: z.string().describe("The overall tone, mood, and atmosphere of the story (1 sentence)")
})

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Received POST request to /api/process-script')
    
    const body = await request.json()
    console.log('📋 Request body keys:', Object.keys(body))
    
    // Handle script summary generation
    if ('fullScript' in body && body.summaryMode === true) {
      console.log('📖 Handling full script summary generation')
      return handleScriptSummaryGeneration(body);
    }
    
    // Handle script chunk processing
    if ('chunkText' in body) {
      console.log('🎬 Handling script chunk processing')
      return handleScriptChunkProcessing(body);
    }
    
    // Handle other flows if needed
    console.log('❌ Invalid request format - no valid processing mode found')
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    )
  } catch (error) {
    console.error('💥 Error in script processing route:', error)
    return NextResponse.json(
      { error: 'Failed to process script: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

async function handleScriptSummaryGeneration(body: any) {
  const { fullScript, visualStyle, mood, lighting, customParameters } = body;
  
  console.log(`📖 Generating script summary for ${fullScript?.length || 0} characters`)
  
  if (!fullScript || fullScript.trim() === '') {
    console.log('❌ No full script provided')
    return NextResponse.json(
      { error: "Full script is required for summary generation" },
      { status: 400 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OpenAI API key not configured')
    return NextResponse.json(
      { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.' }, 
      { status: 500 }
    )
  }

  try {
    let systemPrompt = `You are an expert story analyst for visual content creation. Your task is to analyze the complete script and generate a structured summary that will help create contextually relevant visual content.

Visual Style: ${visualStyle || 'photorealistic'}
Mood & Atmosphere: ${mood || 'dramatic'}
Lighting: ${lighting || 'natural'}

Analyze the script and provide:
1. A concise story summary (2-3 sentences)
2. Key characters or subjects (1-2 sentences)
3. Main setting/location (1 sentence)
4. Overall tone and atmosphere (1 sentence)

Focus on visual elements that would be important for image generation and stock media search.`

    if (customParameters && customParameters.trim()) {
      systemPrompt += `\n\nAdditional visual instructions: ${customParameters.trim()}`
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Analyze this complete script and generate a structured summary:\n\n${fullScript}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "script_summary",
          schema: {
            type: "object",
            properties: {
              storySummary: {
                type: "string",
                description: "A concise summary of the overall story, plot, and narrative arc (2-3 sentences)"
              },
              mainCharacters: {
                type: "string",
                description: "Key characters or subjects mentioned in the story (1-2 sentences)"
              },
              setting: {
                type: "string",
                description: "The main setting, location, or environment of the story (1 sentence)"
              },
              tone: {
                type: "string",
                description: "The overall tone, mood, and atmosphere of the story (1 sentence)"
              }
            },
            required: ["storySummary", "mainCharacters", "setting", "tone"],
            additionalProperties: false
          }
        }
      },
    })

    const responseContent = response.choices[0]?.message?.content?.trim()
    
    if (responseContent) {
      const parsedResponse = JSON.parse(responseContent)
      const validatedResponse = ScriptSummarySchema.parse(parsedResponse)
      
      console.log(`✅ Generated script summary:`)
      console.log(`   Story Summary: ${validatedResponse.storySummary}`)
      console.log(`   Main Characters: ${validatedResponse.mainCharacters}`)
      console.log(`   Setting: ${validatedResponse.setting}`)
      console.log(`   Tone: ${validatedResponse.tone}`)
      
      return NextResponse.json({
        success: true,
        summary: validatedResponse,
        message: 'Script summary generated successfully'
      })
    } else {
      throw new Error('No content generated from OpenAI')
    }

  } catch (openaiError: any) {
    console.error(`❌ OpenAI API error for script summary:`, openaiError)
    
    return NextResponse.json({
      success: false,
      error: `Failed to generate script summary: ${openaiError.message}`
    }, { status: 500 })
  }
}

async function handleScriptChunkProcessing(body: any) {
  const { 
    chunkText, 
    chunkIndex, 
    totalChunks, 
    visualStyle, 
    mood, 
    lighting, 
    customParameters,
    chunkId,
    scriptSummary // Now required parameter for story context
  } = body;
  
  console.log(`🎬 Processing chunk ${chunkIndex + 1}/${totalChunks} (${chunkId})`)
  console.log(`📝 Chunk text length: ${chunkText?.length || 0}`)
  
  if (!chunkText || chunkText.trim() === '') {
    console.log('❌ No chunk text provided')
    return NextResponse.json(
      { error: "Chunk text is required" },
      { status: 400 }
    );
  }

  // Validate that script summary is provided
  if (!scriptSummary) {
    console.log('❌ No script summary provided')
    return NextResponse.json(
      { error: "Script summary is required for chunk processing. Please generate a script summary first." },
      { status: 400 }
    );
  }

  // Validate script summary structure
  if (!scriptSummary.storySummary || !scriptSummary.mainCharacters || !scriptSummary.setting || !scriptSummary.tone) {
    console.log('❌ Incomplete script summary provided')
    return NextResponse.json(
      { error: "Complete script summary is required (storySummary, mainCharacters, setting, tone)" },
      { status: 400 }
    );
  }

  console.log(`📖 Script summary provided: YES`)
  console.log(`   Story: ${scriptSummary.storySummary.substring(0, 50)}...`)
  console.log(`   Characters: ${scriptSummary.mainCharacters.substring(0, 50)}...`)

  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OpenAI API key not configured')
    return NextResponse.json(
      { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.' }, 
      { status: 500 }
    )
  }

  console.log('✅ OpenAI API key is configured')

  try {
    console.log(`🎬 Processing chunk ${chunkIndex + 1}/${totalChunks} (${chunkId}) with story context`)

    // Build the prompt for generating visual prompts and search queries
    let systemPrompt = `You are an expert visual content analyst for AI image generation and stock media search. Your task is to analyze script content and generate two types of outputs:

1. A detailed visual prompt for AI image generation (15-30 words)
2. A concise search query for stock media platforms (4-5 words max)

IMPORTANT: You have access to the complete story context. Use this context to ensure your visual prompts and search queries are relevant to the story and maintain narrative consistency across all chunks.

Visual Style: ${visualStyle || 'photorealistic'}
Mood & Atmosphere: ${mood || 'dramatic'}
Lighting: ${lighting || 'natural'}

STORY CONTEXT (use this to maintain narrative consistency):
- Story Summary: ${scriptSummary.storySummary}
- Main Characters: ${scriptSummary.mainCharacters}
- Setting: ${scriptSummary.setting}
- Tone: ${scriptSummary.tone}

When generating visual prompts and search queries, ensure they align with the overall story context, characters, setting, and tone. This will create a cohesive visual narrative across all video chunks.

MARKDOWN FORMATTING FOR SPECIAL ELEMENTS:
- When the script chunk contains Call-to-Action (CTA) text, wrap it in **bold markdown** (e.g., **Subscribe to our channel for more amazing content!**)
- When the script chunk contains Hook text, wrap it in **bold markdown** (e.g., **What if I told you everything you know is wrong?**)
- This formatting helps distinguish interactive elements from regular narrative content

For the visual prompt:
- Focus on visual elements: setting, composition, framing, colors, textures
- Include the specified visual style, mood, and lighting characteristics
- Describe what would be seen in the image, not what is happening narratively
- Make it suitable for AI image generation (Midjourney, DALL-E, etc.)
- Keep it concise but descriptive (15-30 words)
- Ensure it's safe and appropriate content (NSFW)
- Avoid text, dialogue, or narrative elements
- Think like a cinematographer or photographer
- Maintain consistency with the overall story context and characters

For the search query:
- Create a simple, searchable term (4-5 words maximum)
- Focus on the main subject or setting
- Use common stock media keywords
- Think about what someone would search for on Pixabay, Storyblocks, or Shutterstock
- Avoid overly specific or narrative terms
- Use generic, visual descriptors
- Consider the story context when choosing search terms

this is the type of prompt you should NOT do for image generation. dont be gory or point anything out of the family friendly:
A dramatic battlefield scene at dusk, castle walls silhouetted against a darkening sky. Soldiers clash, shields splinter, banners wave, and a red moat churns with bodies. Natural lighting highlights the chaos.
`
    if (customParameters && customParameters.trim()) {
      systemPrompt += `\n\nAdditional visual instructions: ${customParameters.trim()}`
    }

      const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
          content: systemPrompt
          },
          {
            role: "user",
          content: `Analyze this script chunk and generate both a visual prompt and search query. Remember to maintain consistency with the overall story context:\n\n${chunkText}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "scene_analysis",
          schema: {
            type: "object",
            properties: {
              visualPrompt: {
                type: "string",
                description: "A detailed visual prompt (15-30 words) for AI image generation describing the key visual elements, setting, composition, and atmosphere"
              },
              searchQuery: {
                type: "string", 
                description: "A concise search query (4-5 words max) for finding stock footage/images on platforms like Pixabay or Storyblocks"
              }
            },
            required: ["visualPrompt", "searchQuery"],
            additionalProperties: false
          }
        }
      },
    })

    const responseContent = response.choices[0]?.message?.content?.trim()
    
    if (responseContent) {
      // Parse and validate the structured output
      const parsedResponse = JSON.parse(responseContent)
      const validatedResponse = SceneAnalysisSchema.parse(parsedResponse)
      
      console.log(`✅ Generated content for chunk ${chunkIndex + 1} with story context:`)
      console.log(`   Visual Prompt: ${validatedResponse.visualPrompt}`)
      console.log(`   Search Query: ${validatedResponse.searchQuery}`)
      
      return NextResponse.json({
        success: true,
        prompt: validatedResponse.visualPrompt,
        searchQuery: validatedResponse.searchQuery,
        chunkId: chunkId,
        chunkIndex: chunkIndex
      })
  } else {
      throw new Error('No content generated from OpenAI')
    }

  } catch (openaiError: any) {
    console.error(`❌ OpenAI API error for chunk ${chunkIndex + 1}:`, openaiError)
    
    return NextResponse.json({
      success: false,
      error: `Failed to generate content: ${openaiError.message}`,
      chunkId: chunkId,
      chunkIndex: chunkIndex
    }, { status: 500 })
  }
}