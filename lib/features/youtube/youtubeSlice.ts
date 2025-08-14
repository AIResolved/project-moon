import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

// YouTube Video interface
export interface Video {
  id: {
    videoId: string
  }
  snippet: {
    title: string
    description: string
    channelTitle: string
    publishedAt: string
  }
  statistics?: {
    viewCount: string
    likeCount?: string
    commentCount?: string
  }
}

// Subtitle File interface
export interface SubtitleFile {
  videoId: string
  title: string
  filename: string
  srtContent: string
  size: number
  status: 'processing' | 'completed' | 'error' | 'downloading' | 'transcribing' | 'extracting' | 'pending'
  progress?: string
  method?: 'yt-dlp' | 'whisper' | 'supadata'
}

// Transcript Analysis interface
export interface TranscriptAnalysis {
  timestamp: string
  summary: string
  relevantContent: string
  confidence: number
  youtubeUrl?: string
  dramaticElements?: string[]
  keyQuotes?: string[]
  contextualInfo?: string
}

// Analysis Result interface - updated to handle multiple results
export interface AnalysisResult {
  videoId: string
  query: string
  analysis: TranscriptAnalysis[] // Changed from single TranscriptAnalysis to array
  timestamp: string
  usingMock?: boolean
}

// Search Info interface
export interface SearchInfo {
  query?: string
  channelId?: string
  maxResults: number
  filteredShortVideos?: number
  minDuration?: number
}

// Video Summary interfaces
export interface VideoSummary {
  videoId: string
  title: string
  keyPoints: string[]
  mainTopic: string
  timestamp?: string
  narrativeElements: string[]
  emotionalTone: string
  dramaticElements?: string[]
  keyQuotes?: string[]
  contextualInfo?: string
}

export interface VideosSummary {
  overallTheme: string
  keyInsights: string[]
  actionableItems: string[]
  characterInsights: string[]
  conflictElements: string[]
  storyIdeas: string[]
  creativePrompt: string
  // Optional properties for backward compatibility
  videoSummaries?: VideoSummary[]
  commonPatterns?: string[]
  narrativeThemes?: string[]
  timestamps?: Array<{
    time: string
    description: string
    significance: string
  }>
}

// Research Summary interfaces
export interface WebSearchResult {
  title: string
  link: string
  description: string
  source?: string
}



export interface YouTubeResearchSummary {
  id: string
  query: string
  videosSummary: VideosSummary
  timestamp: string
  usingMock?: boolean
  appliedToScript?: boolean
  analysisType?: 'openai' | 'gemini' | 'gemini+gpt'
}

// Gemini Analysis interface
export interface GeminiVideoAnalysis {
  videoId: string
  title: string
  summary: string
  keyPoints: string[]
  timestamps: Array<{
    time: string
    description: string
    significance: string
  }>
  topics: string[]
  emotionalTone: string
  keyQuotes: string[]
  actionableInsights: string[]
  characterInsights: string[]
  conflictElements: string[]
  storyIdeas: string[]
  creativePrompt: string
}

// Gemini Analysis Result interface
export interface GeminiAnalysisResult {
  videoId: string
  query?: string
  analysis: GeminiVideoAnalysis
  timestamp: string
  rawResponse?: string
  usingGemini: boolean
  parsedWithGPT?: boolean
}

// SRT Entry interface for deduplication
interface SRTEntry {
  index: number
  startTime: string
  endTime: string
  text: string
  startMs: number
  endMs: number
}

// Utility function to convert timestamp to milliseconds
function timestampToMs(timestamp: string): number {
  const [time, ms] = timestamp.split(',')
  const [hours, minutes, seconds] = time.split(':').map(Number)
  return hours * 3600000 + minutes * 60000 + seconds * 1000 + Number(ms)
}

// Utility function to convert milliseconds to timestamp
function msToTimestamp(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = ms % 1000

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
}

// Utility function to calculate text similarity (simple approach)
function textSimilarity(text1: string, text2: string): number {
  const clean1 = text1.toLowerCase().trim()
  const clean2 = text2.toLowerCase().trim()
  
  if (clean1 === clean2) return 1.0
  
  // Simple containment check
  if (clean1.includes(clean2) || clean2.includes(clean1)) {
    return Math.max(clean2.length, clean1.length) / Math.min(clean1.length || 1, clean2.length || 1)
  }
  
  return 0
}

