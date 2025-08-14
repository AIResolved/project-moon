'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Eye, Search, Sparkles, FileText } from 'lucide-react'
import type { Video, SubtitleFile } from '@/lib/features/youtube/youtubeSlice'

interface VideoSearchCardProps {
  // Search form state
  searchForm: {
    searchQuery: string
    channelUrl: string
    maxResults: number
    sortOrder: string
    minDuration: number
  }
  
  // Search results
  searchResults: {
    videos: Video[]
    selectedVideos: string[]
    searchLoading: boolean
    searchInfo: any
  }
  
  // Subtitle generation state
  subtitleGeneration: {
    generatingSubtitles: boolean
    subtitleFiles: SubtitleFile[]
    totalVideosProcessing: number
    completedVideosCount: number
  }
  
  // Analysis state
  analysisMode: 'openai' | 'gemini'
  isAnalyzingBatch: boolean
  batchAnalysisProgress: { completed: number; total: number }
  
  // Error state
  error: string | null
  
  // Event handlers
  onSearchQueryChange: (query: string) => void
  onChannelUrlChange: (url: string) => void
  onMaxResultsChange: (maxResults: number) => void
  onSortOrderChange: (sortOrder: string) => void
  onMinDurationChange: (duration: number) => void
  onSearch: () => void
  onVideoSelect: (videoId: string) => void
  onSelectAll: () => void
  onGenerateSubtitles: () => void
  onAnalyzeSelectedVideos: () => void
  onAnalysisModeChange: (mode: 'openai' | 'gemini') => void
  onClearError: () => void
  
  // Helper functions
  getSearchInfoText: () => string
  getVideosWithSubtitlesCount: () => number
  formatDate: (dateString: string) => string
  formatCount: (count: string | number | undefined) => string
  formatFileSize: (bytes: number) => string
  getStatusDisplay: (subtitleFile: SubtitleFile) => { message: string; icon: string }
}

