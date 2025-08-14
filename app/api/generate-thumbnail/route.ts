import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const prompt = formData.get('prompt') as string
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Collect all image files
    const imageFiles: File[] = []
    let index = 0
    
    while (true) {
      const file = formData.get(`image_${index}`) as File
      if (!file) break
      imageFiles.push(file)
      index++
    }

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { error: 'At least one reference image is required' },
        { status: 400 }
      )
    }

    console.log(`🖼️ Processing ${imageFiles.length} reference images for thumbnail generation`)

    // Convert files to OpenAI format
    const images = await Promise.all(
      imageFiles.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer())
        return await toFile(buffer, file.name, {
          type: file.type,
        })
      })
    )

    console.log(`📝 Generating thumbnail with prompt: "${prompt.substring(0, 100)}..."`)

    // Use OpenAI's image editing API
    const response = await client.images.edit({
      model: "gpt-image-1",
      image: images,
      prompt: prompt,
      size: "1536x1024"
    })

    if (!response.data || response.data.length === 0) {
      throw new Error('No image data returned from OpenAI')
    }

    const imageBase64 = response.data[0].b64_json
    
    if (!imageBase64) {
      throw new Error('No base64 image data returned')
    }

    console.log(`✅ Thumbnail generated successfully`)

    return NextResponse.json({
      imageBase64: imageBase64,
      prompt: prompt,
      referenceCount: imageFiles.length
    })

  } catch (error) {
    console.error('❌ Thumbnail generation error:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate thumbnail',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 