// Utility function to deduplicate SRT content
function deduplicateSRT(srtContent: string): string {
  if (!srtContent || !srtContent.trim()) return srtContent

  console.log('🔧 Starting SRT deduplication...')
  
  // Parse SRT entries
  const entries: SRTEntry[] = []
  const blocks = srtContent.trim().split(/\n\s*\n/)
  
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length >= 3) {
      const index = parseInt(lines[0])
      const [startTime, endTime] = lines[1].split(' --> ')
      const text = lines.slice(2).join('\n').trim()
      
      if (!isNaN(index) && startTime && endTime && text) {
        entries.push({
          index,
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          text,
          startMs: timestampToMs(startTime.trim()),
          endMs: timestampToMs(endTime.trim())
        })
      }
    }
  }

  console.log(`📝 Parsed ${entries.length} SRT entries`)

  if (entries.length === 0) return srtContent

  // Sort by start time
  entries.sort((a, b) => a.startMs - b.startMs)

  // Deduplicate entries
  const deduplicatedEntries: SRTEntry[] = []
  const OVERLAP_THRESHOLD = 500 // 500ms overlap threshold
  const SIMILARITY_THRESHOLD = 0.8 // 80% text similarity threshold

  for (let i = 0; i < entries.length; i++) {
    const currentEntry = entries[i]
    let shouldKeep = true

    // Check against already kept entries
    for (const keptEntry of deduplicatedEntries) {
      // Check for time overlap
      const timeOverlap = !(currentEntry.endMs <= keptEntry.startMs || currentEntry.startMs >= keptEntry.endMs)
      const timeClose = Math.abs(currentEntry.startMs - keptEntry.startMs) <= OVERLAP_THRESHOLD

      // Check for text similarity
      const similarity = textSimilarity(currentEntry.text, keptEntry.text)

      // If similar time and text, skip this entry
      if ((timeOverlap || timeClose) && similarity >= SIMILARITY_THRESHOLD) {
        shouldKeep = false
        break
      }
    }

    if (shouldKeep) {
      // Clean up the text by removing word-level timestamps
      let cleanText = currentEntry.text
      // Remove patterns like <00:00:00.560>
      cleanText = cleanText.replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
      // Remove extra spaces
      cleanText = cleanText.replace(/\s+/g, ' ').trim()
      
      if (cleanText) { // Only keep entries with actual text
        deduplicatedEntries.push({
          ...currentEntry,
          text: cleanText
        })
      }
    }
  }

  console.log(`✅ Deduplicated from ${entries.length} to ${deduplicatedEntries.length} entries`)

  // Rebuild SRT content with sequential numbering
  const deduplicatedSRT = deduplicatedEntries
    .map((entry, index) => {
      return `${index + 1}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}`
    })
    .join('\n\n')

  return deduplicatedSRT + '\n'
}

// YouTube state interface
interface YouTubeState {
  // Search form state
  searchQuery: string
  channelUrl: string
  maxResults: number
  sortOrder: string
  minDuration: number
  
  // Search results
  videos: Video[]
  searchInfo: SearchInfo | null
  selectedVideos: string[] // Array instead of Set for serialization
  
  // Subtitle generation
  subtitleFiles: SubtitleFile[]
  generatingSubtitles: boolean
  totalVideosProcessing: number
  completedVideosCount: number
  
  // Transcript analysis
  analysisResults: AnalysisResult[]
  analyzingTranscripts: Record<string, boolean> // videoId -> isAnalyzing
  analysisQueries: Record<string, string> // videoId -> current query
  
  // Gemini analysis
  geminiAnalysisResults: GeminiAnalysisResult[]
  analyzingWithGemini: Record<string, boolean> // videoId -> isAnalyzing
  
  // Video summarization
  videosSummary: VideosSummary | null
  summarizingVideos: boolean
  
  // Research summaries
  youtubeResearchSummaries: YouTubeResearchSummary[]
  
  // Loading and error states
  searchLoading: boolean
  error: string | null
  
  // Preview modal
  previewContent: string | null
  previewTitle: string
}

