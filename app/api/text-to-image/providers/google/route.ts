import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, model = 'imagen-3.0-generate' } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required and must be a string' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Google GenAI API key not configured' }, { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey })

    // Generate image
    const result: any = await ai.models.generateImages({
      model,
      prompt,
    })

    let imageUrl = ''
    // Try common shapes
    if (result?.images?.[0]?.url) {
      imageUrl = result.images[0].url
    } else if (result?.images?.[0]?.image) {
      // Some SDKs return a file handle; attempt a download link
      const file = result.images[0].image
      const download: any = await ai.files.download({ file, downloadPath: 'image.png' })
      imageUrl = download?.url || ''
    } else if (result?.images?.[0]?.b64_data) {
      imageUrl = `data:image/png;base64,${result.images[0].b64_data}`
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image returned from Google GenAI' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      provider: 'google',
      model,
      message: 'Text-to-image generation completed successfully'
    })
  } catch (error) {
    console.error('❌ Google GenAI Text-to-image error:', error)
    return NextResponse.json({
      error: 'Failed to generate text-to-image with Google GenAI',
      provider: 'google',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


