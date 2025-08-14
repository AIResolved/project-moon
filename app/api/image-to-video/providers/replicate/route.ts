import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Initialize Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, image, duration = 5, model = 'bytedance/seedance-1-lite' } = body

    console.log('🎬 Replicate Image-to-video request:', { prompt, duration, model, hasImage: !!image })

    // Validate inputs
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      )
    }

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Image is required and must be a base64 string' },
        { status: 400 }
      )
    }

    if (![5, 10].includes(duration)) {
      return NextResponse.json(
        { error: 'Duration must be 5 or 10 seconds' },
        { status: 400 }
      )
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Replicate API token not configured' },
        { status: 500 }
      )
    }

    // Prepare the image data URL
    let imageDataUrl = image
    if (!image.startsWith('data:')) {
      imageDataUrl = `data:application/octet-stream;base64,${image}`
    }

    // Prepare input for Replicate
    const input = {
      prompt: prompt.trim(),
      image: imageDataUrl,
      duration: duration
    }

    console.log('🚀 Replicate input:', input)

    console.log('🚀 Starting Replicate image-to-video generation...')

    // Start the generation using ByteDance SeeDance Lite
    const output = await replicate.run("bytedance/seedance-1-lite", { input })
    console.log('🚀 Replicate output:', output)
    console.log('✅ Replicate generation completed')

    // Handle the output - could be a URL or FileOutput object  
    let videoUrl = ''
    if (typeof output === 'string') {
      videoUrl = output
    } else if (output && typeof output === 'object' && 'url' in output) {
      videoUrl = (output as any).url()
    } else if (Array.isArray(output) && output.length > 0) {
      videoUrl = output[0]
    }

    if (!videoUrl) {
      throw new Error('No video URL returned from Replicate')
    }

    // Upload video to Supabase storage for persistence
    let finalVideoUrl = videoUrl
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
      
      if (supabaseUrl && supabaseServiceKey) {
        console.log('📁 Uploading Replicate image-to-video to Supabase storage...')
        
        // Download video from Replicate URL
        const videoResponse = await fetch(videoUrl)
        if (!videoResponse.ok) {
          throw new Error('Failed to download video from Replicate')
        }
        
        const videoBuffer = await videoResponse.arrayBuffer()
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        // Generate unique filename
        const fileId = crypto.randomUUID()
        const destination = `generated-videos/replicate-i2v-seedance/${fileId}.mp4`
        
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
      provider: 'replicate',
      model: 'bytedance/seedance-1-lite',
      message: 'Image-to-video generation completed successfully'
    })

  } catch (error) {
    console.error('❌ Replicate Image-to-video generation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate image-to-video with Replicate',
        provider: 'replicate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}