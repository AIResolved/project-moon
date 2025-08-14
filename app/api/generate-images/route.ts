import { NextRequest, NextResponse } from 'next/server';
import { GenerateImageRequestBody, GenerateImageResponse } from '@/types/image-generation';
import { v4 as uuidv4 } from 'uuid';
import { fal } from "@fal-ai/client";
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const FAL_API_KEY = process.env.FAL_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LEONARDO_API_KEY = process.env.LEONARDO_API_KEY;
const GOOGLE_GENAI_API_KEY = process.env.GOOGLE_GENAI_API_KEY;
const LEONARDO_API_URL = 'https://cloud.leonardo.ai/api/rest/v1';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize OpenAI client
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Configure fal.ai
if (FAL_API_KEY) {
  fal.config({
    credentials: FAL_API_KEY,
  });
}

// Helper to upload image to Supabase and return public URL
async function uploadImageToSupabase(imageData: string | Buffer, prompt: string, provider: string): Promise<string> {
  let buffer: Buffer;
  let fileType: 'png' | 'jpeg' = 'png';

  if (typeof imageData === 'string' && imageData.startsWith('http')) {
    const response = await fetch(imageData);
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type');
    if (contentType === 'image/jpeg') fileType = 'jpeg';
  } else if (typeof imageData === 'string' && imageData.startsWith('data:image')) {
    const parts = imageData.split(',');
    const meta = parts[0];
    const data = parts[1];
    if (meta.includes('image/jpeg')) fileType = 'jpeg';
    buffer = Buffer.from(data, 'base64');
  } else if (Buffer.isBuffer(imageData)) {
    buffer = imageData;
  } else {
    throw new Error('Invalid image data format for upload');
  }
  
  const sanitizedPrompt = prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
  const filePath = `images/${provider}/${Date.now()}-${sanitizedPrompt}.${fileType}`;

  const { error } = await supabase.storage
    .from('audio')
    .upload(filePath, buffer, {
      contentType: `image/${fileType}`,
      upsert: false,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error('Failed to upload image to Supabase.');
  }

  const { data } = supabase.storage.from('audio').getPublicUrl(filePath);
  return data.publicUrl;
}

// Helper function for retrying an async operation
async function retryAsync<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000,
  attempt: number = 1
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attempt > retries) {
      console.error(`Failed after ${retries} retries. Last error:`, error);
      throw error;
    }
    console.warn(`Attempt ${attempt} failed. Retrying in ${delayMs / 1000}s... Error:`, error);
    await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    return retryAsync(fn, retries, delayMs, attempt + 1);
  }
}

// Get image dimensions based on aspect ratio
const getImageDimensions = (aspectRatio: '16:9' | '1:1' | '9:16', provider: string) => {
  if (provider === 'minimax') {
    // MiniMax uses aspect_ratio parameter
    return null;
  }

  // For flux models and Leonardo Phoenix, use specific dimensions
  switch (aspectRatio) {
    case '16:9':
      return { width: 1344, height: 768 };
    case '1:1':
      return { width: 1024, height: 1024 };
    case '9:16':
      return { width: 768, height: 1344 };
    default:
      return { width: 1024, height: 1024 };
  }
};

// Generate image using flux models via fal.ai
async function generateFluxImage(provider: string, prompt: string, dimensions: { width: number; height: number }): Promise<string> {
  let modelEndpoint: string;
  
  switch (provider) {
    case 'flux-dev':
      modelEndpoint = 'fal-ai/flux/dev';
      break;
    case 'recraft-v3':
      modelEndpoint = 'fal-ai/recraft-v3';
      break;
    case 'stable-diffusion-v35-large':
      modelEndpoint = 'fal-ai/stable-diffusion-v35-large';
      break;
    case 'stable-diffusion-v35-medium':
      modelEndpoint = 'fal-ai/stable-diffusion-v35-medium';
      break;
    case 'ideogram-v3':
      modelEndpoint = 'fal-ai/ideogram/v3';
      break;
    case 'minimax-image-01':
      modelEndpoint = 'fal-ai/minimax/image-01';
      break;
    default:
      throw new Error(`Unsupported flux model: ${provider}`);
  }

  const result = await fal.subscribe(modelEndpoint, {
    input: {
      prompt,
      image_size: dimensions,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: false
    },
  });

  // Extract image URL from fal.ai response
  if (result.data?.images?.[0]?.url) {
    return result.data.images[0].url;
  } else if (result.data?.image?.url) {
    return result.data.image.url;
  } else {
    console.error('Unexpected fal.ai response structure:', result);
    throw new Error('No image URL found in fal.ai response');
  }
}