// Initial state
const initialState: YouTubeState = {
  // Search form state
  searchQuery: '',
  channelUrl: '',
  maxResults: 50,
  sortOrder: 'date',
  minDuration: 60,
  
  // Search results
  videos: [],
  searchInfo: null,
  selectedVideos: [],
  
  // Subtitle generation
  subtitleFiles: [],
  generatingSubtitles: false,
  totalVideosProcessing: 0,
  completedVideosCount: 0,
  
  // Transcript analysis
  analysisResults: [],
  analyzingTranscripts: {},
  analysisQueries: {},
  
  // Gemini analysis
  geminiAnalysisResults: [],
  analyzingWithGemini: {},
  
  // Video summarization
  videosSummary: null,
  summarizingVideos: false,
  
  // Research summaries
  youtubeResearchSummaries: [],
  
  // Loading and error states
  searchLoading: false,
  error: null,
  
  // Preview modal
  previewContent: null,
  previewTitle: '',
}

// Async thunk for searching videos
export const searchVideos = createAsyncThunk(
  'youtube/searchVideos',
  async (params: {
    searchQuery?: string
    channelUrl?: string
    maxResults: number
    sortOrder: string
    minDuration?: number
  }) => {
    const response = await fetch('/api/youtube/youtube-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'An error occurred while searching')
    }

    return {
      videos: data.data.items || [],
      searchInfo: data.searchInfo
    }
  }
)

// Async thunk for generating subtitles using Supadata only
export const generateSubtitlesIndividually = createAsyncThunk(
  'youtube/generateSubtitlesIndividually',
  async (videoIds: string[], { dispatch }) => {
    console.log(`🎬 Starting individual subtitle generation for ${videoIds.length} videos`)
    
    // Initialize subtitle files and counters
    dispatch(initializeSubtitleFiles(videoIds))
    
    // Process each video individually in parallel
    const processingPromises = videoIds.map(async (videoId) => {
      try {
        // Update status to downloading
        dispatch(updateSubtitleStatus({
          videoId,
          status: 'downloading',
          progress: 'Starting transcript extraction...'
        }))

        // Make API call for individual video using Supadata
        const response = await fetch('/api/youtube/download-single', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoId }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          // Handle API error response
          const errorMessage = data.details || data.error || `HTTP ${response.status}: Failed to extract transcript`
          throw new Error(errorMessage)
        }

        // Update status to transcribing
        dispatch(updateSubtitleStatus({
          videoId,
          status: 'transcribing',
          progress: 'Processing transcript data...'
        }))

        // Update with completed result
        const subtitleFile = data.subtitleFile
        dispatch(addSubtitleFile({
          ...subtitleFile,
          method: 'supadata'
        }))

        // Increment completed count
        dispatch(incrementCompletedVideos())

        return subtitleFile

      } catch (error) {
        console.error(`Error processing video ${videoId}:`, error)
        
        // Update with error status and detailed error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        dispatch(updateSubtitleStatus({
          videoId,
          status: 'error',
          progress: errorMessage
        }))

        // Still increment completed count for failed videos
        dispatch(incrementCompletedVideos())

        return null
      }
    })

    // Wait for all videos to complete
    const results = await Promise.all(processingPromises)
    const successfulResults = results.filter(result => result !== null)
    
    console.log(`🎉 Individual subtitle generation complete: ${successfulResults.length}/${videoIds.length} successful`)
    
    return {
      totalVideos: videoIds.length,
      successfulVideos: successfulResults.length,
      subtitleFiles: successfulResults
    }
  }
)

// Legacy alias for backward compatibility - now uses Supadata only
export const generateSubtitles = generateSubtitlesIndividually

// Async thunk for analyzing transcripts
export const analyzeTranscript = createAsyncThunk(
  'youtube/analyzeTranscript',
  async (params: {
    videoId: string
    srtContent: string
    query: string
    videoTitle: string
  }) => {
    const response = await fetch('/api/youtube/analyze-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        srtContent: params.srtContent,
        query: params.query,
        videoTitle: params.videoTitle,
        videoId: params.videoId
      }),
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'An error occurred while analyzing transcript')
    }

    // data.analysis is now an array of results
    return {
      videoId: params.videoId,
      query: params.query,
      analysis: data.analysis, // This is now an array
      timestamp: new Date().toISOString(),
      usingMock: data.usingMock
    }
  }
)

