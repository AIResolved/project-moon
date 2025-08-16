import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface AIVoice {
  id: number
  created_at: string
  name: string
  provider: string
  voice_id: string
}

export interface AudioGeneration {
  id: string
  audioUrl: string | null
  compressedAudioUrl: string | null
  subtitlesUrl: string | null
  subtitlesContent: string | null
  duration: number | null
  generatedAt: string
  voice: number
  model: string
  generateSubtitles: boolean
  status: 'idle' | 'generating' | 'completed' | 'error'
  error: string | null
  scriptDurations?: Array<{
    scriptId: string
    imageId: string
    imageName: string
    duration: number
    startTime: number
  }>
}

interface BatchState {
  currentBatchIndex: number
  totalBatches: number
  batchSize: number
  isWaiting: boolean
  waitUntil: number | null
  waitTimeMs: number
  lastBatchStartTime: number | null
  processedChunks: number
}

interface AudioState {
  currentGeneration: AudioGeneration | null
  generationHistory: AudioGeneration[]
  isGeneratingAudio: boolean
  isGeneratingSubtitles: boolean
  audioProgress: {
    total: number
    completed: number
    phase: 'idle' | 'batching' | 'waiting' | 'finalizing' | 'completed'
  }
  batchState: BatchState
  textToProcess: string | null
  textChunks: string[]
  successfulChunkUrls: string[]
  selectedVoice: number
  selectedModel: string
  generateSubtitles: boolean
  // Voice management
  customVoices: AIVoice[]
  isLoadingVoices: boolean
  isManagingVoice: boolean
  voiceManagementError: string | null
  voiceFormData: {
    id?: number
    name: string
    provider: string
    voice_id: string
  }
  showVoiceForm: boolean
  editingVoiceId: number | null
}

const initialBatchState: BatchState = {
  currentBatchIndex: 0,
  totalBatches: 0,
  batchSize: 5,
  isWaiting: false,
  waitUntil: null,
  waitTimeMs: 60000, // 1 minute
  lastBatchStartTime: null,
  processedChunks: 0
}

const initialState: AudioState = {
  currentGeneration: null,
  generationHistory: [],
  isGeneratingAudio: false,
  isGeneratingSubtitles: false,
  audioProgress: {
    total: 0,
    completed: 0,
    phase: 'idle'
  },
  batchState: initialBatchState,
  textToProcess: null,
  textChunks: [],
  successfulChunkUrls: [],
  selectedVoice: 3,
  selectedModel: 'caruso',
  generateSubtitles: false,
  // Voice management
  customVoices: [],
  isLoadingVoices: false,
  isManagingVoice: false,
  voiceManagementError: null,
  voiceFormData: {
    name: '',
    provider: '',
    voice_id: ''
  },
  showVoiceForm: false,
  editingVoiceId: null
}

