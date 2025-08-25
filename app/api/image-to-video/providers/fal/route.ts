import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Configure FAL AI
fal.config({
  credentials: process.env.FAL_KEY
})

// Available FAL AI models for image-to-video with their duration options
const FAL_MODELS = {
  'bytedance-seedance-v1-pro': {
    endpoint: 'fal-ai/bytedance/seedance/v1/pro/image-to-video',
    supportedDurations: [4, 6, 8, 10], // seconds
    defaultDuration: 6,
    supportsDuration: true
  },
  'pixverse-v4.5': {
    endpoint: 'fal-ai/pixverse/v4.5/image-to-video',
    supportedDurations: [5, 8], // seconds  
    defaultDuration: 5,
    supportsDuration: true
  },
  'wan-v2.2-5b': {
    endpoint: 'fal-ai/wan/v2.2-5b/image-to-video',
    supportedDurations: [4, 5], // seconds
    defaultDuration: 5,
    supportsDuration: true
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      prompt, 
      image_url, 
      model = 'bytedance-seedance-v1-pro',
      duration
    } = body

    console.log('🎬 FAL AI Image-to-video request:', { prompt, model, hasImage: !!image_url })

    // Validate inputs
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      )
    }

    if (!image_url || typeof image_url !== 'string') {
      return NextResponse.json(
        { error: 'Image URL is required and must be a string' },
        { status: 400 }
      )
    }

    const modelConfig = FAL_MODELS[model as keyof typeof FAL_MODELS]
    console.log('🔴 modelConfig: ', modelConfig)
    if (!modelConfig) {
      return NextResponse.json(
        { error: `Invalid model. Available models: ${Object.keys(FAL_MODELS).join(', ')}` },
        { status: 400 }
      )
    }

    // Validate duration if provided
    if (duration && modelConfig.supportsDuration) {
      if (!modelConfig.supportedDurations.includes(duration)) {
        return NextResponse.json(
          { 
            error: `Invalid duration for model ${model}. Supported durations: ${modelConfig.supportedDurations.join(', ')} seconds`,
            supportedDurations: modelConfig.supportedDurations 
          },
          { status: 400 }
        )
      }
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: 'FAL AI API key not configured' },
        { status: 500 }
      )
    }

    const selectedModel = modelConfig.endpoint

    // Prepare input based on model capabilities
    const input: any = {
      prompt: prompt.trim(),
      image_url: image_url
    }

    // Add duration if the model supports it
    if (modelConfig.supportsDuration) {
      const finalDuration = duration || modelConfig.defaultDuration
      if (model === 'wan-v2.2-5b') {
        const frames_per_second = 21
        const num_frames = duration * frames_per_second
        input.num_frames = num_frames
        input.frames_per_second = frames_per_second
      } else {
        input.duration = finalDuration
      }
      console.log(`🎬 Using duration: ${finalDuration}s for model: ${model}`)
    }

    console.log('🚀 Starting FAL AI image-to-video generation with model:', selectedModel)


    console.log('🚀 Input:', input)
    // Submit the request to the queue
    const { request_id } = await fal.queue.submit(selectedModel, {
      input
    })

    console.log(`📋 Request submitted with ID: ${request_id}`)

    // Poll for status and completion
    let status
    let attempts = 0
    const maxAttempts = 180 // 15 minutes with 5-second intervals
    
    // Check initial status immediately
    status = await fal.queue.status(selectedModel, {
      requestId: request_id,
      logs: true
    })
    
    console.log(`🔄 Initial status: ${status.status}`)
    
    // Continue polling if not completed
    while (status.status === "IN_PROGRESS" || status.status === "IN_QUEUE") {
      if (attempts >= maxAttempts) {
        throw new Error('Request timed out after 15 minutes')
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      attempts++
      
      status = await fal.queue.status(selectedModel, {
        requestId: request_id,
        logs: true
      })
      
      console.log(`🔄 Status check ${attempts}: ${status.status}`)
      
      // Log any new progress messages
      if ((status as any).logs && (status as any).logs.length > 0) {
        (status as any).logs.forEach((log: any) => {
          if (log.message) {
            console.log(log.message)
          }
        })
      }
    }

    if (status.status !== "COMPLETED") {
      throw new Error(`Request failed with status: ${status.status}`)
    }

    // Get the final result
    console.log('🔄 Getting final result by request id: ', request_id)
    console.log('🔄 Selected model: ', selectedModel)
    const result = await fal.queue.result(selectedModel, {
      requestId: request_id,
    })
    console.log('🔄 Result:', result)

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
        console.log('📁 Uploading FAL image-to-video to Supabase storage...')
        
        // Download video from FAL URL
        const videoResponse = await fetch(videoUrl)
        if (!videoResponse.ok) {
          throw new Error('Failed to download video from FAL')
        }
        
        const videoBuffer = await videoResponse.arrayBuffer()
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        // Generate unique filename
        const fileId = crypto.randomUUID()
        const destination = `generated-videos/fal-i2v-${model}/${fileId}.mp4`
        
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
          console.log('✅ Image-to-video uploaded to Supabase successfully')
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
      requestId: request_id,
      message: 'Image-to-video generation completed successfully'
    })

  } catch (error) {
    console.error('❌ FAL AI Image-to-video generation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate image-to-video with FAL AI',
        provider: 'fal',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}