// Async thunk for Gemini video analysis
export const analyzeVideoWithGemini = createAsyncThunk(
  'youtube/analyzeVideoWithGemini',
  async (params: {
    videoId: string
    videoUrl: string
    title: string
    query?: string
  }) => {
    // Step 1: Get raw Gemini analysis
    const geminiResponse = await fetch('/api/youtube/gemini-analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId: params.videoId,
        videoUrl: params.videoUrl,
        title: params.title,
        query: params.query
      }),
    })

    const geminiData = await geminiResponse.json()

    if (!geminiData.success) {
      throw new Error(geminiData.error || 'An error occurred while analyzing video with Gemini')
    }

    // Step 2: Parse Gemini response with GPT-4o-mini for structured output
    const parseResponse = await fetch('/api/youtube/parse-gemini-response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId: params.videoId,
        videoTitle: params.title,
        videoUrl: params.videoUrl,
        geminiRawResponse: geminiData.rawResponse || geminiData.analysis || 'No raw response available',
        query: params.query
      }),
    })

    const parseData = await parseResponse.json()

    if (!parseData.success) {
      console.warn('⚠️ GPT-4o-mini parsing failed, using original Gemini analysis')
      // Fallback to original Gemini analysis if parsing fails
      return {
        videoId: params.videoId,
        query: params.query,
        analysis: geminiData.analysis,
        timestamp: new Date().toISOString(),
        rawResponse: geminiData.rawResponse,
        usingGemini: geminiData.usingGemini,
        parsedWithGPT: false
      }
    }

    console.log('✅ Successfully parsed Gemini response with GPT-4o-mini')

    return {
      videoId: params.videoId,
      query: params.query,
      analysis: parseData.analysis,
      timestamp: new Date().toISOString(),
      rawResponse: parseData.originalGeminiResponse,
      usingGemini: true,
      parsedWithGPT: true
    }
  }
)



// Async thunk for summarizing videos
export const summarizeVideos = createAsyncThunk(
  'youtube/summarizeVideos',
  async (videoIds: string[], { getState }) => {
    const state = getState() as { youtube: YouTubeState }
    
    // Get subtitle files for the selected videos
    const videosWithSubtitles = videoIds
      .map(videoId => {
        const subtitleFile = state.youtube.subtitleFiles.find(sf => sf.videoId === videoId && sf.status === 'completed')
        return subtitleFile ? {
          videoId: videoId,
          title: subtitleFile.title,
          srtContent: subtitleFile.srtContent
        } : null
      })
      .filter((video): video is NonNullable<typeof video> => video !== null)

    if (videosWithSubtitles.length === 0) {
      throw new Error('No videos with completed subtitles found for summarization')
    }

    console.log(`🎬 Summarizing ${videosWithSubtitles.length} videos with completed subtitles`)

    const response = await fetch('/api/summarize-videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videos: videosWithSubtitles
      }),
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'An error occurred while summarizing videos')
    }

    return {
      summary: data.summary,
      usingMock: data.usingMock,
      videoCount: videosWithSubtitles.length,
      // Create research summary data
      researchSummary: {
        id: `youtube-${Date.now()}`,
        query: `YouTube video analysis (${videosWithSubtitles.length} videos)`,
        videosSummary: data.summary,
        timestamp: new Date().toISOString(),
        usingMock: data.usingMock,
        appliedToScript: false
      }
    }
  }
)

