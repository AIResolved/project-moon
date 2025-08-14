import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { 
  TextImageVideoState, 
  VideoGenerationBatch, 
  GeneratedVideo, 
  TextToVideoRequest, 
  ImageToVideoRequest,
  VideoProvider,
  ExtractedVideoScene,
  ScriptSummary
} from '../../../types/text-image-video-generation'

const initialState: TextImageVideoState = {
  // Current generation
  currentBatch: null,
  isGenerating: false,
  error: null,
  generationInfo: null,
  
  // Batch processing
  batchProgress: {
    current: 0,
    total: 0,
    currentBatch: 0,
    totalBatches: 0
  },
  
  // Settings
  selectedProvider: 'replicate',
  selectedModel: 'bytedance/seedance-1-lite',
  defaultDuration: 5,
  batchSize: 5,
  
  // History
  videoHistory: [],
  batches: [],
  selectedVideosForGenerator: [],
  
  // Script-based prompt generation
  scriptBasedPrompts: {
    scriptInput: '',
    numberOfScenesToExtract: 10,
    isExtractingScenes: false,
    sceneExtractionError: null,
    extractedScenes: [],
    selectedScenes: [],
    scriptSummary: null
  },
  
  // Rate limiting
  lastRequest: null,
  remainingRequests: 10 // 10 per minute for replicate
}

