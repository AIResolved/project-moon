export interface TextToVideoRequest {
  prompt: string
  duration: 5 | 10
  provider: VideoProvider
  model: string
  // FAL AI specific parameters
  aspect_ratio?: '16:9' | '9:16' | '1:1'
  fps?: number
  seed?: number
  guidance_scale?: number
  num_inference_steps?: number
}

export interface ImageToVideoRequest {
  prompt: string
  image?: string // base64 encoded image (for replicate)
  image_url?: string // URL for FAL AI
  duration: number
  provider: VideoProvider
  model: string
  // FAL AI specific parameters
  fps?: number
  motion_strength?: number
  seed?: number
}

export interface GeneratedVideo {
  id: string
  type: 'text-to-video' | 'image-to-video'
  prompt: string
  imageInput?: string // base64 for image-to-video (replicate)
  imageUrl?: string // URL for image-to-video (FAL AI)
  duration: number
  videoUrl: string
  provider: VideoProvider
  model: string
  generatedAt: string
  status: 'generating' | 'completed' | 'failed'
  error?: string
  requestId?: string // FAL AI request ID
}

export interface VideoGenerationBatch {
  id: string
  requests: (TextToVideoRequest | ImageToVideoRequest)[]
  videos: GeneratedVideo[]
  totalVideos: number
  completedVideos: number
  failedVideos: number
  status: 'processing' | 'completed' | 'failed'
  startedAt: string
  completedAt?: string
}

export interface ExtractedVideoScene {
  chunkIndex: number
  originalText: string
  videoPrompt: string
  searchQuery: string
  summary: string
  error?: string
}

export interface ScriptSummary {
  storySummary: string
  mainCharacters: string
  setting: string
  tone: string
}

export interface ScriptBasedPromptState {
  scriptInput: string
  numberOfScenesToExtract: number
  isExtractingScenes: boolean
  sceneExtractionError: string | null
  extractedScenes: ExtractedVideoScene[]
  selectedScenes: number[]
  scriptSummary: ScriptSummary | null
}

export interface TextImageVideoState {
  // Current generation
  currentBatch: VideoGenerationBatch | null
  isGenerating: boolean
  error: string | null
  generationInfo: string | null
  
  // Batch processing
  batchProgress: {
    current: number
    total: number
    currentBatch: number
    totalBatches: number
  }
  
  // Settings
  selectedProvider: VideoProvider
  selectedModel: string
  defaultDuration: number
  batchSize: number
  
  // History
  videoHistory: GeneratedVideo[]
  batches: VideoGenerationBatch[]
  selectedVideosForGenerator: string[] // IDs of videos selected for video generator
  
  // Script-based prompt generation
  scriptBasedPrompts: ScriptBasedPromptState
  
  // Rate limiting
  lastRequest: number | null
  remainingRequests: number
}

export interface ReplicateVideoResponse {
  id: string
  urls: {
    get: string
    cancel: string
  }
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string | string[]
  error?: string
  logs?: string
}

// Provider model configurations
export const VIDEO_PROVIDERS = {
  replicate: {
    name: 'Replicate',
    description: 'High-quality text and image to video generation',
    batchSize: 5,
    rateLimitPerMinute: 10,
    textToVideoModels: {
      'bytedance/seedance-1-lite': {
        name: 'SeeDance-1 Lite',
        description: 'Fast video generation from text',
        maxDuration: 10,
        supportedDurations: [5, 10]
      }
    },
    imageToVideoModels: {
      'bytedance/seedance-1-lite': {
        name: 'SeeDance-1 Lite',
        description: 'Fast video generation from images',
        maxDuration: 10,
        supportedDurations: [5, 10]
      }
    }
  },
  fal: {
    name: 'FAL AI',
    description: 'Advanced AI video generation with multiple models',
    batchSize: 3,
    rateLimitPerMinute: 5,
    textToVideoModels: {
      'hailuo-02-pro': {
        name: 'Minimax Hailuo 02 Pro',
        description: 'High-quality text-to-video generation',
        maxDuration: 10,
        supportedDurations: [5, 10],
        supportedAspectRatios: ['16:9', '9:16', '1:1']
      },
      'kling-v2.1-master': {  
        name: 'Kling Video v2.1 Master',
        description: 'High-quality cinematic video generation',
        maxDuration: 10,
        supportedDurations: [5, 10],
        supportedAspectRatios: ['16:9', '9:16', '1:1']
      }
    },
    imageToVideoModels: {
      'bytedance-seedance-v1-pro': {
        name: 'ByteDance SeedAnce V1 Pro',
        description: 'High-quality image-to-video animation by ByteDance',
        maxDuration: 10,
        supportedDurations: [4, 6, 8, 10],
        defaultDuration: 6
      },
      'pixverse-v4.5': {
        name: 'Pixverse V4.5',
        description: 'Advanced image-to-video generation with smooth motion',
        maxDuration: 8,
        supportedDurations: [5, 8],
        defaultDuration: 5
      },
      'wan-v2.2-5b': {
        name: 'WAN V2.2-5B',
        description: 'Animate images with detailed motion control',
        maxDuration: 10,
        supportedDurations: [4, 5],
        defaultDuration: 5
      }
    }
  },
  google: {
    name: 'Google GenAI (Veo)',
    description: 'Google Veo for text and image to video',
    batchSize: 1,
    rateLimitPerMinute: 2,
    textToVideoModels: {
      'veo-3.0-generate-preview': {
        name: 'Veo 3.0 Preview',
        description: 'Google Veo preview model',
        maxDuration: 10,
        supportedDurations: [5, 10],
        supportedAspectRatios: ['16:9', '9:16', '1:1']
      }
    },
    imageToVideoModels: {}
  },
  search: {
    name: 'Search Stock Videos',
    description: 'Search Pexels and Pixabay for stock videos using AI-generated queries',
    batchSize: 20,
    rateLimitPerMinute: 100,
    textToVideoModels: {
      'pexels-pixabay-search': {
        name: 'Stock Video Search',
        description: 'Search for stock videos from Pexels and Pixabay',
        maxDuration: 30,
        supportedDurations: [5, 10, 15, 30],
        supportedAspectRatios: ['16:9', '9:16', '1:1']
      }
    },
    imageToVideoModels: {}
  }
} as const

export type VideoProvider = keyof typeof VIDEO_PROVIDERS
export type ReplicateTextModel = keyof typeof VIDEO_PROVIDERS.replicate.textToVideoModels
export type ReplicateImageModel = keyof typeof VIDEO_PROVIDERS.replicate.imageToVideoModels
export type FalTextModel = keyof typeof VIDEO_PROVIDERS.fal.textToVideoModels
export type FalImageModel = keyof typeof VIDEO_PROVIDERS.fal.imageToVideoModels

export type TextToVideoModel = ReplicateTextModel | FalTextModel
export type ImageToVideoModel = ReplicateImageModel | FalImageModel 