export const youtubeSlice = createSlice({
  name: 'youtube',
  initialState,
  reducers: {
    // Search form actions
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
    },
    
    setChannelUrl: (state, action: PayloadAction<string>) => {
      state.channelUrl = action.payload
    },
    
    setMaxResults: (state, action: PayloadAction<number>) => {
      state.maxResults = action.payload
    },
    
    setSortOrder: (state, action: PayloadAction<string>) => {
      state.sortOrder = action.payload
    },
    
    setMinDuration: (state, action: PayloadAction<number>) => {
      state.minDuration = action.payload
    },
    
    // Video selection actions
    toggleVideoSelection: (state, action: PayloadAction<string>) => {
      const videoId = action.payload
      const index = state.selectedVideos.indexOf(videoId)
      
      if (index >= 0) {
        state.selectedVideos.splice(index, 1)
      } else {
        state.selectedVideos.push(videoId)
      }
    },
    
    selectAllVideos: (state) => {
      state.selectedVideos = state.videos.map(v => v.id.videoId)
    },
    
    deselectAllVideos: (state) => {
      state.selectedVideos = []
    },
    
    // Subtitle actions
    updateSubtitleStatus: (state, action: PayloadAction<{
      videoId: string
      status: SubtitleFile['status']
      progress?: string
    }>) => {
      const { videoId, status, progress } = action.payload
      const subtitle = state.subtitleFiles.find(s => s.videoId === videoId)
      if (subtitle) {
        subtitle.status = status
        if (progress !== undefined) {
          subtitle.progress = progress
        }
      }
    },
    
    updateSubtitleGenerationStatus: (state, action: PayloadAction<'extracting' | 'transcribing'>) => {
      const status = action.payload
      // Update all processing subtitle files with the current step
      state.subtitleFiles.forEach(file => {
        if (file.status === 'processing' || file.status === 'extracting' || file.status === 'transcribing') {
          file.status = status
        }
      })
    },
    
    addSubtitleFile: (state, action: PayloadAction<SubtitleFile>) => {
      const existingIndex = state.subtitleFiles.findIndex(s => s.videoId === action.payload.videoId)
      if (existingIndex >= 0) {
        state.subtitleFiles[existingIndex] = action.payload
      } else {
        state.subtitleFiles.push(action.payload)
      }
    },
    
    // Transcript analysis actions
    setAnalysisQuery: (state, action: PayloadAction<{ videoId: string; query: string }>) => {
      const { videoId, query } = action.payload
      state.analysisQueries[videoId] = query
    },
    
    clearAnalysisResults: (state, action: PayloadAction<string>) => {
      const videoId = action.payload
      state.analysisResults = state.analysisResults.filter(result => result.videoId !== videoId)
    },
    
    // Gemini analysis actions
    clearGeminiAnalysisResults: (state, action: PayloadAction<string>) => {
      const videoId = action.payload
      state.geminiAnalysisResults = state.geminiAnalysisResults.filter(result => result.videoId !== videoId)
    },
    
    clearAllGeminiAnalysisResults: (state) => {
      state.geminiAnalysisResults = []
      state.analyzingWithGemini = {}
    },
    
    // Video summarization actions
    clearVideosSummary: (state) => {
      state.videosSummary = null
    },
    
    // Research summary actions
    addYouTubeResearchSummary: (state, action: PayloadAction<YouTubeResearchSummary>) => {
      state.youtubeResearchSummaries.push(action.payload)
    },
    
    removeYouTubeResearchSummary: (state, action: PayloadAction<string>) => {
      state.youtubeResearchSummaries = state.youtubeResearchSummaries.filter(
        summary => summary.id !== action.payload
      )
    },
    
    clearAllResearchSummaries: (state) => {
      state.youtubeResearchSummaries = []
    },
    
    // Mark research summaries as applied to script    
    markYouTubeResearchAsApplied: (state, action: PayloadAction<string>) => {
      const summary = state.youtubeResearchSummaries.find(s => s.id === action.payload)
      if (summary) {
        summary.appliedToScript = true
      }
    },
    
    markMultipleResearchAsApplied: (state, action: PayloadAction<{ youtubeIds: string[] }>) => {
      action.payload.youtubeIds.forEach(id => {
        const summary = state.youtubeResearchSummaries.find(s => s.id === id)
        if (summary) {
          summary.appliedToScript = true
        }
      })
    },
    
    // Preview modal actions
    setPreviewContent: (state, action: PayloadAction<{ content: string; title: string } | null>) => {
      if (action.payload) {
        state.previewContent = action.payload.content
        state.previewTitle = action.payload.title
      } else {
        state.previewContent = null
        state.previewTitle = ''
      }
    },
    
    // Error handling
    clearError: (state) => {
      state.error = null
    },
    
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
    },
    
    // Reset actions
    resetSearchResults: (state) => {
      state.videos = []
      state.searchInfo = null
      state.selectedVideos = []
      state.error = null
    },
    
    resetSubtitleFiles: (state) => {
      state.subtitleFiles = []
    },
    
    resetAnalysisResults: (state) => {
      state.analysisResults = []
      state.analyzingTranscripts = {}
      state.analysisQueries = {}
    },
    
    resetAll: (state) => {
      return { ...initialState }
    },

    // Initialize subtitle files for processing
    initializeSubtitleFiles: (state, action: PayloadAction<string[]>) => {
      const videoIds = action.payload
      state.totalVideosProcessing = videoIds.length
      state.completedVideosCount = 0
      
      videoIds.forEach(videoId => {
        const existingFile = state.subtitleFiles.find(sf => sf.videoId === videoId)
        if (!existingFile) {
          state.subtitleFiles.push({
            videoId,
            title: `Video ${videoId}`,
            filename: '',
            srtContent: '',
            size: 0,
            status: 'pending'
          })
        } else {
          // Reset existing file status
          existingFile.status = 'pending'
          existingFile.progress = undefined
        }
      })
    },

    // Increment completed videos count
    incrementCompletedVideos: (state) => {
      state.completedVideosCount += 1
    },

    // Reset processing counters
    resetProcessingCounters: (state) => {
      state.totalVideosProcessing = 0
      state.completedVideosCount = 0
    },
  },
  extraReducers: (builder) => {
    // Search videos
    builder
      .addCase(searchVideos.pending, (state) => {
        state.searchLoading = true
        state.error = null
        state.videos = []
        state.selectedVideos = []
      })
      .addCase(searchVideos.fulfilled, (state, action) => {
        state.searchLoading = false
        state.videos = action.payload.videos
        state.searchInfo = action.payload.searchInfo
        state.error = null
      })
      .addCase(searchVideos.rejected, (state, action) => {
        state.searchLoading = false
        state.error = action.error.message || 'Network error occurred while searching'
      })
    
    // Generate subtitles
    builder
      .addCase(generateSubtitlesIndividually.pending, (state) => {
        state.generatingSubtitles = true
        state.error = null
      })
      .addCase(generateSubtitlesIndividually.fulfilled, (state, action) => {
        state.generatingSubtitles = false
        state.error = null
        // Reset counters when done
        state.totalVideosProcessing = 0
        state.completedVideosCount = 0
      })
      .addCase(generateSubtitlesIndividually.rejected, (state, action) => {
        state.generatingSubtitles = false
        state.error = action.error.message || 'Network error occurred while generating subtitles individually'
        // Reset counters on error
        state.totalVideosProcessing = 0
        state.completedVideosCount = 0
      })
    
    // Analyze transcript
    builder
      .addCase(analyzeTranscript.pending, (state, action) => {
        const videoId = action.meta.arg.videoId
        state.analyzingTranscripts[videoId] = true
        state.error = null
      })
      .addCase(analyzeTranscript.fulfilled, (state, action) => {
        const videoId = action.payload.videoId
        state.analyzingTranscripts[videoId] = false
        
        // Remove any existing analysis for this video and query
        state.analysisResults = state.analysisResults.filter(
          result => !(result.videoId === videoId && result.query === action.payload.query)
        )
        
        // Add new analysis result
        state.analysisResults.push(action.payload)
        state.error = null
      })
      .addCase(analyzeTranscript.rejected, (state, action) => {
        const videoId = action.meta.arg.videoId
        state.analyzingTranscripts[videoId] = false
        state.error = action.error.message || 'Network error occurred while analyzing transcript'
      })
    
    // Summarize videos
    builder
      .addCase(summarizeVideos.pending, (state) => {
        state.summarizingVideos = true
        state.error = null
        state.videosSummary = null
      })
      .addCase(summarizeVideos.fulfilled, (state, action) => {
        state.summarizingVideos = false
        state.videosSummary = action.payload.summary
        // Add to YouTube research summaries
        state.youtubeResearchSummaries.push(action.payload.researchSummary)
        state.error = null
      })
      .addCase(summarizeVideos.rejected, (state, action) => {
        state.summarizingVideos = false
        state.error = action.error.message || 'Network error occurred while summarizing videos'
      })
    

    
    // Gemini analyze video
    builder
      .addCase(analyzeVideoWithGemini.pending, (state, action) => {
        const videoId = action.meta.arg.videoId
        state.analyzingWithGemini[videoId] = true
        state.error = null
      })
      .addCase(analyzeVideoWithGemini.fulfilled, (state, action) => {
        const videoId = action.payload.videoId
        state.analyzingWithGemini[videoId] = false
        
        // Remove any existing Gemini analysis for this video and query
        state.geminiAnalysisResults = state.geminiAnalysisResults.filter(
          result => !(result.videoId === videoId && result.query === action.payload.query)
        )
        
        // Add new Gemini analysis result
        state.geminiAnalysisResults.push(action.payload)
        state.error = null
      })
      .addCase(analyzeVideoWithGemini.rejected, (state, action) => {
        const videoId = action.meta.arg.videoId
        state.analyzingWithGemini[videoId] = false
        state.error = action.error.message || 'Network error occurred while analyzing video with Gemini'
      })
  },
})

