import { ImageProvider } from "@/types/image-generation";

export const MODEL_INFO: Record<ImageProvider, {
    name: string;
    description: string;
    batchSize: number;
    rateLimit?: string;
    features: string[];
  }> = {
    'minimax': {
      name: 'MiniMax',
      description: 'Fast, reliable image generation with optimized prompts',
      batchSize: 5,
      features: ['Base64 output', 'Prompt optimization', 'Multiple aspect ratios']
    },
    'flux-dev': {
      name: 'FLUX.1 [dev]',
      description: '12B parameter flow transformer for high-quality images',
      batchSize: 10,
      rateLimit: '10/min per batch',
      features: ['High quality', 'Commercial use', 'Advanced prompting']
    },
    'recraft-v3': {
      name: 'Recraft V3',
      description: 'SOTA model with long text, vector art, and brand style',
      batchSize: 10,
      rateLimit: '10/min per batch',
      features: ['Long texts', 'Vector art', 'Brand styles', 'SOTA quality']
    },
    'stable-diffusion-v35-large': {
      name: 'Stable Diffusion 3.5 Large',
      description: 'MMDiT model with improved typography and efficiency',
      batchSize: 10,
      rateLimit: '10/min per batch',
      features: ['Typography', 'Complex prompts', 'Resource efficient']
    },
    'stable-diffusion-v35-medium': {
      name: 'Stable Diffusion 3.5 Medium',
      description: 'MMDiT model with improved typography and efficiency',
      batchSize: 10,
      rateLimit: '10/min per batch',
      features: ['Typography', 'Complex prompts', 'Resource efficient']
    },
    'dalle-3': {
      name: 'DALL-E 3',
      description: 'OpenAI\'s most advanced image generation model',
      batchSize: 10,
      rateLimit: '10/min per batch',
      features: ['High quality', 'Text understanding', 'Creative interpretation', 'Base64 output']
    },
    'gpt-image-1': {
      name: 'GPT Image 1',
      description: 'OpenAI\'s newest image generation model with enhanced instruction following',
      batchSize: 5,
      rateLimit: '5/min per batch',
      features: ['Superior instruction following', 'Photorealistic images', 'World knowledge', 'Enhanced quality', 'Base64 output']
    },
    'leonardo-phoenix': {
      name: 'Leonardo Phoenix',
      description: 'Leonardo\'s Phoenix model with enhanced contrast and quality',
      batchSize: 10,
      rateLimit: '6/min per batch',
      features: ['High contrast', 'Enhanced quality', 'Style control', 'Alchemy pipeline']
    },
    'ideogram-v3': {
      name: 'Ideogram V3',
      description: 'Ideogram V3 via fal.ai, turbo mode for fast, high-quality images with advanced typography',
      batchSize: 10,
      rateLimit: '10/min per batch',
      features: ['Turbo mode', 'Advanced typography', 'High quality', 'Commercial use', 'Via fal.ai']
    },
    // 'minimax-image-01': {
    //   name: 'MiniMax Image 01',
    //   description: 'MiniMax\'s latest image generation model with enhanced quality and realism',
    //   batchSize: 10,
    //   rateLimit: '10/min per batch',
    //   features: ['High quality', 'Realism', 'Enhanced quality', 'Base64 output']
    // }
    'search': {
      name: 'Search Stock Images',
      description: 'Search Pexels and Pixabay for stock photos using AI-generated queries',
      batchSize: 20,
      rateLimit: '100/min per batch',
      features: ['Stock photos', 'Multiple sources', 'Fast results', 'High quality', 'Commercial use']
    }
  }

// Image Style Categories
export const IMAGE_STYLES = {
  realistic: {
    name: 'Realistic',
    description: 'Photorealistic style',
    prefix: 'photorealistic, high-quality photography, professional lighting, '
  },
  artistic: {
    name: 'Artistic',
    description: 'Creative, painterly style',
    prefix: 'artistic painting style, creative brushwork, expressive colors, '
  },
  cinematic: {
    name: 'Cinematic',
    description: 'Movie-like composition',
    prefix: 'cinematic composition, movie-style framing, dramatic perspective, '
  },
  animation: {
    name: 'Animation',
    description: '3D/cartoon style',
    prefix: '3D rendered animation style, cartoon-like characters, vibrant colors, '
  },
  graphic: {
    name: 'Graphic',
    description: 'Bold, graphic design style',
    prefix: 'bold graphic design style, clean lines, modern aesthetics, '
  },
  fantasy: {
    name: 'Fantasy',
    description: 'Fantasy art style',
    prefix: 'fantasy art style, magical atmosphere, ethereal elements, '
  }
}

// Lighting Tone Options
export const LIGHTING_TONES = {
  light: {
    name: 'Light',
    description: 'Bright, well-lit scenes',
    prefix: 'bright lighting, well-lit scene, soft natural light, '
  },
  balanced: {
    name: 'Balanced',
    description: 'Natural lighting (default)',
    prefix: 'balanced natural lighting, '
  },
  dark: {
    name: 'Dark',
    description: 'Dramatic, darker scenes',
    prefix: 'dramatic dark lighting, moody atmosphere, low-key lighting, '
  }
}

// Legacy IMAGE_STYLES array for backward compatibility
export const LEGACY_IMAGE_STYLES = [
  { value: 'none', label: 'No specific style', prefix: '' },
  { value: 'ancient-beige-paper-ink', label: 'Ancient beige paper ink illustration style', prefix: 'Ancient beige paper ink illustration style, ' },
  { value: 'ancient-beige-paper-book', label: 'Ancient beige paper ink illustration from an ancient book', prefix: 'Ancient beige paper ink illustration from an ancient book, ' },
  { value: 'esoteric-1400s', label: 'Esoteric 1400s drawing style', prefix: 'Esoteric 1400s drawing style, ' },
  { value: 'medieval', label: 'Medieval drawing style', prefix: 'Medieval drawing style, ' },
  { value: 'oil-painting', label: 'Oil painting style', prefix: 'Oil painting style, ' },
  { value: 'ary-scheffer', label: "Ary Scheffer's painting depicting style", prefix: "Ary Scheffer's painting depicting style, " },
  { value: 'pieter-jansz', label: 'Pieter-Jansz van Asch painting style', prefix: 'Pieter-Jansz van Asch painting style, ' },
  { value: 'black-white', label: 'Black & White', prefix: 'Black & White, ' },
  { value: 'ancient-egyptian', label: 'Ancient Egyptian art style', prefix: 'Ancient Egyptian art style, ' },
  { value: 'modern-symbolist', label: 'Modern Symbolist/Esoteric Art style', prefix: 'Modern Symbolist/Esoteric Art style, ' },
  { value: 'northern-renaissance', label: 'Northern Renaissance engraving style', prefix: 'Northern Renaissance engraving style, ' }
]