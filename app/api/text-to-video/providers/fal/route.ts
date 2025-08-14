import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Configure FAL AI
fal.config({
  credentials: process.env.FAL_KEY
})

// Available FAL AI models for text-to-video
const FAL_MODELS = {
  'hailuo-02-pro': 'fal-ai/minimax/hailuo-02/pro/text-to-video',
  'kling-v2.1-master': 'fal-ai/kling-video/v2.1/master/text-to-video'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      prompt, 
      model = 'hailuo-02-pro',
      duration = 5,
      aspect_ratio = "16:9",
      fps = 24,
      seed,
      guidance_scale = 7,
      num_inference_steps = 50
    } = body

    console.log('🎬 FAL AI Text-to-video request:', { prompt, model })

    // Validate inputs
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      )
    }

    if (!FAL_MODELS[model as keyof typeof FAL_MODELS]) {
      return NextResponse.json(
        { error: `Invalid model. Available models: ${Object.keys(FAL_MODELS).join(', ')}` },
        { status: 400 }
      )
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: 'FAL AI API key not configured' },
        { status: 500 }
      )
    }

    const selectedModel = FAL_MODELS[model as keyof typeof FAL_MODELS]

    // Prepare input based on model requirements
    let input: any = {
      prompt: prompt.trim()
    }

    // Add model-specific parameters
    if (model === 'hailuo-02-pro') {
      input = {
        ...input,
        duration: duration
      }
    } else if (model === 'kling-v2.1-master') {
      input = {
        ...input,
        duration: duration,
        aspect_ratio: aspect_ratio
      }
    }

    // Add common optional parameters
    if (seed) {
      input.seed = seed
    }
    if (fps) {
      input.fps = fps
    }
    // guidance_scale and num_inference_steps are not used for the selected models

    console.log('🚀 Starting FAL AI text-to-video generation with model:', selectedModel)

    // Start the generation with progress tracking
    const result = await fal.subscribe(selectedModel, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log('📊 FAL AI Progress:', update.logs?.map((log) => log.message).join(', '))
        }
      },
    })

    console.log('✅ FAL AI generation completed')

    if (!result.data) {
      throw new Error('No data returned from FAL AI')
    }

    // Extract video URL from result
    let videoUrl = ''
    if (result.data.video) {
      videoUrl = result.data.video.url || result.data.video
    } else if (result.data.url) {
      videoUrl = result.data.url
    } else if (typeof result.data === 'string') {
      videoUrl = result.data
    }

    if (!videoUrl) {
      throw new Error('No video URL returned from FAL AI')
    }

    // Upload video to Supabase storage for persistence
    let finalVideoUrl = videoUrl
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
      
      if (supabaseUrl && supabaseServiceKey) {
        console.log('📁 Uploading FAL video to Supabase storage...')
        
        // Download video from FAL URL
        const videoResponse = await fetch(videoUrl)
        if (!videoResponse.ok) {
          throw new Error('Failed to download video from FAL')
        }
        
        const videoBuffer = await videoResponse.arrayBuffer()
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        // Generate unique filename
        const fileId = crypto.randomUUID()
        const destination = `generated-videos/fal-${model}/${fileId}.mp4`
        
        // Upload to Supabase
        const { error: uploadError } = await supabase.storage
          .from('audio')
          .upload(destination, videoBuffer, { 
            contentType: 'video/mp4', 
            upsert: false 
          })
        
        if (uploadError) {
          console.error('Supabase upload error:', uploadError)
          // Continue with original URL if upload fails
        } else {
          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('audio')
            .getPublicUrl(destination)
          
          finalVideoUrl = publicUrlData.publicUrl
          console.log('✅ Video uploaded to Supabase successfully')
        }
      }
    } catch (uploadError) {
      console.error('Failed to upload video to Supabase:', uploadError)
      // Continue with original URL if upload fails
    }

    return NextResponse.json({
      success: true,
      videoUrl: finalVideoUrl,
      provider: 'fal',
      model: model,
      requestId: result.requestId,
      message: 'Text-to-video generation completed successfully'
    })

  } catch (error) {
    console.error('❌ FAL AI Text-to-video generation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate text-to-video with FAL AI',
        provider: 'fal',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}