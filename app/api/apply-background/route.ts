import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

// Helper function to convert data URL to buffer
function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64Data = dataUrl.split(',')[1]
  return Buffer.from(base64Data, 'base64')
}

// Helper function to convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 }
}

// Apply background to image if it doesn't fill the 16:9 canvas
async function applyBackgroundToImage(
  imageBuffer: Buffer, 
  backgroundColor: string,
  backgroundImagePath?: string
): Promise<Buffer> {
  const targetWidth = 1280
  const targetHeight = 720

  try {
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata()
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not read image dimensions')
    }

    // If image is already exactly 1280x720, return as is
    if (metadata.width === targetWidth && metadata.height === targetHeight) {
      return imageBuffer
    }

    let backgroundBuffer: Buffer

    // Try to use background.jpeg if it exists
    if (backgroundImagePath && fs.existsSync(backgroundImagePath)) {
      try {
        console.log('Loading background image from:', backgroundImagePath)
        console.log('Selected color:', backgroundColor)
        
        // Load and resize the background image
        backgroundBuffer = await sharp(backgroundImagePath)
          .resize(targetWidth, targetHeight, { fit: 'cover' })
          .toBuffer()

        // If a color is selected (not white), apply it as a tint
        if (backgroundColor !== '#ffffff') {
          const rgb = hexToRgb(backgroundColor)
          console.log('Applying tint with RGB:', rgb)
          
          // Method 1: Try using tint() method which is more direct
          try {
            backgroundBuffer = await sharp(backgroundBuffer)
              .tint({ r: rgb.r, g: rgb.g, b: rgb.b })
              .modulate({ brightness: 0.8 }) // Slightly darken to make tint more visible
              .jpeg({ quality: 90 })
              .toBuffer()
            console.log('Applied tint using tint() method')
          } catch (tintError) {
            console.log('Tint method failed, trying overlay method:', tintError)
            
            // Method 2: Create a color overlay and composite it
            const colorOverlay = await sharp({
              create: {
                width: targetWidth,
                height: targetHeight,
                channels: 4,
                background: { r: rgb.r, g: rgb.g, b: rgb.b, alpha: 0.6 } // Increased opacity to 60%
              }
            })
            .png()
            .toBuffer()

            // Composite the color overlay on top of the background
            backgroundBuffer = await sharp(backgroundBuffer)
              .composite([{
                input: colorOverlay,
                blend: 'multiply' // Changed from overlay to multiply for stronger effect
              }])
              .jpeg({ quality: 90 })
              .toBuffer()
            console.log('Applied tint using overlay method')
          }
        } else {
          // Just convert to JPEG for consistency
          backgroundBuffer = await sharp(backgroundBuffer)
            .jpeg({ quality: 90 })
            .toBuffer()
          console.log('Using original background (white selected)')
        }
      } catch (error) {
        console.warn('Could not load background.jpeg, using solid color:', error)
        // Fallback to solid color
        const rgb = hexToRgb(backgroundColor)
        backgroundBuffer = await sharp({
          create: {
            width: targetWidth,
            height: targetHeight,
            channels: 3,
            background: { r: rgb.r, g: rgb.g, b: rgb.b }
          }
        })
        .jpeg({ quality: 90 })
        .toBuffer()
      }
    } else {
      console.log('Background image not found, using solid color')
      // Create solid color background if no background image
      const rgb = hexToRgb(backgroundColor)
      backgroundBuffer = await sharp({
        create: {
          width: targetWidth,
          height: targetHeight,
          channels: 3,
          background: { r: rgb.r, g: rgb.g, b: rgb.b }
        }
      })
      .jpeg({ quality: 90 })
      .toBuffer()
    }

    // Calculate position to center the image
    const left = Math.round((targetWidth - metadata.width) / 2)
    const top = Math.round((targetHeight - metadata.height) / 2)

    console.log('Centering image at position:', { left, top, width: metadata.width, height: metadata.height })

    // Composite the image on top of the background
    const result = await sharp(backgroundBuffer)
      .composite([{
        input: imageBuffer,
        left: left,
        top: top
      }])
      .jpeg({ quality: 90 })
      .toBuffer()

    return result
  } catch (error) {
    console.error('Error applying background to image:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const { images, backgroundColor } = await request.json()

    if (!images || !Array.isArray(images)) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 })
    }

    if (!backgroundColor) {
      return NextResponse.json({ error: 'No background color provided' }, { status: 400 })
    }

    // Path to background image
    const backgroundImagePath = path.join(process.cwd(), 'public', 'background.jpeg')

    const processedImages = await Promise.all(
      images.map(async (image) => {
        try {
          // Convert data URL to buffer
          const imageBuffer = dataUrlToBuffer(image.dataUrl)
          
          // Apply background if needed
          const processedBuffer = await applyBackgroundToImage(
            imageBuffer, 
            backgroundColor,
            backgroundImagePath
          )
          
          // Convert back to data URL
          const base64 = processedBuffer.toString('base64')
          const dataUrl = `data:image/jpeg;base64,${base64}`
          
          return {
            id: image.id,
            name: image.name,
            originalName: image.originalName || image.name,
            dataUrl,
            processed: true
          }
        } catch (error) {
          console.error(`Error processing image ${image.name}:`, error)
          // Return original image if processing fails
          return image
        }
      })
    )

    return NextResponse.json({
      success: true,
      images: processedImages,
      message: `Applied background to ${processedImages.length} images`
    })

  } catch (error) {
    console.error('Error applying background:', error)
    return NextResponse.json(
      { error: 'Failed to apply background: ' + (error as Error).message },
      { status: 500 }
    )
  }
} 