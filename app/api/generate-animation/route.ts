import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import fs from 'fs'

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

    // Convert uploaded image files to OpenAI file objects (PNG)
    const images = await Promise.all(
      imageFiles.map(async (file) => {
        // Convert File to Buffer
        const buffer = Buffer.from(await file.arrayBuffer())
        // Use toFile to create OpenAI-compatible file object
        return await toFile(buffer, file.name.replace(/\.[^/.]+$/, '.png'), {
          type: "image/png",
        })
      })
    )

    // Compose a detailed, specific prompt for OpenAI
    // (You may want to further customize this based on your app's needs)
    const openaiPrompt = `
Generate a photorealistic animation frame based on the following prompt: "${prompt}".
Use all the visual details and context from the provided reference images.
Ensure the resulting image is highly detailed, realistic, and matches the described scene.
`;

    // Call OpenAI's image editing API with all reference images and the prompt
    const response = await client.images.edit({
      model: "gpt-image-1",
      image: images,
      prompt: openaiPrompt,
    })

    // Save the generated image to disk (for debugging or local use)
    const image_base64 = response.data?.[0]?.b64_json
    if (!image_base64) {
      throw new Error('No image data returned from OpenAI')
    }
    const image_bytes = Buffer.from(image_base64, "base64")
    fs.writeFileSync("animation-frame.png", image_bytes)

    // Upload generated image to Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const animationId = uuidv4()
    // Use consistent path structure like other image generators
    const sanitizedPrompt = prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')
    const filePath = `images/gpt-image-1/${Date.now()}-${sanitizedPrompt}.png`
    const buffer = Buffer.from(image_base64, 'base64')

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
      resolution: '1024x1024',
      model: 'openai-dall-e'
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