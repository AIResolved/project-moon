import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { VideoRecord, VideoGenerationSettings } from '@/types/video-generation'

interface VideoState {
  currentGeneration: VideoRecord | null
  generationHistory: VideoRecord[]
  isGeneratingVideo: boolean
  settings: VideoGenerationSettings
  statusRefreshInterval: number | null
  selectedVideosForGeneration: string[] // Array of video IDs selected for video generation
}

const initialState: VideoState = {
  currentGeneration: null,
  generationHistory: [],
  isGeneratingVideo: false,
  settings: {
    useSegmentedTiming: false,
    useScriptBasedTiming: false,
    videoQuality: 'hd',
    includeSubtitles: true,
    includeOverlay: false,
    videoMode: 'traditional',
    zoomEffect: false,
    dustOverlay: false,
    snowOverlay: false,
    screenDisplacementOverlay: false,
    fireOverlay: false,
    introDuration: 60, // 1 minute default
    useEqualIntroDuration: true,
    useCustomMusic: false,
    customMusicFiles: [],
    selectedMusicTracks: [],
    voiceoverVolume: 0.8,
    musicVolume: 0.3
  },
  statusRefreshInterval: null,
  selectedVideosForGeneration: []
}

export const videoSlice = createSlice({
  name: 'video',
  initialState,
  reducers: {
    setVideoSettings: (state, action: PayloadAction<Partial<VideoGenerationSettings>>) => {
      state.settings = { ...state.settings, ...action.payload }
    },
    
    setIsGeneratingVideo: (state, action: PayloadAction<boolean>) => {
      state.isGeneratingVideo = action.payload
    },
    
    startVideoGeneration: (state, action: PayloadAction<VideoRecord>) => {
      state.currentGeneration = action.payload
      state.isGeneratingVideo = true
    },
    
    updateVideoStatus: (state, action: PayloadAction<{ videoId: string; status: VideoRecord['status']; videoUrl?: string; errorMessage?: string }>) => {
      const { videoId, status, videoUrl, errorMessage } = action.payload
      
      // Update current generation if it matches
      if (state.currentGeneration?.id === videoId) {
        state.currentGeneration.status = status
        state.currentGeneration.updated_at = new Date().toISOString()
        
        if (videoUrl) {
          state.currentGeneration.final_video_url = videoUrl
        }
        
        if (errorMessage) {
          state.currentGeneration.error_message = errorMessage
        }
        
        // If completed or failed, stop generating flag
        if (status === 'completed' || status === 'failed') {
          state.isGeneratingVideo = false
        }
      }
      
      // Update in history if exists
      const historyIndex = state.generationHistory.findIndex(video => video.id === videoId)
      if (historyIndex !== -1) {
        state.generationHistory[historyIndex].status = status
        state.generationHistory[historyIndex].updated_at = new Date().toISOString()
        
        if (videoUrl) {
          state.generationHistory[historyIndex].final_video_url = videoUrl
        }
        
        if (errorMessage) {
          state.generationHistory[historyIndex].error_message = errorMessage
        }
      }
    },
    
    completeVideoGeneration: (state, action: PayloadAction<{ videoUrl: string; videoId: string }>) => {
      const { videoUrl, videoId } = action.payload
      
      if (state.currentGeneration?.id === videoId) {
        state.currentGeneration.status = 'completed'
        state.currentGeneration.final_video_url = videoUrl
        state.currentGeneration.updated_at = new Date().toISOString()
      }
      
      state.isGeneratingVideo = false
    },
    
    setVideoGenerationError: (state, action: PayloadAction<{ videoId: string; error: string }>) => {
      const { videoId, error } = action.payload
      
      if (state.currentGeneration?.id === videoId) {
        state.currentGeneration.status = 'failed'
        state.currentGeneration.error_message = error
        state.currentGeneration.updated_at = new Date().toISOString()
      }
      
      state.isGeneratingVideo = false
    },
    
    saveVideoToHistory: (state, action: PayloadAction<VideoRecord>) => {
      const video = action.payload
      
      // Check if already in history
      const existingIndex = state.generationHistory.findIndex(v => v.id === video.id)
      
      if (existingIndex !== -1) {
        // Update existing
        state.generationHistory[existingIndex] = video
      } else {
        // Add new to beginning
        state.generationHistory.unshift(video)
        // Keep only last 20 videos
        state.generationHistory = state.generationHistory.slice(0, 20)
      }
    },
    
    loadVideoHistory: (state, action: PayloadAction<VideoRecord[]>) => {
      state.generationHistory = action.payload
    },
    
    clearCurrentGeneration: (state) => {
      state.currentGeneration = null
      state.isGeneratingVideo = false
    },
    
    setStatusRefreshInterval: (state, action: PayloadAction<number | null>) => {
      state.statusRefreshInterval = action.payload
    },
    
    clearAllVideoData: (state) => {
      state.currentGeneration = null
      state.generationHistory = []
      state.isGeneratingVideo = false
      state.selectedVideosForGeneration = []
      if (state.statusRefreshInterval) {
        clearInterval(state.statusRefreshInterval)
        state.statusRefreshInterval = null
      }
    },

    // Selected videos for generation management
    addVideoToSelection: (state, action: PayloadAction<string>) => {
      const videoId = action.payload
      if (!state.selectedVideosForGeneration.includes(videoId)) {
        state.selectedVideosForGeneration.push(videoId)
      }
    },

    removeVideoFromSelection: (state, action: PayloadAction<string>) => {
      const videoId = action.payload
      state.selectedVideosForGeneration = state.selectedVideosForGeneration.filter(id => id !== videoId)
    },

    toggleVideoSelection: (state, action: PayloadAction<string>) => {
      const videoId = action.payload
      const index = state.selectedVideosForGeneration.indexOf(videoId)
      if (index > -1) {
        state.selectedVideosForGeneration.splice(index, 1)
      } else {
        state.selectedVideosForGeneration.push(videoId)
      }
    },

    setSelectedVideos: (state, action: PayloadAction<string[]>) => {
      state.selectedVideosForGeneration = action.payload
    },

    clearSelectedVideos: (state) => {
      state.selectedVideosForGeneration = []
    }
  }
})

export const {
  setVideoSettings,
  setIsGeneratingVideo,
  startVideoGeneration,
  updateVideoStatus,
  completeVideoGeneration,
  setVideoGenerationError,
  saveVideoToHistory,
  loadVideoHistory,
  clearCurrentGeneration,
  setStatusRefreshInterval,
  clearAllVideoData,
  addVideoToSelection,
  removeVideoFromSelection,
  toggleVideoSelection,
  setSelectedVideos,
  clearSelectedVideos
} = videoSlice.actions

export default videoSlice.reducer 