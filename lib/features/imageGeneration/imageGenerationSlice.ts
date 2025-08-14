import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ImageGenerationState, GeneratedImageSet, ExtractedScene, ImageProvider, MixedContentItem } from '../../../types/image-generation'

const initialState: ImageGenerationState = {
  currentGeneration: null,
  imageSets: [],
  isGenerating: false,
  error: null,
  generationInfo: null,
  // Settings
  selectedModel: 'minimax',
  aspectRatio: '16:9',
  numberOfImages: 1,
  // Scene extraction
  extractedScenes: [],
  isExtractingScenes: false,
  sceneExtractionError: null,
  numberOfScenesToExtract: 5,
  // Rate limiting for flux models
  lastFluxRequest: null,
  remainingFluxRequests: 10, // 10 per minute for flux
  // Image selection for video generation
  confirmedImageSelection: [],
  selectedImagesOrder: [],
  // Mixed content sequence from mixed content generator
  mixedContentSequence: []
}

export const imageGenerationSlice = createSlice({
  name: 'imageGeneration',
  initialState,
  reducers: {
    // Settings
    setSelectedModel: (state, action: PayloadAction<ImageProvider>) => {
      state.selectedModel = action.payload
      // Reset flux rate limiting when switching models
      if (action.payload !== 'minimax') {
        state.remainingFluxRequests = 10
        state.lastFluxRequest = null
      }
    },

    setAspectRatio: (state, action: PayloadAction<'16:9' | '1:1' | '9:16'>) => {
      state.aspectRatio = action.payload
    },
    
    setNumberOfImages: (state, action: PayloadAction<number>) => {
      const maxImages = state.selectedModel === 'minimax' ? 10 : Math.min(10, state.remainingFluxRequests)
      state.numberOfImages = Math.max(1, Math.min(maxImages, action.payload))
    },

    setNumberOfScenesToExtract: (state, action: PayloadAction<number>) => {
      state.numberOfScenesToExtract = Math.max(1, Math.min(100, action.payload))
    },

    // Rate limiting for flux models
    updateFluxRateLimit: (state, action: PayloadAction<{ used: number }>) => {
      const now = Date.now()
      const { used } = action.payload
      
      // Reset rate limit if it's been more than a minute
      if (state.lastFluxRequest && now - state.lastFluxRequest > 60000) {
        state.remainingFluxRequests = 10
      }
      
      state.remainingFluxRequests = Math.max(0, state.remainingFluxRequests - used)
      state.lastFluxRequest = now
    },

    // Scene extraction lifecycle
    startSceneExtraction: (state, action: PayloadAction<{ numberOfScenes: number }>) => {
      state.isExtractingScenes = true
      state.sceneExtractionError = null
      state.extractedScenes = []
    },

    completeSceneExtraction: (state, action: PayloadAction<{ scenes: ExtractedScene[] }>) => {
      state.isExtractingScenes = false
      state.extractedScenes = action.payload.scenes
      state.sceneExtractionError = null
    },

    failSceneExtraction: (state, action: PayloadAction<string>) => {
      state.isExtractingScenes = false
      state.sceneExtractionError = action.payload
    },

    clearExtractedScenes: (state) => {
      state.extractedScenes = []
      state.sceneExtractionError = null
    },

    updateScenePrompt: (state, action: PayloadAction<{ index: number, newPrompt: string }>) => {
      const { index, newPrompt } = action.payload
      if (state.extractedScenes[index]) {
        state.extractedScenes[index].imagePrompt = newPrompt
      }
    },

    addCustomScene: (state, action: PayloadAction<ExtractedScene>) => {
      state.extractedScenes.push(action.payload)
    },

    // Generation lifecycle
    startGeneration: (state, action: PayloadAction<{ 
      id: string
      prompt: string
      finalPrompts: string[]
      numberOfImages: number
      imageStyle?: string
    }>) => {
      const { id, prompt, finalPrompts, numberOfImages, imageStyle } = action.payload
      
      state.currentGeneration = {
        id,
        originalPrompt: prompt,
        finalPrompts: finalPrompts,
        imageUrls: [],
        imageData: [],
        provider: state.selectedModel,
        generatedAt: new Date().toISOString(),
        aspectRatio: state.aspectRatio,
        imageStyle: imageStyle
      }
      state.isGenerating = true
      state.error = null
      state.generationInfo = `Generating ${numberOfImages} image${numberOfImages > 1 ? 's' : ''}...`
    },

    updateGenerationInfo: (state, action: PayloadAction<string>) => {
      state.generationInfo = action.payload
    },

    completeGeneration: (state, action: PayloadAction<{ 
      imageUrls: string[]
    }>) => {
      if (state.currentGeneration) {
        state.currentGeneration.imageUrls = action.payload.imageUrls
        
        // Add to history
        state.imageSets.push({ ...state.currentGeneration })
      }
      
      state.isGenerating = false
      state.generationInfo = null
      state.error = null
    },

    // Add an external image set (e.g., from animation batch results)
    addImageSet: (state, action: PayloadAction<GeneratedImageSet>) => {
      state.imageSets.push(action.payload)
    },

    failGeneration: (state, action: PayloadAction<string>) => {
      state.isGenerating = false
      state.error = action.payload
      state.generationInfo = null
    },

    clearError: (state) => {
      state.error = null
      state.sceneExtractionError = null
    },

    clearImageSets: (state) => {
      state.imageSets = []
    },

    removeImageSet: (state, action: PayloadAction<string>) => {
      state.imageSets = state.imageSets.filter(set => set.id !== action.payload)
    },
    
    // Update individual image within a set (for regeneration)
    updateImageInSet: (state, action: PayloadAction<{ 
      setId: string, 
      imageIndex: number, 
      newImageUrl: string 
    }>) => {
      const { setId, imageIndex, newImageUrl } = action.payload
      const setIndex = state.imageSets.findIndex(set => set.id === setId)
      
      if (setIndex !== -1 && state.imageSets[setIndex].imageUrls[imageIndex]) {
        state.imageSets[setIndex].imageUrls[imageIndex] = newImageUrl
      }
    },
    
    // Image selection for video generation
    setConfirmedImageSelection: (state, action: PayloadAction<string[]>) => {
      state.confirmedImageSelection = action.payload
    },
    clearConfirmedImageSelection: (state) => {
      state.confirmedImageSelection = []
    },
    setSelectedImagesOrder: (state, action: PayloadAction<string[]>) => {
      state.selectedImagesOrder = action.payload
    },
    clearSelectedImagesOrder: (state) => {
      state.selectedImagesOrder = []
    },
    
    // Load from localStorage
    loadImageSets: (state, action: PayloadAction<GeneratedImageSet[]>) => {
      state.imageSets = action.payload
    },
    
    loadConfirmedImageSelection: (state, action: PayloadAction<string[]>) => {
      state.confirmedImageSelection = action.payload
    },
    
    loadSelectedImagesOrder: (state, action: PayloadAction<string[]>) => {
      state.selectedImagesOrder = action.payload
    },

    // Mixed content sequence management
    setMixedContentSequence: (state, action: PayloadAction<MixedContentItem[]>) => {
      state.mixedContentSequence = action.payload.sort((a, b) => a.order - b.order)
    },

    clearMixedContentSequence: (state) => {
      state.mixedContentSequence = []
    }
  }
})

export const { 
  setSelectedModel,
  setAspectRatio,
  setNumberOfImages,
  setNumberOfScenesToExtract,
  updateFluxRateLimit,
  startSceneExtraction,
  completeSceneExtraction,
  failSceneExtraction,
  clearExtractedScenes,
  updateScenePrompt,
  addCustomScene,
  startGeneration,
  updateGenerationInfo,
  completeGeneration,
  addImageSet,
  failGeneration,
  clearError,
  clearImageSets,
  removeImageSet,
  updateImageInSet,
  setConfirmedImageSelection,
  clearConfirmedImageSelection,
  setSelectedImagesOrder,
  clearSelectedImagesOrder,
  loadImageSets,
  loadConfirmedImageSelection,
  loadSelectedImagesOrder,
  setMixedContentSequence,
  clearMixedContentSequence
} = imageGenerationSlice.actions

export default imageGenerationSlice.reducer