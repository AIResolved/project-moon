import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { language = 'en-US' } = await request.json()

    if (!process.env.VOICEMAKER_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'VoiceMaker API key not configured'
      }, { status: 500 })
    }
    // VoiceMaker API endpoint for listing voices
    const response = await fetch('https://developer.voicemaker.in/voice/list', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VOICEMAKER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    console.log(data)

    if (!response.ok) {
      throw new Error(data.error || `VoiceMaker API error: ${response.status}`)
    }

    if (data.success && data.data && data.data.voices_list) {
      console.log(`✅ Successfully fetched ${data.data.voices_list.length} VoiceMaker voices`)
      return NextResponse.json({
        success: true,
        voices: data.data.voices_list
      })
    } else {
      throw new Error('Invalid response format from VoiceMaker API')
    }
  } catch (error) {
    console.error('VoiceMaker voices API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch VoiceMaker voices'
    }, { status: 500 })
  }
} 