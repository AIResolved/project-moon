import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

// Helper function to convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const color = searchParams.get('color') || '#ffffff'
  
  try {
    const backgroundImagePath = path.join(process.cwd(), 'public', 'background.jpeg')
    
    if (!fs.existsSync(backgroundImagePath)) {
      return NextResponse.json({ error: 'Background image not found' }, { status: 404 })
    }

    let processedBuffer: Buffer

    // Load the background image
    let backgroundBuffer = await sharp(backgroundImagePath)
      .resize(1280, 720, { fit: 'cover' })
      .toBuffer()

    if (color !== '#ffffff') {
      const rgb = hexToRgb(color)
      
      try {
        // Try the tint method first
        processedBuffer = await sharp(backgroundBuffer)
          .tint({ r: rgb.r, g: rgb.g, b: rgb.b })
          .modulate({ brightness: 0.8 })
          .jpeg({ quality: 90 })
          .toBuffer()
      } catch (error) {
        // Fallback to overlay method
        const colorOverlay = await sharp({
          create: {
            width: 1280,
            height: 720,
            channels: 4,
            background: { r: rgb.r, g: rgb.g, b: rgb.b, alpha: 0.6 }
          }
        })
        .png()
        .toBuffer()

        processedBuffer = await sharp(backgroundBuffer)
          .composite([{
            input: colorOverlay,
            blend: 'multiply'
          }])
          .jpeg({ quality: 90 })
          .toBuffer()
      }
    } else {
      processedBuffer = await sharp(backgroundBuffer)
        .jpeg({ quality: 90 })
        .toBuffer()
    }

    // Return the image directly
    return new Response(processedBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Error testing background:', error)
    return NextResponse.json(
      { error: 'Failed to process background: ' + (error as Error).message },
      { status: 500 }
    )
  }
} 