// Generate image using GPT Image 1 via OpenAI
async function generateGPTImage1(prompt: string, size: '1024x1024' | '1536x1024' | '1024x1536' = '1024x1024'): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI client not initialized - check API key');
  }

  console.log(`🎨 Generating GPT Image 1 with size: ${size}`);
  
  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt: prompt,
    n: 1,
    size: size,
  });

  console.log('GPT Image 1 response received');
  if (!response.data?.[0]?.b64_json) {
    throw new Error('No image data received from GPT Image 1');
  }

  // Return as data URL for immediate use
  return `data:image/png;base64,${response.data[0].b64_json}`;
}

// Generate image using DALL-E 3 via OpenAI
async function generateDalleImage(prompt: string, size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024'): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI client not initialized - check API key');
  }

  console.log(`🎨 Generating DALL-E 3 image with size: ${size}`);
  
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: size,
    quality: "standard",
    response_format: "b64_json"
  });

  console.log('DALL-E 3 response:', JSON.stringify(response, null, 2));
  if (!response.data?.[0]?.b64_json) {
    throw new Error('No image data received from DALL-E 3');
  }

  // Return as data URL for immediate use
  return `data:image/png;base64,${response.data[0].b64_json}`;
}

// Leonardo API interfaces
interface LeonardoGenerationResponse {
  sdGenerationJob: {
    generationId: string;
    apiCreditCost?: number;
  };
}

interface LeonardoImage {
  id: string;
  url: string;
  nsfw: boolean;
  likeCount: number;
  motionMP4URL?: string | null;
  prompt_id?: string;
}

interface LeonardoGenerationStatus {
  generations_by_pk: {
    generated_images: LeonardoImage[];
    modelId: string;
    prompt: string;
    status: 'PENDING' | 'COMPLETE' | 'FAILED' | 'CONTENT_FILTERED';
    id?: string;
  } | null;
}

// Poll for Leonardo generation completion
async function pollForGenerationCompletion(generationId: string): Promise<LeonardoGenerationStatus> {
  let attempts = 0;
  const maxAttempts = 20; // Poll for up to 100 seconds (20 * 5s)
  const pollInterval = 5000; // 5 seconds

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${LEONARDO_API_URL}/generations/${generationId}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${LEONARDO_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Leonardo API error while polling:', errorData);
        throw new Error(`Leonardo API error while polling: ${response.statusText}`);
      }

      const data: LeonardoGenerationStatus = await response.json();

      if (data.generations_by_pk && (data.generations_by_pk.status === 'COMPLETE' || data.generations_by_pk.status === 'FAILED' || data.generations_by_pk.status === 'CONTENT_FILTERED')) {
        return data;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.error('Polling error:', error);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      if (attempts >= maxAttempts) throw error;
    }
  }
  throw new Error('Image generation timed out or polling failed.');
}

