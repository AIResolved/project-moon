import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, image_url, model = 'veo-3.0-generate-preview' } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required and must be a string' }, { status: 400 })
    }
    if (!image_url || typeof image_url !== 'string') {
      return NextResponse.json({ error: 'image_url is required and must be a string' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Google GenAI API key not configured' }, { status: 500 })
    }

    // Fetch the image from the provided URL
    const imgRes = await fetch(image_url)
    if (!imgRes.ok) {
      return NextResponse.json({ error: `Failed to fetch image: ${imgRes.statusText}` }, { status: 400 })
    }
    const contentType = imgRes.headers.get('content-type') || 'image/png'
    const imageArrayBuffer = await imgRes.arrayBuffer()

    const ai = new GoogleGenAI({ apiKey })

    // Start Veo generation with imageBytes
    let operation = await ai.models.generateVideos({
      model,
      prompt,
      image: {
        imageBytes: Buffer.from(imageArrayBuffer).toString('base64'),
        mimeType: contentType.includes('jpeg') ? 'image/jpeg' : 'image/png'
      }
    })

    // Poll until done
    let safetyCounter = 0
    while (!operation.done && safetyCounter < 120) {
      await new Promise((resolve) => setTimeout(resolve, 10000))
      operation = await ai.operations.getVideosOperation({ operation })
      safetyCounter++
    }

    if (!operation.done) {
      throw new Error('Video generation timed out')
    }

    const file = operation.response?.generatedVideos?.[0]?.video
    if (!file) {
      throw new Error('No generated video returned')
    }

    // Download to tmp and read buffer
    const tmpDir = process.env.TMPDIR || '/tmp'
    const tmpFilename = `veo-i2v-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`
    const tmpPath = path.join(tmpDir, tmpFilename)
    await ai.files.download({ file, downloadPath: tmpPath })
    const fileBuffer = await fs.readFile(tmpPath)

    // Upload to Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
    if (!supabaseUrl || !supabaseServiceKey) {
      try { await fs.unlink(tmpPath) } catch {}
      return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 })
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const fileId = crypto.randomUUID()
    const destination = `generated-videos/google-veo/${fileId}.mp4`
    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(destination, fileBuffer, { contentType: 'video/mp4', upsert: false })

    try { await fs.unlink(tmpPath) } catch {}

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage
      .from('audio')
      .getPublicUrl(destination)

    return NextResponse.json({
      success: true,
      videoUrl: publicUrlData.publicUrl,
      provider: 'google',
      model,
      requestId: operation.name,
      message: 'Image-to-video generation completed successfully'
    })
  } catch (error) {
    console.error('❌ Google GenAI Image-to-video error:', error)
    return NextResponse.json({
      error: 'Failed to generate image-to-video with Google GenAI',
      provider: 'google',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