// Export actions
export const {
  setSearchQuery,
  setChannelUrl,
  setMaxResults,
  setSortOrder,
  setMinDuration,
  toggleVideoSelection,
  selectAllVideos,
  deselectAllVideos,
  updateSubtitleStatus,
  updateSubtitleGenerationStatus,
  addSubtitleFile,
  setAnalysisQuery,
  clearAnalysisResults,
  clearVideosSummary,
  setPreviewContent,
  clearError,
  setError,
  resetSearchResults,
  resetSubtitleFiles,
  resetAnalysisResults,
  resetAll,
  addYouTubeResearchSummary,
  removeYouTubeResearchSummary,
  clearAllResearchSummaries,
  markYouTubeResearchAsApplied,
  markMultipleResearchAsApplied,
  initializeSubtitleFiles,
  incrementCompletedVideos,
  resetProcessingCounters,
  clearGeminiAnalysisResults,
  clearAllGeminiAnalysisResults,
} = youtubeSlice.actions

// Export reducer
export default youtubeSlice.reducer

// Selectors (for easy access to state)
export const selectSearchForm = (state: { youtube: YouTubeState }) => ({
  searchQuery: state.youtube.searchQuery,
  channelUrl: state.youtube.channelUrl,
  maxResults: state.youtube.maxResults,
  sortOrder: state.youtube.sortOrder,
  minDuration: state.youtube.minDuration,
})