// Generate image using Leonardo Phoenix
async function generateLeonardoPhoenixImage(prompt: string, width: number, height: number, contrast: number = 3.5): Promise<string> {
  const generationPayload = {
    modelId: "de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3", // Leonardo Phoenix 1.0 model
    prompt: prompt,
    contrast: contrast,
    num_images: 1,
    width: width,
    height: height,
    alchemy: true,
    styleUUID: "111dc692-d470-4eec-b791-3475abac4c46", // Dynamic style
    enhancePrompt: false,
  };

      console.log('🚀 Starting Leonardo Phoenix image generation...');
  
    const generationResponse = await fetch(`${LEONARDO_API_URL}/generations`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${LEONARDO_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(generationPayload),
  });

  if (!generationResponse.ok) {
    const errorData = await generationResponse.json();
    console.error('Leonardo Phoenix API error (generation):', errorData);
    throw new Error(`Leonardo Phoenix API request failed with status ${generationResponse.status}`);
  }

  const generationResult: LeonardoGenerationResponse = await generationResponse.json();
  const generationId = generationResult.sdGenerationJob?.generationId;

  if (!generationId) {
    throw new Error('Failed to get generation ID from Leonardo Phoenix');
  }

  console.log(`🔄 Polling for Leonardo Phoenix generation completion: ${generationId}`);
  const finalStatus = await pollForGenerationCompletion(generationId);

  let errorDetail = '';
  if (finalStatus.generations_by_pk?.status === 'FAILED') errorDetail = 'Image generation failed on Leonardo Phoenix.';
  if (finalStatus.generations_by_pk?.status === 'CONTENT_FILTERED') errorDetail = 'Image generation was filtered by Leonardo Phoenix due to content policy.';

  const imageUrl = finalStatus.generations_by_pk?.generated_images?.[0]?.url;

  if (!imageUrl) {
    throw new Error(errorDetail || 'No image URL found in Leonardo Phoenix response');
  }

  console.log('✅ Leonardo Phoenix image generated successfully');
  return imageUrl;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateImageRequestBody;
    const {
      provider = 'minimax',
      prompt,
      numberOfImages = 1,
      minimaxAspectRatio = "16:9",
      userId = "unknown_user"
    } = body;

    console.log(`🖼️ Received ${provider} image generation request: userId=${userId}, images=${numberOfImages}, prompt=${prompt.substring(0, 50)}...`);

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    console.log(`🎨 Received styled prompt: ${prompt.substring(0, 150)}...`);

    // Check API keys based on provider
    if (provider === 'minimax' && !MINIMAX_API_KEY) {
      return NextResponse.json({ error: 'MiniMax API key is not configured.' }, { status: 500 });
    }

    if (['flux-dev', 'recraft-v3', 'stable-diffusion-v35-large', 'ideogram'].includes(provider) && !FAL_API_KEY) {
      return NextResponse.json({ error: 'FAL API key is not configured for fal.ai models.' }, { status: 500 });
    }

    if (provider === 'dalle-3' && !OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key is not configured for DALL-E 3.' }, { status: 500 });
    }

    if (provider === 'gpt-image-1' && !OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key is not configured for GPT Image 1.' }, { status: 500 });
    }

    if (provider === 'leonardo-phoenix' && !LEONARDO_API_KEY) {
      return NextResponse.json({ error: 'Leonardo API key is not configured for Phoenix model.' }, { status: 500 });
    }

    const imageUrls: string[] = [];

    if (provider === 'minimax') {
      // Existing MiniMax logic
      const minimaxApiUrl = "https://api.minimaxi.chat/v1/image_generation";
      console.log(`Generating ${numberOfImages} image(s) with MiniMax...`);

      const generateSingleMinimaxImage = async (): Promise<string | null> => {
        const attemptGeneration = async (): Promise<string | null> => {
          const payload = {
            model: "image-01",
            prompt: prompt,
            aspect_ratio: minimaxAspectRatio,
            response_format: "base64",
            width: 1536,
            height: 1024,
            n: 1,
            prompt_optimizer: true,
          };
          const headers = {
            'Authorization': `Bearer ${MINIMAX_API_KEY}`,
            'Content-Type': 'application/json',
          };

          try {
            const minimaxResponse = await fetch(minimaxApiUrl, { 
              method: 'POST', 
              headers: headers, 
              body: JSON.stringify(payload) 
            });
            
            if (!minimaxResponse.ok) {
              const errorData = await minimaxResponse.json().catch(() => ({}));
              console.error('MiniMax API error:', minimaxResponse.status, errorData);
              throw new Error(`MiniMax API request failed with status ${minimaxResponse.status}`);
            }
            
            const data = await minimaxResponse.json();

            if (data.data?.image_base64?.[0]) {
              const base64String = data.data.image_base64[0];
              return `data:image/png;base64,${base64String}`;
            }
            
            if (data.base && data.base.status_code !== 0) {
              console.error('MiniMax API returned an error status:', data.base);
              throw new Error(`MiniMax API error: ${data.base?.status_msg || 'Unknown error'}`);
            }
            
            console.warn('MiniMax response format unexpected - no image data found:', data);
            throw new Error('No image data received from MiniMax API');
          } catch (error) {
            console.error('Error during single MiniMax image generation attempt:', error);
            throw error;
          }
        };
        
        return retryAsync(attemptGeneration);
      };

      // Generate all images sequentially for MiniMax
      for (let i = 0; i < numberOfImages; i++) {
        console.log(`Generating image ${i + 1} of ${numberOfImages}...`);
        
        try {
          const imageUrl = await generateSingleMinimaxImage();
          if (imageUrl) {
            imageUrls.push(imageUrl);
            console.log(`✅ Successfully generated image ${i + 1}`);
          } else {
            console.warn(`⚠️ Failed to generate image ${i + 1}`);
          }
        } catch (error) {
          console.error(`❌ Error generating image ${i + 1}:`, error);
        }
        
        // Small delay between requests
        if (i < numberOfImages - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } else if (provider === 'dalle-3') {
      // DALL-E 3 generation with efficient batch processing
      console.log(`Generating ${numberOfImages} image(s) with DALL-E 3 in parallel...`);
      
      // Determine image size based on aspect ratio
      let dalleSize: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024';
      switch (minimaxAspectRatio) {
        case '16:9':
          dalleSize = '1792x1024';
          break;
        case '1:1':
          dalleSize = '1024x1024';
          break;
        case '9:16':
          dalleSize = '1024x1792';
          break;
      }

      // Process all DALL-E 3 requests in parallel (batch size 20)
      const requestPromises = Array.from({ length: numberOfImages }, async (_, index) => {
        try {
          console.log(`Starting DALL-E 3 image ${index + 1} of ${numberOfImages}...`);
          const imageUrl = await generateDalleImage(prompt, dalleSize);
          console.log(`✅ Successfully generated DALL-E 3 image ${index + 1}`);
          return imageUrl;
        } catch (error) {
          console.error(`❌ Error generating DALL-E 3 image ${index + 1}:`, error);
          return null;
        }
      });

      // Wait for all DALL-E 3 requests to complete
      const results = await Promise.all(requestPromises);
      const validImageUrls = results.filter((url): url is string => url !== null);
      imageUrls.push(...validImageUrls);
      
      console.log(`✅ DALL-E 3 batch complete: ${validImageUrls.length}/${numberOfImages} images generated successfully`);
    } else if (provider === 'gpt-image-1') {
      // GPT Image 1 generation with efficient batch processing
      console.log(`Generating ${numberOfImages} image(s) with GPT Image 1 in parallel...`);
      
      // Determine image size based on aspect ratio
      let gptImageSize: '1024x1024' | '1536x1024' | '1024x1536' = '1024x1024';
      switch (minimaxAspectRatio) {
        case '16:9':
          gptImageSize = '1536x1024';
          break;
        case '1:1':
          gptImageSize = '1024x1024';
          break;
        case '9:16':
          gptImageSize = '1024x1536';
          break;
      }

      // Process all GPT Image 1 requests in parallel (batch size 20)
      const requestPromises = Array.from({ length: numberOfImages }, async (_, index) => {
        try {
          console.log(`Starting GPT Image 1 generation ${index + 1} of ${numberOfImages}...`);
          const imageUrl = await generateGPTImage1(prompt, gptImageSize);
          console.log(`✅ Successfully generated GPT Image 1 ${index + 1}`);
          return imageUrl;
        } catch (error) {
          console.error(`❌ Error generating GPT Image 1 ${index + 1}:`, error);
          return null;
        }
      });

      // Wait for all GPT Image 1 requests to complete
      const results = await Promise.all(requestPromises);
      const validImageUrls = results.filter((url): url is string => url !== null);
      imageUrls.push(...validImageUrls);
      
      console.log(`✅ GPT Image 1 batch complete: ${validImageUrls.length}/${numberOfImages} images generated successfully`);
    } else if (provider === 'leonardo-phoenix') {
      // Leonardo Phoenix generation
      console.log(`Generating ${numberOfImages} image(s) with Leonardo Phoenix...`);
      
      const dimensions = getImageDimensions(minimaxAspectRatio, 'leonardo-phoenix');
      if (!dimensions) {
        throw new Error('Invalid dimensions for Leonardo Phoenix');
      }

      // Generate images sequentially for Leonardo Phoenix (rate limiting)
      for (let i = 0; i < numberOfImages; i++) {
        console.log(`Generating Leonardo Phoenix image ${i + 1} of ${numberOfImages}...`);
        
        try {
          const imageUrl = await generateLeonardoPhoenixImage(prompt, dimensions.width, dimensions.height, 3.5);
          imageUrls.push(imageUrl);
          console.log(`✅ Successfully generated Leonardo Phoenix image ${i + 1}`);
        } catch (error) {
          console.error(`❌ Error generating Leonardo Phoenix image ${i + 1}:`, error);
        }
        
        // Rate limiting: Wait 10 seconds between requests
        if (i < numberOfImages - 1) {
          console.log('Waiting 10 seconds for Leonardo Phoenix rate limiting...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }

    } else {
      // Flux models using fal.ai
      console.log(`Generating ${numberOfImages} image(s) with ${provider}...`);
      
      const dimensions = getImageDimensions(minimaxAspectRatio, provider);
      if (!dimensions) {
        throw new Error('Invalid dimensions for flux model');
      }

      // Generate images with rate limiting for flux (10 per minute)
      for (let i = 0; i < numberOfImages; i++) {
        console.log(`Generating flux image ${i + 1} of ${numberOfImages}...`);
        
        try {
          const imageUrl = await generateFluxImage(provider, prompt, dimensions);
          imageUrls.push(imageUrl);
          console.log(`✅ Successfully generated flux image ${i + 1}`);
        } catch (error) {
          console.error(`❌ Error generating flux image ${i + 1}:`, error);
        }
        
        // Rate limiting: Wait 6 seconds between requests (10 per minute)
        if (i < numberOfImages - 1) {
          console.log('Waiting 6 seconds for flux rate limiting...');
          await new Promise(resolve => setTimeout(resolve, 6000));
        }
      }
    }

    if (imageUrls.length === 0) {
      console.error("No images were successfully generated.");
      return NextResponse.json({ 
        error: 'Image generation failed. No images were successfully created.' 
      }, { status: 500 });
    }

    // Upload base64 images to Supabase Storage and get public URLs
    console.log(`📤 Uploading ${imageUrls.length} generated images to Supabase Storage...`);
    const publicImageUrls: string[] = [];
    
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const imageUrl = imageUrls[i];
        
        // Skip if it's already a public URL (not base64)
        if (imageUrl.startsWith('http')) {
          publicImageUrls.push(imageUrl);
          continue;
        }
        
        // Upload base64 image to Supabase Storage
        const sanitizedPrompt = prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
        const publicUrl = await uploadImageToSupabase(imageUrl, sanitizedPrompt, provider);
        publicImageUrls.push(publicUrl);
        console.log(`✅ Uploaded image ${i + 1}/${imageUrls.length} to Supabase Storage`);
      } catch (error) {
        console.error(`❌ Failed to upload image ${i + 1}:`, error);
        // Fall back to original URL if upload fails
        publicImageUrls.push(imageUrls[i]);
      }
    }

    console.log(`✅ ${provider} image generation complete. Generated ${publicImageUrls.length} image(s) with public URLs.`);
    const responsePayload: GenerateImageResponse = { imageUrls: publicImageUrls };
    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to generate image' 
    }, { status: 500 });
  }
}

// Environment variable check
if (process.env.NODE_ENV !== 'test') {
  if (!MINIMAX_API_KEY) {
    console.warn("Warning: MINIMAX_API_KEY environment variable is not set. MiniMax image generation will fail.");
  }
  if (!FAL_API_KEY) {
    console.warn("Warning: FAL_API_KEY environment variable is not set. Flux model generation will fail.");
  }
  if (!OPENAI_API_KEY) {
    console.warn("Warning: OPENAI_API_KEY environment variable is not set. DALL-E 3 image generation will fail.");
  }
  if (!LEONARDO_API_KEY) {
    console.warn("Warning: LEONARDO_API_KEY environment variable is not set. Leonardo Phoenix image generation will fail.");
  }
} 