import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ProgressState {
  // Script generation progress
  scriptGeneration: {
    isActive: boolean
    total: number
    completed: number
    currentImage: string
    completedImages: string[]
    currentBatch: number
    totalBatches: number
    batchProgress: number
    timeUntilNextBatch?: number
  }
  
  // Image saving progress
  imageSaving: {
    isActive: boolean
    total: number
    completed: number
    currentImage: string
    completedImages: string[]
  }
}

const initialState: ProgressState = {
  scriptGeneration: {
    isActive: false,
    total: 0,
    completed: 0,
    currentImage: '',
    completedImages: [],
    currentBatch: 0,
    totalBatches: 0,
    batchProgress: 0,
    timeUntilNextBatch: 0
  },
  imageSaving: {
    isActive: false,
    total: 0,
    completed: 0,
    currentImage: '',
    completedImages: []
  }
}

export const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    // Script Generation Progress Actions
    startScriptGeneration: (state, action: PayloadAction<{ total: number; totalBatches: number }>) => {
      state.scriptGeneration.isActive = true
      state.scriptGeneration.total = action.payload.total
      state.scriptGeneration.totalBatches = action.payload.totalBatches
      state.scriptGeneration.completed = 0
      state.scriptGeneration.currentImage = ''
      state.scriptGeneration.completedImages = []
      state.scriptGeneration.currentBatch = 0
      state.scriptGeneration.batchProgress = 0
      state.scriptGeneration.timeUntilNextBatch = 0
    },
    
    updateScriptGenerationProgress: (state, action: PayloadAction<{
      completed?: number
      currentImage?: string
      completedImages?: string[]
      currentBatch?: number
      batchProgress?: number
      timeUntilNextBatch?: number
    }>) => {
      const { completed, currentImage, completedImages, currentBatch, batchProgress, timeUntilNextBatch } = action.payload
      
      if (completed !== undefined) state.scriptGeneration.completed = completed
      if (currentImage !== undefined) state.scriptGeneration.currentImage = currentImage
      if (completedImages !== undefined) state.scriptGeneration.completedImages = completedImages
      if (currentBatch !== undefined) state.scriptGeneration.currentBatch = currentBatch
      if (batchProgress !== undefined) state.scriptGeneration.batchProgress = batchProgress
      if (timeUntilNextBatch !== undefined) state.scriptGeneration.timeUntilNextBatch = timeUntilNextBatch
    },
    
    finishScriptGeneration: (state) => {
      state.scriptGeneration.isActive = false
      // Keep the final state for a while, then clear in component with setTimeout
    },
    
    clearScriptGenerationProgress: (state) => {
      state.scriptGeneration = initialState.scriptGeneration
    },
    
    // Image Saving Progress Actions
    startImageSaving: (state, action: PayloadAction<{ total: number }>) => {
      state.imageSaving.isActive = true
      state.imageSaving.total = action.payload.total
      state.imageSaving.completed = 0
      state.imageSaving.currentImage = ''
      state.imageSaving.completedImages = []
    },
    
    updateImageSavingProgress: (state, action: PayloadAction<{
      completed?: number
      currentImage?: string
      completedImages?: string[]
    }>) => {
      const { completed, currentImage, completedImages } = action.payload
      
      if (completed !== undefined) state.imageSaving.completed = completed
      if (currentImage !== undefined) state.imageSaving.currentImage = currentImage
      if (completedImages !== undefined) state.imageSaving.completedImages = completedImages
    },
    
    finishImageSaving: (state) => {
      state.imageSaving.isActive = false
      // Keep the final state for a while, then clear in component with setTimeout
    },
    
    clearImageSavingProgress: (state) => {
      state.imageSaving = initialState.imageSaving
    }
  }
})

export const {
  startScriptGeneration,
  updateScriptGenerationProgress,
  finishScriptGeneration,
  clearScriptGenerationProgress,
  startImageSaving,
  updateImageSavingProgress,
  finishImageSaving,
  clearImageSavingProgress
} = progressSlice.actions

export default progressSlice.reducer 