export const selectSearchResults = (state: { youtube: YouTubeState }) => ({
  videos: state.youtube.videos,
  searchInfo: state.youtube.searchInfo,
  selectedVideos: state.youtube.selectedVideos,
  searchLoading: state.youtube.searchLoading,
})

export const selectSubtitleGeneration = (state: { youtube: YouTubeState }) => ({
  subtitleFiles: state.youtube.subtitleFiles,
  generatingSubtitles: state.youtube.generatingSubtitles,
  totalVideosProcessing: state.youtube.totalVideosProcessing,
  completedVideosCount: state.youtube.completedVideosCount,
})

export const selectTranscriptAnalysis = (state: { youtube: YouTubeState }) => ({
  analysisResults: state.youtube.analysisResults,
  analyzingTranscripts: state.youtube.analyzingTranscripts,
  analysisQueries: state.youtube.analysisQueries,
})

export const selectGeminiAnalysis = (state: { youtube: YouTubeState }) => ({
  geminiAnalysisResults: state.youtube.geminiAnalysisResults,
  analyzingWithGemini: state.youtube.analyzingWithGemini,
})

export const selectPreviewModal = (state: { youtube: YouTubeState }) => ({
  previewContent: state.youtube.previewContent,
  previewTitle: state.youtube.previewTitle,
})

export const selectError = (state: { youtube: YouTubeState }) => state.youtube.error

export const selectVideoSummarization = (state: { youtube: YouTubeState }) => ({
  videosSummary: state.youtube.videosSummary,
  summarizingVideos: state.youtube.summarizingVideos,
})

export const selectResearchSummaries = (state: { youtube: YouTubeState }) => ({
  youtubeResearchSummaries: state.youtube.youtubeResearchSummaries,
}) 