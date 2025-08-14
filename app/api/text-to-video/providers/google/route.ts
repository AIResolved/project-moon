import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, model = 'veo-3.0-generate-preview' } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required and must be a string' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Google GenAI API key not configured' }, { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey })

    let operation = await ai.models.generateVideos({
      model,
      prompt,
    })

    // Poll until done
    let safetyCounter = 0
    while (!operation.done && safetyCounter < 120) { // up to ~20 minutes if 10s sleep
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

    // Create a signed download URL through client lib
    // The SDK method returns a blob when used in Node, but here we will return
    // the file handle to the client to download or we can proxy-download.
    // For parity with other providers, return a direct downloadable URL via files.download

    // Attempt download to temp path and also read from response if possible
    const tmpDir = process.env.TMPDIR || '/tmp'
    const tmpFilename = `veo-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`
    const tmpPath = path.join(tmpDir, tmpFilename)
    const downloaded: any = await ai.files.download({ file, downloadPath: tmpPath })

    let fileBuffer: Buffer | null = null
    try {
      if (downloaded && typeof downloaded.arrayBuffer === 'function') {
        const ab = await downloaded.arrayBuffer()
        fileBuffer = Buffer.from(new Uint8Array(ab))
      } else if (downloaded instanceof ArrayBuffer) {
        fileBuffer = Buffer.from(new Uint8Array(downloaded))
      } else if (downloaded?.data instanceof ArrayBuffer) {
        fileBuffer = Buffer.from(new Uint8Array(downloaded.data))
      } else if (Buffer.isBuffer(downloaded)) {
        fileBuffer = downloaded
      }
    } catch {}

    if (!fileBuffer) {
      try {
        const stat = await fs.stat(tmpPath)
        if (stat.isFile()) {
          fileBuffer = await fs.readFile(tmpPath)
        }
      } catch {}
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: 'Failed to download generated video' }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
    if (!supabaseUrl || !supabaseServiceKey) {
      // Clean up temp file before erroring
      try { await fs.unlink(tmpPath) } catch {}
      return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const fileId = crypto.randomUUID()
    const destination = `generated-videos/google-veo/${fileId}.mp4`

    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(destination, fileBuffer, { contentType: 'video/mp4', upsert: false })

    // Clean up temp file if it exists
    try { await fs.unlink(tmpPath) } catch {}

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage
      .from('audio')
      .getPublicUrl(destination)

    const videoUrl = publicUrlData.publicUrl

    return NextResponse.json({
      success: true,
      videoUrl,
      provider: 'google',
      model,
      message: 'Text-to-video generation completed successfully'
    })
  } catch (error) {
    console.error('❌ Google GenAI Text-to-video error:', error)
    return NextResponse.json({
      error: 'Failed to generate text-to-video with Google GenAI',
      provider: 'google',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


