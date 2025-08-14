export type ImageProvider =
  | 'minimax'
  | 'flux-dev'
  | 'recraft-v3'
  | 'stable-diffusion-v35-large'
  | 'stable-diffusion-v35-medium'
  | 'dalle-3'
  | 'gpt-image-1'
  | 'leonardo-phoenix'
  | 'ideogram-v3'
  // | 'minimax-image-01';

export interface GenerateImageRequestBody {
  provider: ImageProvider
  prompt: string
  numberOfImages?: number
  outputFormat?: 'url' | 'base64'
  minimaxAspectRatio?: '16:9' | '1:1' | '9:16'
  fluxImageSize?: { width: number; height: number }
  userId?: string
  stylePrefix?: 'esoteric-medieval' | 'dark-demonic' | 'renaissance' | 'gothic' | 'mystical' | 'ancient' | 'occult' | 'none' | ''
  customStylePrefix?: string
  aspectRatio?: '16:9' | '1:1' | '9:16'
}

export interface GenerateImageResponse {
  imageUrls: string[]
}

export interface GeneratedImageSet {
  id: string
  originalPrompt: string
  finalPrompts: string[]
  imageUrls: string[]
  imageData: string[] // base64 data
  provider: ImageProvider
  generatedAt: string
  aspectRatio?: string
  imageStyle?: string
}

export interface ExtractedScene {
  chunkIndex: number
  originalText: string
  imagePrompt: string
  summary: string
  error?: string
}

export interface MixedContentItem {
  id: string
  type: 'animation' | 'image' | 'video'
  title: string
  url: string
  thumbnail: string
  order: number
  source: string
  duration?: number
  prompt?: string
}

export interface ImageGenerationState {
  currentGeneration: GeneratedImageSet | null
  imageSets: GeneratedImageSet[]
  isGenerating: boolean
  error: string | null
  generationInfo: string | null
  // Settings
  selectedModel: ImageProvider
  aspectRatio: '16:9' | '1:1' | '9:16'
  numberOfImages: number
  // Scene extraction
  extractedScenes: ExtractedScene[]
  isExtractingScenes: boolean
  sceneExtractionError: string | null
  numberOfScenesToExtract: number
  // Rate limiting for flux models
  lastFluxRequest: number | null
  remainingFluxRequests: number
  // Image selection for video generation
  confirmedImageSelection: string[]
  selectedImagesOrder: string[]
  // Mixed content sequence from mixed content generator
  mixedContentSequence: MixedContentItem[]
} 