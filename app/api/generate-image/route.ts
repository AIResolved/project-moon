import { NextRequest, NextResponse } from 'next/server';
import { GenerateImageRequestBody, GenerateImageResponse } from '@/types/image-generation';
import { fal } from "@fal-ai/client";
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const FAL_API_KEY = process.env.FAL_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LEONARDO_API_KEY = process.env.LEONARDO_API_KEY;
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
  const filePath = `audio/${provider}/${Date.now()}-${sanitizedPrompt}.${fileType}`;

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

  console.log('filePath', filePath);
  const { data } = supabase.storage.from('audio').getPublicUrl(filePath);
  console.log('data', data);
  return data.publicUrl;
}

// Get image dimensions based on aspect ratio
const getImageDimensions = (aspectRatio: '16:9' | '1:1' | '9:16') => {
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
      enable_safety_checker: false,
      // Add mode for Ideogram v3 (turbo mode)
      ...(provider === 'ideogram-v3' && { mode: 'turbo' })
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
  const body: GenerateImageRequestBody = await request.json();
  const { 
    provider: bodyProvider, 
    prompt, 
    aspectRatio = '16:9', 
    userId 
  } = body;
  let provider = bodyProvider;

  try {
    console.log(`🖼️ Received ${provider} image generation request: userId=${userId}, prompt=${prompt.substring(0, 50)}...`);

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    console.log(`🎨 Received styled prompt: ${prompt.substring(0, 150)}...`);

    // Check API keys based on provider
    if (['flux-dev', 'recraft-v3', 'stable-diffusion-v35-large', 'stable-diffusion-v35-medium', 'ideogram-v3', 'minimax-image-01'].includes(provider) && !FAL_API_KEY) {
      return NextResponse.json({ error: 'FAL API key is not configured for flux models.' }, { status: 500 });
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

    // Main logic
    let imageUrl: string;
    const { width, height } = getImageDimensions(aspectRatio);

    switch (provider) {
      case 'flux-dev':
      case 'recraft-v3':
      case 'stable-diffusion-v35-large':
      case 'stable-diffusion-v35-medium':
      case 'ideogram-v3':
      // case 'minimax-image-01':
        if (!FAL_API_KEY) throw new Error('FAL_API_KEY is not set');
        imageUrl = await generateFluxImage(provider, prompt, { width, height });
        break;

      case 'gpt-image-1':
        if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
        const gptSize = aspectRatio === '16:9' ? '1536x1024' : aspectRatio === '9:16' ? '1024x1536' : '1024x1024';
        imageUrl = await generateGPTImage1(prompt, gptSize);
        break;

      case 'dalle-3':
        if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
        const dalleSize = aspectRatio === '16:9' ? '1792x1024' : aspectRatio === '9:16' ? '1024x1792' : '1024x1024';
        imageUrl = await generateDalleImage(prompt, dalleSize);
        break;
      
      case 'leonardo-phoenix':
        if (!LEONARDO_API_KEY) throw new Error('LEONARDO_API_KEY is not set');
        imageUrl = await generateLeonardoPhoenixImage(prompt, width, height);
        break;

      default:
        return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
    }

    console.log(`✅ ${provider} image generation complete.`);
    
    // Return the direct image URL without uploading to Supabase
    // Users will manually select and save the images they want later
    const responsePayload: GenerateImageResponse = { imageUrls: [imageUrl] };
    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error: any) {
    console.error(`❌ Error in image generation route for provider ${provider}:`, error);
    return NextResponse.json({
      error: error.message || 'Failed to generate image'
    }, {
      status: 500
    });
  }
}

// Environment variable check
if (process.env.NODE_ENV !== 'test') {
  if (!FAL_API_KEY) {
    console.warn("Warning: FAL_API_KEY environment variable is not set. Flux model generation will fail.");
  }
  if (!OPENAI_API_KEY) {
    console.warn("Warning: OPENAI_API_KEY environment variable is not set. DALL-E 3 and GPT Image 1 generation will fail.");
  }
  if (!LEONARDO_API_KEY) {
    console.warn("Warning: LEONARDO_API_KEY environment variable is not set. Leonardo Phoenix image generation will fail.");
  }
} 