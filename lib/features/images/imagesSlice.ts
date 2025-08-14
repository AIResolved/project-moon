import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ProcessedImage {
  id: string
  name: string
  originalName: string
  dataUrl: string
  processed: boolean
  chapter?: number // Chapter number extracted from filename
  imageNumber?: number // Image number within the chapter
  sortOrder?: number // Overall sort order (1, 2, 3, etc.)
  supabasePath?: string // Path where image is saved in Supabase storage
  savedToSupabase?: boolean // Whether image has been saved to Supabase
}

interface ImagesState {
  originalImages: ProcessedImage[]
  currentImages: ProcessedImage[]
  selectedColor: string
  hasProcessedImages: boolean
  savedImagesCount: number // Count of images saved to Supabase
}

const initialState: ImagesState = {
  originalImages: [],
  currentImages: [],
  selectedColor: '#ffffff',
  hasProcessedImages: false,
  savedImagesCount: 0
}

export const imagesSlice = createSlice({
  name: 'images',
  initialState,
  reducers: {
    setOriginalImages: (state, action: PayloadAction<ProcessedImage[]>) => {
      state.originalImages = action.payload
      state.currentImages = action.payload // Initially, current = original
      state.hasProcessedImages = action.payload.length > 0
      // Reset saved count when new images are loaded
      state.savedImagesCount = 0
    },
    
    setCurrentImages: (state, action: PayloadAction<ProcessedImage[]>) => {
      state.currentImages = action.payload
    },
    
    setSelectedColor: (state, action: PayloadAction<string>) => {
      state.selectedColor = action.payload
    },
    
    // Update Supabase path for a specific image
    updateImageSupabasePath: (state, action: PayloadAction<{ imageId: string; supabasePath: string }>) => {
      const { imageId, supabasePath } = action.payload
      
      // Update original images
      const originalImage = state.originalImages.find(img => img.id === imageId)
      if (originalImage) {
        originalImage.supabasePath = supabasePath
        originalImage.savedToSupabase = true
      }
      
      // Update current images
      const currentImage = state.currentImages.find(img => img.id === imageId)
      if (currentImage) {
        currentImage.supabasePath = supabasePath
        currentImage.savedToSupabase = true
      }
      
      // Update saved count
      state.savedImagesCount = state.originalImages.filter(img => img.savedToSupabase).length
    },
    
    // Bulk update Supabase paths
    updateMultipleSupabasePaths: (state, action: PayloadAction<Array<{ imageId: string; supabasePath: string }>>) => {
      action.payload.forEach(({ imageId, supabasePath }) => {
        // Update original images
        const originalImage = state.originalImages.find(img => img.id === imageId)
        if (originalImage) {
          originalImage.supabasePath = supabasePath
          originalImage.savedToSupabase = true
        }
        
        // Update current images
        const currentImage = state.currentImages.find(img => img.id === imageId)
        if (currentImage) {
          currentImage.supabasePath = supabasePath
          currentImage.savedToSupabase = true
        }
      })
      
      // Update saved count
      state.savedImagesCount = state.originalImages.filter(img => img.savedToSupabase).length
    },
    
    clearImages: (state) => {
      state.originalImages = []
      state.currentImages = []
      state.hasProcessedImages = false
      state.selectedColor = '#ffffff'
      state.savedImagesCount = 0
    },
    
    // Reset current images to original (useful when applying new backgrounds)
    resetToOriginal: (state) => {
      state.currentImages = state.originalImages
    }
  }
})

export const { 
  setOriginalImages, 
  setCurrentImages, 
  setSelectedColor, 
  updateImageSupabasePath,
  updateMultipleSupabasePaths,
  clearImages, 
  resetToOriginal 
} = imagesSlice.actions

export default imagesSlice.reducer 