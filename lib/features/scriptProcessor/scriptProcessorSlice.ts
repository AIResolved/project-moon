import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ScriptChunk {
  id: string
  text: string
  wordCount: number
  chunkIndex: number
}

export interface GeneratedPrompt {
  chunkId: string
  prompt: string
  searchQuery: string
  generated: boolean
}

interface ScriptProcessorState {
  pastedScript: string
  fileName: string | null
  visualStyle: string
  mood: string
  lighting: string
  customParameters: string
  chunks: ScriptChunk[]
  selectedSceneCount: number
  maxScenes: number
  prompts: GeneratedPrompt[]
  hasGeneratedPrompts: boolean
  isProcessing: boolean
  processingProgress: number
  lastProcessedAt: string | null
  error: string | null
}

const initialState: ScriptProcessorState = {
  pastedScript: '',
  fileName: null,
  visualStyle: 'photorealistic',
  mood: 'dramatic',
  lighting: 'natural',
  customParameters: '',
  chunks: [],
  selectedSceneCount: 5,
  maxScenes: 20,
  prompts: [],
  hasGeneratedPrompts: false,
  isProcessing: false,
  processingProgress: 0,
  lastProcessedAt: null,
  error: null
}

export const scriptProcessorSlice = createSlice({
  name: 'scriptProcessor',
  initialState,
  reducers: {
    setPastedScript: (state, action: PayloadAction<string>) => {
      state.pastedScript = action.payload
      state.fileName = null // Clear filename when pasting new script
    },
    
    setUploadedFile: (state, action: PayloadAction<string>) => {
      state.fileName = action.payload
    },
    
    setVisualStyle: (state, action: PayloadAction<string>) => {
      state.visualStyle = action.payload
    },
    
    setMood: (state, action: PayloadAction<string>) => {
      state.mood = action.payload
    },
    
    setLighting: (state, action: PayloadAction<string>) => {
      state.lighting = action.payload
    },
    
    setCustomParameters: (state, action: PayloadAction<string>) => {
      state.customParameters = action.payload
    },
    
    setChunks: (state, action: PayloadAction<ScriptChunk[]>) => {
      state.chunks = action.payload
    },
    
    setSelectedSceneCount: (state, action: PayloadAction<number>) => {
      state.selectedSceneCount = action.payload
      state.maxScenes = Math.max(state.maxScenes, action.payload)
    },
    
    startProcessing: (state) => {
      state.isProcessing = true
      state.processingProgress = 0
      state.error = null
    },
    
    updateProcessingProgress: (state, action: PayloadAction<number>) => {
      state.processingProgress = action.payload
    },
    
    setPrompts: (state, action: PayloadAction<GeneratedPrompt[]>) => {
      state.prompts = action.payload
      state.hasGeneratedPrompts = action.payload.length > 0
    },
    
    updatePrompt: (state, action: PayloadAction<GeneratedPrompt>) => {
      const index = state.prompts.findIndex(p => p.chunkId === action.payload.chunkId)
      if (index !== -1) {
        state.prompts[index] = action.payload
      } else {
        state.prompts.push(action.payload)
      }
      state.hasGeneratedPrompts = state.prompts.length > 0
    },
    
    completeProcessing: (state) => {
      state.isProcessing = false
      state.processingProgress = 100
      state.lastProcessedAt = new Date().toISOString()
    },
    
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isProcessing = false
    },
    
    clearError: (state) => {
      state.error = null
    },
    
    clearScript: (state) => {
      state.pastedScript = ''
      state.fileName = null
      state.chunks = []
      state.prompts = []
      state.hasGeneratedPrompts = false
      state.isProcessing = false
      state.processingProgress = 0
      state.error = null
    }
  }
})

export const {
  setPastedScript,
  setUploadedFile,
  setVisualStyle,
  setMood,
  setLighting,
  setCustomParameters,
  setChunks,
  setSelectedSceneCount,
  startProcessing,
  updateProcessingProgress,
  setPrompts,
  updatePrompt,
  completeProcessing,
  setError,
  clearError,
  clearScript
} = scriptProcessorSlice.actions

export default scriptProcessorSlice.reducer