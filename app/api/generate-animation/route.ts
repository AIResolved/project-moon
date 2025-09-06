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

    // Perform comprehensive reference image analysis
    let referenceAnalysis = {
      artStyle: "",
      characterDesign: "",
      colorPalette: "",
      proportions: "",
      technique: "",
      visualElements: "",
      atmosphere: "",
      composition: "",
      detailedDescription: ""
    };

    if (imageFiles[0]) {
      try {
        const buffer = Buffer.from(await imageFiles[0].arrayBuffer());
        const base64Image = buffer.toString('base64');
        
        console.log("🔍 Starting comprehensive reference image analysis...");
        
        const visionResponse = await client.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this reference image for UI display purposes. Provide a brief structured breakdown:

ART_STYLE: [Brief description of the artistic style]
CHARACTER_DESIGN: [Brief description of how characters are designed]
COLOR_PALETTE: [Main colors used]
TECHNIQUE: [Drawing/rendering technique]

Keep each section to 1-2 sentences for UI display.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${imageFiles[0].type};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 400
        });
        
        const analysisText = visionResponse.choices[0]?.message?.content || "";
        
        // Parse the simplified structured response
        const artStyleMatch = analysisText.match(/ART_STYLE:\s*([\s\S]*?)(?=\n\n|\nCHARACTER_DESIGN:|$)/);
        const characterDesignMatch = analysisText.match(/CHARACTER_DESIGN:\s*([\s\S]*?)(?=\n\n|\nCOLOR_PALETTE:|$)/);
        const colorPaletteMatch = analysisText.match(/COLOR_PALETTE:\s*([\s\S]*?)(?=\n\n|\nTECHNIQUE:|$)/);
        const techniqueMatch = analysisText.match(/TECHNIQUE:\s*([\s\S]*?)$/);
        
        referenceAnalysis = {
          artStyle: artStyleMatch?.[1]?.trim() || "Similar artistic style as reference",
          characterDesign: characterDesignMatch?.[1]?.trim() || "Match character design from reference",
          colorPalette: colorPaletteMatch?.[1]?.trim() || "Use reference color palette",
          proportions: "Match reference proportions",
          technique: techniqueMatch?.[1]?.trim() || "Apply reference technique",
          visualElements: "Use reference visual elements",
          atmosphere: "Create reference atmosphere",
          composition: "Apply reference composition",
          detailedDescription: analysisText || "Apply the same style as reference image"
        };
        
        console.log("📝 Comprehensive reference analysis completed:");
        console.log("🎨 Art Style:", referenceAnalysis.artStyle);
        console.log("👤 Character Design:", referenceAnalysis.characterDesign);
        console.log("🌈 Color Palette:", referenceAnalysis.colorPalette);
        console.log("📏 Proportions:", referenceAnalysis.proportions);
        console.log("🖌️ Technique:", referenceAnalysis.technique);
        
      } catch (error) {
        console.warn("⚠️ Could not analyze reference image:", error);
        referenceAnalysis.detailedDescription = "Apply the same visual style and character design as the reference image with complete consistency";
      }
    }

    // Create a concise prompt since we're passing the reference image directly
    const editPrompt = `Create a landscape (16:9) scene: "${prompt}". Apply the same visual style, character design, colors, proportions, and artistic technique as shown in the reference image. Maintain complete visual consistency.`;

    console.log(`📝 Edit prompt length: ${editPrompt.length} characters`);

    // Use gpt-image-1 with reference image directly
    const response = await client.images.edit({
      model: "gpt-image-1",
      image: images, // Pass the reference images directly
      prompt: editPrompt,
      size: "1536x1024", // Landscape aspect ratio (16:9)
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
      referenceAnalysis: referenceAnalysis,
      referenceStyleDescription: referenceAnalysis.detailedDescription, // For backward compatibility
      duration: 5,
      format: 'image',
      resolution: '1536x1024', // Landscape format
      aspectRatio: '16:9',
      model: 'gpt-image-1'
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