export function VideoSearchCard({
  searchForm,
  searchResults,
  subtitleGeneration,
  analysisMode,
  isAnalyzingBatch,
  batchAnalysisProgress,
  error,
  onSearchQueryChange,
  onChannelUrlChange,
  onMaxResultsChange,
  onSortOrderChange,
  onMinDurationChange,
  onSearch,
  onVideoSelect,
  onSelectAll,
  onGenerateSubtitles,
  onAnalyzeSelectedVideos,
  onAnalysisModeChange,
  onClearError,
  getSearchInfoText,
  getVideosWithSubtitlesCount,
  formatDate,
  formatCount,
  formatFileSize,
  getStatusDisplay
}: VideoSearchCardProps) {
  const isSearchFormValid = searchForm.searchQuery.trim() || searchForm.channelUrl.trim()

  return (
    <div className="bg-black text-white p-4 rounded-lg">
      {/* Search Form */}
      <div className="bg-gray-900 p-6 rounded-lg mb-6 border border-gray-700">
        <div className="space-y-4">
          <div>
            <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-100 mb-2">
              Search Query (optional):
            </label>
            <input
              type="text"
              id="searchQuery"
              className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Enter keywords to search for..."
              value={searchForm.searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
            />
            <p className="text-xs text-gray-300 mt-1">
              Leave empty to get all recent videos from a channel, or enter keywords to search for specific content.
            </p>
          </div>

          <div>
            <label htmlFor="channelUrl" className="block text-sm font-medium text-gray-100 mb-2">
              Channel URL or Channel ID (optional):
            </label>
            <input
              type="text"
              id="channelUrl"
              className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="https://www.youtube.com/@channelname or UC_x5XG1OV2P6uZZ5FSM9Ttw"
              value={searchForm.channelUrl}
              onChange={(e) => onChannelUrlChange(e.target.value)}
            />
            <p className="text-xs text-gray-300 mt-1">
              Leave empty to search all of YouTube, or specify a channel to search within that channel only.<br />
              Supported formats: @handle, /channel/ID, /c/name, /user/name, or just the channel ID
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="maxResults" className="block text-sm font-medium text-gray-100 mb-2">
                Number of Results:
              </label>
              <input
                type="number"
                id="maxResults"
                className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                min="1"
                max="50"
                value={searchForm.maxResults}
                onChange={(e) => onMaxResultsChange(parseInt(e.target.value) || 50)}
              />
            </div>

            <div>
              <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-100 mb-2">
                Sort Order:
              </label>
              <select
                id="sortOrder"
                className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={searchForm.sortOrder}
                onChange={(e) => onSortOrderChange(e.target.value)}
              >
                <option value="date">Most Recent</option>
                <option value="relevance">Most Relevant</option>
                <option value="viewCount">Most Viewed</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>

            <div>
              <label htmlFor="minDuration" className="block text-sm font-medium text-gray-100 mb-2">
                Minimum Duration:
              </label>
              <select
                id="minDuration"
                className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={searchForm.minDuration}
                onChange={(e) => onMinDurationChange(parseInt(e.target.value))}
              >
                <option value={0}>No minimum (include all videos)</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={120}>2 minutes</option>
                <option value={300}>5 minutes</option>
                <option value={600}>10 minutes</option>
                <option value={1200}>20 minutes</option>
                <option value={1800}>30 minutes</option>
                <option value={3600}>1 hour</option>
              </select>
              <p className="text-xs text-gray-300 mt-1">
                Filter out videos shorter than the selected duration
              </p>
            </div>
          </div>

          <button
            onClick={onSearch}
            disabled={searchResults.searchLoading || !isSearchFormValid}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-medium py-2 px-6 rounded-md transition-colors"
          >
            {searchResults.searchLoading ? 'Searching...' : 'Search Videos'}
          </button>
          
          {!isSearchFormValid && (
            <p className="text-sm text-red-500 mt-2">
              Please enter either a search query or a channel URL (or both).
            </p>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 flex justify-between items-center">
          <span>{error}</span>
          <button 
            onClick={onClearError}
            className="text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Search Results */}
      {searchResults.searchInfo && searchResults.videos.length > 0 && (
        <>
          <div className="bg-green-900/20 border border-green-700 text-green-200 px-4 py-3 rounded-md mb-4">
            Found {searchResults.videos.length} videos for {getSearchInfoText()}
            <br />
            Requested: {searchResults.searchInfo.maxResults} results
            {searchResults.searchInfo.filteredShortVideos !== undefined && searchResults.searchInfo.filteredShortVideos > 0 && (
              <div className="text-sm text-green-400 mt-1">
                ⚡ Filtered out {searchResults.searchInfo.filteredShortVideos} short videos 
                {searchResults.searchInfo.minDuration && searchResults.searchInfo.minDuration > 0 ? (
                  ` (less than ${
                    searchResults.searchInfo.minDuration >= 3600 
                      ? `${Math.floor(searchResults.searchInfo.minDuration / 3600)}h ${Math.floor((searchResults.searchInfo.minDuration % 3600) / 60)}m`
                      : searchResults.searchInfo.minDuration >= 60 
                        ? `${Math.floor(searchResults.searchInfo.minDuration / 60)}m ${searchResults.searchInfo.minDuration % 60}s`.replace(' 0s', '')
                        : `${searchResults.searchInfo.minDuration}s`
                  })`
                ) : ' (less than 1 minute)'}
              </div>
            )}
          </div>

          {/* Selection Controls */}
          <div className="bg-blue-900/20 border border-blue-700 p-4 rounded-md mb-4 text-blue-100">
            <div className="flex justify-between items-center mb-3">
              <div>
                <button
                  onClick={onSelectAll}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded transition-colors"
                >
                  {searchResults.selectedVideos.length === searchResults.videos.length ? 'Deselect All' : 'Select All'}
                </button>
                 <span className="ml-4 text-blue-200">
                  {searchResults.selectedVideos.length} of {searchResults.videos.length} videos selected
                </span>
              </div>
            </div>
            
            {/* Enhanced Analysis Mode Selection */}
            <div className="mb-4">
               <h5 className="text-sm font-medium text-blue-200 mb-3">Choose Analysis Approach for Selected Videos</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => onAnalysisModeChange('openai')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    analysisMode === 'openai'
                      ? 'border-purple-500 bg-purple-900/30 text-purple-200'
                      : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-purple-400'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <Search className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Transcript Analysis</div>
                      <div className="text-xs opacity-75 mt-1">OpenAI analyzes generated subtitles</div>
                      <div className="text-xs mt-1 text-amber-600">
                        ⚠ Requires subtitle generation first
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => onAnalysisModeChange('gemini')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    analysisMode === 'gemini'
                      ? 'border-blue-500 bg-blue-900/30 text-blue-200'
                      : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-blue-400'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <Sparkles className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Video Analysis</div>
                      <div className="text-xs opacity-75 mt-1">Gemini AI analyzes videos directly</div>
                      <div className="text-xs mt-1 text-green-600">
                        ✓ No subtitles required
                      </div>
                    </div>
                  </div>
                </button>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onAnalyzeSelectedVideos}
                  disabled={searchResults.selectedVideos.length === 0 || isAnalyzingBatch}
                  className={`flex-1 sm:flex-none font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    analysisMode === 'openai'
                      ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white'
                  }`}
                >
                  {isAnalyzingBatch ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {analysisMode === 'openai' ? 'Analyzing Transcripts...' : 'Analyzing Videos...'}
                      <span className="ml-1">({batchAnalysisProgress.completed}/{batchAnalysisProgress.total})</span>
                    </>
                  ) : (
                    <>
                      {analysisMode === 'gemini' ? <Sparkles className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                      {analysisMode === 'openai' ? 'Analyze Transcripts' : 'Analyze Videos'} ({searchResults.selectedVideos.length})
                    </>
                  )}
                </button>
                
                {/* Other bulk actions */}
                <button
                  onClick={onGenerateSubtitles}
                  disabled={searchResults.selectedVideos.length === 0 || subtitleGeneration.generatingSubtitles}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-md transition-colors flex items-center gap-2"
                >
                  {subtitleGeneration.generatingSubtitles ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Generate Subtitles ({searchResults.selectedVideos.length})
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Progress information for batch analysis */}
            {isAnalyzingBatch && (
              <div className="mt-3 p-3 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg border border-purple-700">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
                  <span className="text-sm font-medium text-purple-200">
                    {analysisMode === 'openai' ? 'Analyzing Transcripts' : 'Analyzing Videos'} with AI
                  </span>
                </div>
                <div className="text-xs text-purple-300">
                  Progress: {batchAnalysisProgress.completed} of {batchAnalysisProgress.total} videos completed
                </div>
                <div className="w-full bg-purple-900 rounded-full h-2 mt-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${batchAnalysisProgress.total > 0 ? (batchAnalysisProgress.completed / batchAnalysisProgress.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            )}

            {searchResults.selectedVideos.length === 0 && (
            <p className="text-sm text-blue-400 mt-2">
                Please select at least one video to perform analysis.
              </p>
            )}
          </div>
          
          {/* Overall Progress Bar */}
          {subtitleGeneration.generatingSubtitles && subtitleGeneration.totalVideosProcessing > 0 && (
            <div className="mt-3 p-3 bg-green-900/20 border border-green-700 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-green-200">
                  Processing Videos ({subtitleGeneration.completedVideosCount}/{subtitleGeneration.totalVideosProcessing})
                </span>
                <span className="text-sm text-green-400">
                  {Math.round((subtitleGeneration.completedVideosCount / subtitleGeneration.totalVideosProcessing) * 100)}%
                </span>
              </div>
              <div className="w-full bg-green-900 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(subtitleGeneration.completedVideosCount / subtitleGeneration.totalVideosProcessing) * 100}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-green-300 mt-1">
                Videos are being processed in parallel. Each completed video will update this progress bar.
              </p>
            </div>
          )}

          {/* Analysis Progress Bar */}
          {isAnalyzingBatch && batchAnalysisProgress.total > 0 && (
            <div className="mt-3 p-3 bg-indigo-900/20 border border-indigo-700 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-indigo-200">
                  Analyzing Videos ({batchAnalysisProgress.completed}/{batchAnalysisProgress.total})
                </span>
                <span className="text-sm text-indigo-400">
                  {Math.round((batchAnalysisProgress.completed / batchAnalysisProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-indigo-900 rounded-full h-3">
                <div 
                  className="bg-indigo-500 h-3 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(batchAnalysisProgress.completed / batchAnalysisProgress.total) * 100}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-indigo-300 mt-1">
                {analysisMode === 'openai' 
                  ? 'Analyzing transcripts with OpenAI for detailed insights and timestamps.'
                  : 'Analyzing videos directly with Gemini AI for comprehensive insights.'
                }
              </p>
            </div>
          )}
          
          {searchResults.selectedVideos.length === 0 && (
            <p className="text-sm text-blue-400 mt-2">
              Please select at least one video to generate subtitles, create summaries, or perform analysis.
            </p>
          )}
          
          {searchResults.selectedVideos.length > 10 && (
            <p className="text-sm text-orange-400 mt-2">
              ⚠️ You have selected {searchResults.selectedVideos.length} videos. Only the first 10 videos will be processed for subtitle generation due to processing limitations.
            </p>
          )}
          
          {analysisMode === 'openai' && searchResults.selectedVideos.length > 0 && getVideosWithSubtitlesCount() === 0 && (
            <p className="text-sm text-purple-400 mt-2">
              Generate subtitles first to enable OpenAI transcript analysis.
            </p>
          )}
        </>
      )}

      {/* Videos List */}
      <div className="space-y-4">
        {searchResults.videos.map((video) => {
          const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`
          const isSelected = searchResults.selectedVideos.includes(video.id.videoId)
          const videoId = video.id.videoId
          const subtitleFile = subtitleGeneration.subtitleFiles.find(sf => sf.videoId === videoId)
          
          return (
            <div key={videoId} className={`bg-gray-800 border border-gray-600 rounded-lg p-6 shadow-sm border-l-4 ${isSelected ? 'border-l-green-500 bg-green-900/20' : 'border-l-red-500'}`}>
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onVideoSelect(video.id.videoId)}
                  className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-white mb-2">{video.snippet.title}</h3>
                  <p className="text-gray-300 mb-3 line-clamp-3">{video.snippet.description}</p>
                  <div className="text-sm text-gray-400 mb-2">
                    <div>Channel: {video.snippet.channelTitle}</div>
                    <div>Published: {formatDate(video.snippet.publishedAt)}</div>
                    {video.statistics && (
                      <div className="flex gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatCount(video.statistics.viewCount)} views
                        </span>
                        {video.statistics.likeCount && (
                          <span className="flex items-center gap-1">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                            </svg>
                            {formatCount(video.statistics.likeCount)}
                          </span>
                        )}
                        {video.statistics.commentCount && (
                          <span className="flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {formatCount(video.statistics.commentCount)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:text-red-800 text-sm underline"
                    >
                      Watch on YouTube
                    </a>
                  </div>
                  
                  {/* Show error if transcript extraction failed */}
                  {subtitleFile && subtitleFile.status === 'error' && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-red-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-red-800">Transcript extraction failed</p>
                          <p className="text-xs text-red-600 mt-1">{subtitleFile.progress}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Show processing status if in progress */}
                  {subtitleFile && ['pending', 'downloading', 'transcribing', 'processing'].includes(subtitleFile.status) && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-blue-400 animate-spin flex-shrink-0" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-blue-800">{getStatusDisplay(subtitleFile).message}</p>
                          {subtitleFile.progress && (
                            <p className="text-xs text-blue-600 mt-1">{subtitleFile.progress}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Show success status if completed */}
                  {subtitleFile && subtitleFile.status === 'completed' && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-green-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-green-800">Transcript ready</p>
                          <p className="text-xs text-green-600 mt-1">
                            {formatFileSize(subtitleFile.size)} • via {subtitleFile.method === 'supadata' ? 'Supadata' : subtitleFile.method}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
} 