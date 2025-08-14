import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

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

    // Collect all image files (reference images)
    const imageFiles: File[] = []
    let index = 0

    while (true) {
      const file = formData.get(`referenceImage${index}`) as File
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

    console.log(`🎬 Processing ${imageFiles.length} reference images for animation generation`)

    // Convert files to OpenAI format
    const images = await Promise.all(
      imageFiles.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer())
        return await toFile(buffer, file.name, {
          type: file.type,
        })
      })
    )

    console.log(`📝 Generating animation with prompt: "${prompt.substring(0, 100)}..."`)

    // Placeholder: Use OpenAI's image editing API as a stand-in for animation generation
    // In production, replace this with actual video generation API integration
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

    // Upload to Supabase and return public URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const animationId = uuidv4()
    const filePath = `animation-images/${animationId}.png`
    const buffer = Buffer.from(imageBase64, 'base64')

    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: false
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      throw new Error('Failed to upload generated image to Supabase')
    }

    const { data: publicUrlData } = supabase.storage
      .from('audio')
      .getPublicUrl(filePath)

    console.log(`✅ Animation generated and uploaded successfully with ID: ${animationId}`)

    return NextResponse.json({
      success: true,
      animationId: animationId,
      animationUrl: publicUrlData.publicUrl,
      prompt: prompt,
      referenceCount: imageFiles.length,
      duration: 5,
      format: 'image',
      resolution: '1536x1024'
    })

  } catch (error) {
    console.error('❌ Animation generation error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate animation',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 