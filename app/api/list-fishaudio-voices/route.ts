import { NextRequest, NextResponse } from 'next/server'

// GET method for simple requests without filtering
export async function GET(request: NextRequest) {
  return await fetchFishAudioModels({})
}

// POST method for requests with filtering options
export async function POST(request: NextRequest) {
  const requestBody = await request.json().catch(() => ({}))
  return await fetchFishAudioModels(requestBody)
}

async function fetchFishAudioModels(options: any) {
  try {
    // Check if Fish Audio API key is configured
    if (!process.env.FISH_AUDIO_API_KEY) {
      console.warn('Fish Audio API key not configured, using fallback voices')
      return NextResponse.json({
        success: true,
        voices: [
          { id: "fallback-female", name: "Gentle Female Voice (Fallback)" },
          { id: "fallback-male", name: "Professional Male Voice (Fallback)" },
        ],
        models: [
          { id: "speech-1.5", name: "Speech-1.5", type: "TTS", pricing: "$15.00 / million UTF-8 bytes" },
          { id: "speech-1.6", name: "Speech-1.6", type: "TTS", pricing: "$15.00 / million UTF-8 bytes" },
          { id: "s1", name: "S1", type: "TTS", pricing: "Contact for pricing" }
        ],
        usingFallback: true
      })
    }

    // Parse filtering options
    const {
      page_size = 50,
      page_number = 1,
      title,
      language,
      sort_by = 'score',
      self = false
    } = options

    console.log('🐟 Fetching Fish Audio models from API...', {
      page_size,
      page_number,
      title: title || 'all',
      language: language || 'all',
      sort_by,
      self
    })

    // Build query parameters
    const queryParams = new URLSearchParams({
      page_size: page_size.toString(),
      page_number: page_number.toString(),
      sort_by: sort_by
    })

    if (title) queryParams.append('title', title)
    if (language) {
      if (Array.isArray(language)) {
        language.forEach((lang: string) => queryParams.append('language', lang))
      } else {
        queryParams.append('language', language)
      }
    }
    if (self) queryParams.append('self', 'true')

    // Fetch models from Fish Audio API
    const response = await fetch(`https://api.fish.audio/model?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.FISH_AUDIO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Fish Audio API error: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Fish Audio API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`✅ Successfully fetched ${data.total || data.items?.length || 0} Fish Audio models`)

    // Transform Fish Audio models into voices format
    const voices = (data.items || [])
      .filter((model: any) => model.type === 'tts' || model.type === 'svc') // Filter for voice models
      .map((model: any) => ({
        id: model._id,
        name: model.title,
        description: model.description,
        type: model.type,
        author: model.author?.nickname || 'Unknown',
        languages: model.languages || [],
        tags: model.tags || [],
        like_count: model.like_count || 0,
        visibility: model.visibility,
        created_at: model.created_at
      }))

    // Fish Audio TTS models with pricing
    const models = [
      { 
        id: "speech-1.5", 
        name: "Speech-1.5", 
        type: "TTS",
        pricing: "$15.00 / million UTF-8 bytes"
      },
      { 
        id: "speech-1.6", 
        name: "Speech-1.6", 
        type: "TTS",
        pricing: "$15.00 / million UTF-8 bytes"
      },
      { 
        id: "s1", 
        name: "S1", 
        type: "TTS",
        pricing: "Contact for pricing"
      }
    ]

    return NextResponse.json({
      success: true,
      voices: voices,
      models: models,
      total: data.total,
      usingFallback: false
    })

  } catch (error) {
    console.error('Fish Audio voices API error:', error)
    
    // Return fallback voices on error
    return NextResponse.json({
      success: true,
      voices: [
        { id: "fallback-female", name: "Gentle Female Voice (Fallback)" },
        { id: "fallback-male", name: "Professional Male Voice (Fallback)" },
      ],
      models: [
        { id: "speech-1.5", name: "Speech-1.5", type: "TTS", pricing: "$15.00 / million UTF-8 bytes" },
        { id: "speech-1.6", name: "Speech-1.6", type: "TTS", pricing: "$15.00 / million UTF-8 bytes" },
        { id: "s1", name: "S1", type: "TTS", pricing: "Contact for pricing" }
      ],
      error: error instanceof Error ? error.message : 'Failed to fetch Fish Audio voices',
      usingFallback: true
    })
  }
} 