export const textImageVideoSlice = createSlice({
  name: 'textImageVideo',
  initialState,
  reducers: {
    // Settings
    setProvider: (state, action: PayloadAction<VideoProvider>) => {
      state.selectedProvider = action.payload
      // Set default model based on provider
      if (action.payload === 'replicate') {
        state.selectedModel = 'bytedance/seedance-1-lite'
        state.remainingRequests = 10
        state.batchSize = 5
      } else if (action.payload === 'fal') {
        state.selectedModel = 'hailuo-02-pro'
        state.remainingRequests = 5
        state.batchSize = 3
      }
      state.lastRequest = null
    },

    setModel: (state, action: PayloadAction<string>) => {
      state.selectedModel = action.payload
    },

    setDefaultDuration: (state, action: PayloadAction<5 | 10>) => {
      state.defaultDuration = action.payload
    },

    setBatchSize: (state, action: PayloadAction<number>) => {
      state.batchSize = Math.max(1, Math.min(10, action.payload))
    },

    // Rate limiting
    updateRateLimit: (state, action: PayloadAction<{ used: number }>) => {
      const now = Date.now()
      const { used } = action.payload
      
      // Reset rate limit if it's been more than a minute
      if (state.lastRequest && now - state.lastRequest > 60000) {
        state.remainingRequests = 10
      }
      
      state.remainingRequests = Math.max(0, state.remainingRequests - used)
      state.lastRequest = now
    },

    // Batch generation lifecycle
    startBatchGeneration: (state, action: PayloadAction<{
      id: string
      requests: (TextToVideoRequest | ImageToVideoRequest)[]
    }>) => {
      const { id, requests } = action.payload
      
      state.currentBatch = {
        id,
        requests,
        videos: [],
        totalVideos: requests.length,
        completedVideos: 0,
        failedVideos: 0,
        status: 'processing',
        startedAt: new Date().toISOString()
      }
      
      state.isGenerating = true
      state.error = null
      state.generationInfo = `Starting generation of ${requests.length} video${requests.length > 1 ? 's' : ''}...`
    },

    updateBatchProgress: (state, action: PayloadAction<{
      current: number
      total: number
      currentBatch: number
      totalBatches: number
    }>) => {
      state.batchProgress = action.payload
    },

    updateGenerationInfo: (state, action: PayloadAction<string>) => {
      state.generationInfo = action.payload
    },

    addVideoToBatch: (state, action: PayloadAction<GeneratedVideo>) => {
      if (state.currentBatch) {
        state.currentBatch.videos.push(action.payload)
        
        if (action.payload.status === 'completed') {
          state.currentBatch.completedVideos++
        } else if (action.payload.status === 'failed') {
          state.currentBatch.failedVideos++
        }
      }
    },

    updateVideoInBatch: (state, action: PayloadAction<{
      videoId: string
      status: 'generating' | 'completed' | 'failed'
      videoUrl?: string
      error?: string
    }>) => {
      const { videoId, status, videoUrl, error } = action.payload
      
      if (state.currentBatch) {
        const videoIndex = state.currentBatch.videos.findIndex(v => v.id === videoId)
        if (videoIndex !== -1) {
          const video = state.currentBatch.videos[videoIndex]
          const oldStatus = video.status
          
          video.status = status
          if (videoUrl) video.videoUrl = videoUrl
          if (error) video.error = error
          
          // Update counters
          if (oldStatus === 'generating') {
            if (status === 'completed') {
              state.currentBatch.completedVideos++
            } else if (status === 'failed') {
              state.currentBatch.failedVideos++
            }
          }
        }
      }
    },

    completeBatchGeneration: (state) => {
      if (state.currentBatch) {
        state.currentBatch.status = 'completed'
        state.currentBatch.completedAt = new Date().toISOString()
        
        // Add all completed videos to history
        const completedVideos = state.currentBatch.videos.filter(v => v.status === 'completed')
        state.videoHistory.unshift(...completedVideos)
        
        // Keep only last 50 videos in history
        state.videoHistory = state.videoHistory.slice(0, 50)
        
        // Add batch to batches history
        state.batches.unshift({ ...state.currentBatch })
        state.batches = state.batches.slice(0, 20) // Keep last 20 batches
      }
      
      state.isGenerating = false
      state.generationInfo = null
      state.error = null
      state.batchProgress = { current: 0, total: 0, currentBatch: 0, totalBatches: 0 }
    },

    failBatchGeneration: (state, action: PayloadAction<string>) => {
      if (state.currentBatch) {
        state.currentBatch.status = 'failed'
        state.currentBatch.completedAt = new Date().toISOString()
        
        // Still add completed videos to history
        const completedVideos = state.currentBatch.videos.filter(v => v.status === 'completed')
        if (completedVideos.length > 0) {
          state.videoHistory.unshift(...completedVideos)
          state.videoHistory = state.videoHistory.slice(0, 50)
        }
        
        // Add batch to batches history
        state.batches.unshift({ ...state.currentBatch })
        state.batches = state.batches.slice(0, 20)
      }
      
      state.isGenerating = false
      state.error = action.payload
      state.generationInfo = null
      state.batchProgress = { current: 0, total: 0, currentBatch: 0, totalBatches: 0 }
    },

    clearError: (state) => {
      state.error = null
    },

    clearCurrentBatch: (state) => {
      state.currentBatch = null
      state.isGenerating = false
      state.error = null
      state.generationInfo = null
      state.batchProgress = { current: 0, total: 0, currentBatch: 0, totalBatches: 0 }
    },

    // History management
    removeVideoFromHistory: (state, action: PayloadAction<string>) => {
      state.videoHistory = state.videoHistory.filter(video => video.id !== action.payload)
    },

    clearVideoHistory: (state) => {
      state.videoHistory = []
    },

    removeBatch: (state, action: PayloadAction<string>) => {
      state.batches = state.batches.filter(batch => batch.id !== action.payload)
    },

    clearBatchHistory: (state) => {
      state.batches = []
    },

    // Load from storage
    loadVideoHistory: (state, action: PayloadAction<GeneratedVideo[]>) => {
      state.videoHistory = action.payload
    },

    loadBatchHistory: (state, action: PayloadAction<VideoGenerationBatch[]>) => {
      state.batches = action.payload
    },

    // Video selection for generator
    addVideoToGenerator: (state, action: PayloadAction<string>) => {
      if (!state.selectedVideosForGenerator.includes(action.payload)) {
        state.selectedVideosForGenerator.push(action.payload)
      }
    },

    removeVideoFromGenerator: (state, action: PayloadAction<string>) => {
      state.selectedVideosForGenerator = state.selectedVideosForGenerator.filter(
        id => id !== action.payload
      )
    },

    toggleVideoForGenerator: (state, action: PayloadAction<string>) => {
      const videoId = action.payload
      if (state.selectedVideosForGenerator.includes(videoId)) {
        state.selectedVideosForGenerator = state.selectedVideosForGenerator.filter(
          id => id !== videoId
        )
      } else {
        state.selectedVideosForGenerator.push(videoId)
      }
    },

    clearSelectedVideosForGenerator: (state) => {
      state.selectedVideosForGenerator = []
    },

    // Script-based prompt reducers
    setScriptInput: (state, action: PayloadAction<string>) => {
      state.scriptBasedPrompts.scriptInput = action.payload
    },

    setNumberOfScenesToExtract: (state, action: PayloadAction<number>) => {
      state.scriptBasedPrompts.numberOfScenesToExtract = Math.max(1, Math.min(50, action.payload))
    },

    startSceneExtraction: (state) => {
      state.scriptBasedPrompts.isExtractingScenes = true
      state.scriptBasedPrompts.sceneExtractionError = null
      state.scriptBasedPrompts.extractedScenes = []
      state.scriptBasedPrompts.selectedScenes = []
    },

    setExtractedScenes: (state, action: PayloadAction<{
      scenes: ExtractedVideoScene[]
      scriptSummary?: ScriptSummary
    }>) => {
      state.scriptBasedPrompts.extractedScenes = action.payload.scenes
      state.scriptBasedPrompts.scriptSummary = action.payload.scriptSummary || null
      state.scriptBasedPrompts.isExtractingScenes = false
      
      // Auto-select all scenes
      state.scriptBasedPrompts.selectedScenes = Array.from(
        { length: action.payload.scenes.length }, 
        (_, i) => i
      )
    },

    setSceneExtractionError: (state, action: PayloadAction<string>) => {
      state.scriptBasedPrompts.sceneExtractionError = action.payload
      state.scriptBasedPrompts.isExtractingScenes = false
    },

    clearSceneExtractionError: (state) => {
      state.scriptBasedPrompts.sceneExtractionError = null
    },

    toggleSceneSelection: (state, action: PayloadAction<number>) => {
      const index = action.payload
      const currentSelection = state.scriptBasedPrompts.selectedScenes
      
      if (currentSelection.includes(index)) {
        state.scriptBasedPrompts.selectedScenes = currentSelection.filter(i => i !== index)
      } else {
        state.scriptBasedPrompts.selectedScenes.push(index)
      }
    },

    updateScenePrompt: (state, action: PayloadAction<{
      index: number
      newPrompt: string
    }>) => {
      const { index, newPrompt } = action.payload
      if (state.scriptBasedPrompts.extractedScenes[index]) {
        state.scriptBasedPrompts.extractedScenes[index].videoPrompt = newPrompt
      }
    },

    addCustomScene: (state, action: PayloadAction<{
      prompt: string
      title: string
    }>) => {
      const { prompt, title } = action.payload
      const newScene: ExtractedVideoScene = {
        chunkIndex: state.scriptBasedPrompts.extractedScenes.length,
        originalText: title,
        videoPrompt: prompt,
        summary: title
      }
      
      state.scriptBasedPrompts.extractedScenes.push(newScene)
      state.scriptBasedPrompts.selectedScenes.push(state.scriptBasedPrompts.extractedScenes.length - 1)
    },

    clearScriptBasedPrompts: (state) => {
      state.scriptBasedPrompts = {
        scriptInput: '',
        numberOfScenesToExtract: 10,
        isExtractingScenes: false,
        sceneExtractionError: null,
        extractedScenes: [],
        selectedScenes: [],
        scriptSummary: null
      }
    }
  }
})

export const {
  setProvider,
  setModel,
  setDefaultDuration,
  setBatchSize,
  updateRateLimit,
  startBatchGeneration,
  updateBatchProgress,
  updateGenerationInfo,
  addVideoToBatch,
  updateVideoInBatch,
  completeBatchGeneration,
  failBatchGeneration,
  clearError,
  clearCurrentBatch,
  removeVideoFromHistory,
  clearVideoHistory,
  removeBatch,
  clearBatchHistory,
  loadVideoHistory,
  loadBatchHistory,
  // Video selection for generator
  addVideoToGenerator,
  removeVideoFromGenerator,
  toggleVideoForGenerator,
  clearSelectedVideosForGenerator,
  // Script-based prompt actions
  setScriptInput,
  setNumberOfScenesToExtract,
  startSceneExtraction,
  setExtractedScenes,
  setSceneExtractionError,
  clearSceneExtractionError,
  toggleSceneSelection,
  updateScenePrompt,
  addCustomScene,
  clearScriptBasedPrompts
} = textImageVideoSlice.actions

export default textImageVideoSlice.reducer 