export const audioSlice = createSlice({
  name: 'audio',
  initialState,
  reducers: {
    setSelectedVoice: (state, action: PayloadAction<number>) => {
      state.selectedVoice = action.payload
    },
    
    setSelectedModel: (state, action: PayloadAction<string>) => {
      state.selectedModel = action.payload
    },
    
    setGenerateSubtitles: (state, action: PayloadAction<boolean>) => {
      state.generateSubtitles = action.payload
    },
    
    setIsGeneratingAudio: (state, action: PayloadAction<boolean>) => {
      state.isGeneratingAudio = action.payload
    },
    
    setIsGeneratingSubtitles: (state, action: PayloadAction<boolean>) => {
      state.isGeneratingSubtitles = action.payload
    },
    
    startAudioGeneration: (state, action: PayloadAction<{ 
      id: string; 
      voice: number; 
      model: string; 
      generateSubtitles: boolean; 
      textToProcess: string; 
      textChunks: string[];
      batchSize?: number;
    }>) => {
      const { id, voice, model, generateSubtitles, textToProcess, textChunks, batchSize = 5 } = action.payload;
      const totalBatches = Math.ceil(textChunks.length / batchSize);
      
      state.isGeneratingAudio = true;
      state.textToProcess = textToProcess;
      state.textChunks = textChunks;
      state.successfulChunkUrls = [];
      
      state.audioProgress = {
        total: textChunks.length,
        completed: 0,
        phase: 'batching',
      };
      
      state.batchState = {
        ...initialBatchState,
        totalBatches,
        batchSize,
      };
      
      state.currentGeneration = {
        id,
        audioUrl: null,
        compressedAudioUrl: null,
        subtitlesUrl: null,
        subtitlesContent: null,
        duration: null,
        generatedAt: new Date().toISOString(),
        voice,
        model,
        generateSubtitles,
        status: 'generating',
        error: null
      }
    },
    
    startBatch: (state) => {
      state.batchState.isWaiting = false;
      state.batchState.waitUntil = null;
      state.batchState.lastBatchStartTime = Date.now();
      state.audioProgress.phase = 'batching';
    },
    
    completeBatch: (state, action: PayloadAction<{ chunkUrls: string[] }>) => {
      const { chunkUrls } = action.payload;
      
      // Add successful URLs
      state.successfulChunkUrls.push(...chunkUrls);
      state.audioProgress.completed = state.successfulChunkUrls.length;
      state.batchState.processedChunks += chunkUrls.length;
      state.batchState.currentBatchIndex += 1;
      
      // Check if more batches needed
      if (state.batchState.currentBatchIndex >= state.batchState.totalBatches) {
        // All batches done, move to finalization
        state.audioProgress.phase = 'finalizing';
        state.batchState.isWaiting = false;
        state.batchState.waitUntil = null;
      } else {
        // Start waiting for next batch
        state.batchState.isWaiting = true;
        state.batchState.waitUntil = Date.now() + state.batchState.waitTimeMs;
        state.audioProgress.phase = 'waiting';
      }
    },

    // Record a single chunk success to drive per-chunk progress updates
    recordChunkSuccess: (state, action: PayloadAction<{ url: string }>) => {
      state.successfulChunkUrls.push(action.payload.url)
      state.audioProgress.completed = state.successfulChunkUrls.length
      state.batchState.processedChunks += 1
      // Keep phase as batching while generating
      if (state.audioProgress.phase === 'idle') {
        state.audioProgress.phase = 'batching'
      }
    },
    
    // Check if wait time is over and ready for next batch
    checkWaitStatus: (state) => {
      if (state.batchState.isWaiting && state.batchState.waitUntil) {
        if (Date.now() >= state.batchState.waitUntil) {
          state.batchState.isWaiting = false;
          state.batchState.waitUntil = null;
          state.audioProgress.phase = 'batching';
        }
      }
    },
    
    completeAudioGeneration: (state, action: PayloadAction<{ 
      audioUrl: string; 
      compressedAudioUrl?: string; 
      duration: number; 
      scriptDurations?: AudioGeneration['scriptDurations'] 
    }>) => {
      if (state.currentGeneration) {
        state.currentGeneration.audioUrl = action.payload.audioUrl
        if (action.payload.compressedAudioUrl) {
          state.currentGeneration.compressedAudioUrl = action.payload.compressedAudioUrl
        }
        state.currentGeneration.duration = action.payload.duration
        if (action.payload.scriptDurations) {
          state.currentGeneration.scriptDurations = action.payload.scriptDurations
        }
        state.currentGeneration.status = 'completed'
      }
      state.isGeneratingAudio = false
      state.audioProgress.phase = 'completed'
      state.textToProcess = null;
      state.textChunks = [];
      state.successfulChunkUrls = [];
      state.batchState = initialBatchState;
    },
    
    addSubtitlesToGeneration: (state, action: PayloadAction<{ subtitlesUrl: string; subtitlesContent?: string }>) => {
      if (state.currentGeneration) {
        state.currentGeneration.subtitlesUrl = action.payload.subtitlesUrl
        if (action.payload.subtitlesContent) {
          state.currentGeneration.subtitlesContent = action.payload.subtitlesContent
        }
      }
      state.isGeneratingSubtitles = false
    },
    
    updateSubtitleContent: (state, action: PayloadAction<{ subtitlesContent: string }>) => {
      if (state.currentGeneration) {
        state.currentGeneration.subtitlesContent = action.payload.subtitlesContent
      }
      state.isGeneratingAudio = false
      state.isGeneratingSubtitles = false
    },
    
    setAudioGenerationError: (state, action: PayloadAction<string>) => {
      if (state.currentGeneration) {
        state.currentGeneration.status = 'error'
        state.currentGeneration.error = action.payload
      }
      state.isGeneratingAudio = false
      state.isGeneratingSubtitles = false
      state.audioProgress.phase = 'idle'
      state.batchState = initialBatchState;
    },
    
    saveGenerationToHistory: (state) => {
      if (state.currentGeneration) {
        state.generationHistory.unshift(state.currentGeneration)
        // Keep only the last 10 generations
        state.generationHistory = state.generationHistory.slice(0, 10)
      }
    },
    
    clearCurrentGeneration: (state) => {
      state.currentGeneration = null
      state.textToProcess = null;
      state.textChunks = [];
      state.successfulChunkUrls = [];
      state.audioProgress = {
        total: 0,
        completed: 0,
        phase: 'idle'
      }
      state.batchState = initialBatchState;
    },
    
    clearAllAudioData: (state) => {
      state.currentGeneration = null
      state.generationHistory = []
      state.isGeneratingAudio = false
      state.isGeneratingSubtitles = false
      state.textToProcess = null;
      state.textChunks = [];
      state.successfulChunkUrls = [];
      state.audioProgress = {
        total: 0,
        completed: 0,
        phase: 'idle'
      }
      state.batchState = initialBatchState;
    },

    // Voice management actions
    setIsLoadingVoices: (state, action: PayloadAction<boolean>) => {
      state.isLoadingVoices = action.payload
    },

    setCustomVoices: (state, action: PayloadAction<AIVoice[]>) => {
      state.customVoices = action.payload
    },

    setIsManagingVoice: (state, action: PayloadAction<boolean>) => {
      state.isManagingVoice = action.payload
    },

    setVoiceManagementError: (state, action: PayloadAction<string | null>) => {
      state.voiceManagementError = action.payload
    },

    setVoiceFormData: (state, action: PayloadAction<Partial<AudioState['voiceFormData']>>) => {
      state.voiceFormData = { ...state.voiceFormData, ...action.payload }
    },

    setShowVoiceForm: (state, action: PayloadAction<boolean>) => {
      state.showVoiceForm = action.payload
      if (!action.payload) {
        // Reset form when hiding
        state.voiceFormData = {
          name: '',
          provider: '',
          voice_id: ''
        }
        state.editingVoiceId = null
        state.voiceManagementError = null
      }
    },

    setEditingVoiceId: (state, action: PayloadAction<number | null>) => {
      state.editingVoiceId = action.payload
      if (action.payload) {
        // Populate form with existing voice data
        const voice = state.customVoices.find(v => v.id === action.payload)
        if (voice) {
          state.voiceFormData = {
            id: voice.id,
            name: voice.name,
            provider: voice.provider,
            voice_id: voice.voice_id
          }
        }
      }
    },

    addCustomVoice: (state, action: PayloadAction<AIVoice>) => {
      state.customVoices.unshift(action.payload)
    },

    updateCustomVoice: (state, action: PayloadAction<AIVoice>) => {
      const index = state.customVoices.findIndex(v => v.id === action.payload.id)
      if (index !== -1) {
        state.customVoices[index] = action.payload
      }
    },

    removeCustomVoice: (state, action: PayloadAction<number>) => {
      state.customVoices = state.customVoices.filter(v => v.id !== action.payload)
    },

    clearVoiceManagementError: (state) => {
      state.voiceManagementError = null
    }
  }
})

export const {
  setSelectedVoice,
  setSelectedModel,
  setGenerateSubtitles,
  setIsGeneratingAudio,
  setIsGeneratingSubtitles,
  startAudioGeneration,
  startBatch,
  completeBatch,
  recordChunkSuccess,
  checkWaitStatus,
  completeAudioGeneration,
  addSubtitlesToGeneration,
  updateSubtitleContent,
  setAudioGenerationError,
  saveGenerationToHistory,
  clearCurrentGeneration,
  clearAllAudioData,
  // Voice management actions
  setIsLoadingVoices,
  setCustomVoices,
  setIsManagingVoice,
  setVoiceManagementError,
  setVoiceFormData,
  setShowVoiceForm,
  setEditingVoiceId,
  addCustomVoice,
  updateCustomVoice,
  removeCustomVoice,
  clearVoiceManagementError
} = audioSlice.actions

export default audioSlice.reducer 