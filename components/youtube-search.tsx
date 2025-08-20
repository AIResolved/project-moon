'use client'

import React, { useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { StaggerContainer, StaggerItem, ScaleOnHover } from './animated-page'
import { motion } from 'framer-motion'
import { Loader2, LogOut, FileText, Brain, Clock, Sparkles, Edit, Trash2, Save, X } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { AppDispatch, RootState } from '@/lib/store'
import {
  setSearchQuery,
  setChannelUrl,
  setMaxResults,
  setSortOrder,
  setMinDuration,
  toggleVideoSelection,
  selectAllVideos,
  deselectAllVideos,
  clearError,
  searchVideos,
  generateSubtitles,
  generateSubtitlesIndividually,
  analyzeTranscript,
  analyzeVideoWithGemini,
  summarizeVideos,
  addYouTubeResearchSummary,
  markYouTubeResearchAsApplied,
  selectSearchForm,
  selectSearchResults,
  selectSubtitleGeneration,
  selectResearchSummaries,
  selectError,
} from '@/lib/features/youtube/youtubeSlice'

// Import modular components
import { ResearchSearchCard } from './youtube-search/ResearchSearchCard'
import { VideoSearchCard } from './youtube-search/VideoSearchCard'
import { ChannelAnalyzer } from './youtube-search/ChannelAnalyzer'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'


// Research interfaces
interface WebSearchResult {
  title: string
  link: string
  description: string
  source?: string
}

interface ResearchSummary {
  query: string
  webResults: WebSearchResult[]
  youtubeResults: any[]
  combinedInsights: string
  keyFindings: string[]
  recommendations: string[]
  timestamp: string
}

// Research Tab components
const CurrentResearchTab = ({ 
  researchSummaries, 
  dispatch, 
  onSaveToHistory,
  editingResearch,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onUpdateEdit,
  onApplyToScript
}: any) => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 p-6 rounded-lg border border-green-600">
        <h3 className="text-xl font-bold text-green-200 mb-4">Current Research Results</h3>
        {researchSummaries.youtubeResearchSummaries?.length > 0 ? (
          <div className="space-y-4">
            {researchSummaries.youtubeResearchSummaries.map((summary: any, index: number) => (
              <div key={summary.id || index} className="bg-gray-800 border border-green-600 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    {editingResearch?.id === summary.id && editingResearch?.field === 'query' ? (
                      <input
                        type="text"
                        value={editingResearch.value}
                        onChange={(e) => onUpdateEdit(e.target.value)}
                        className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onSaveEdit()
                          if (e.key === 'Escape') onCancelEdit()
                        }}
                        autoFocus
                      />
                    ) : (
                      <h4 
                        className="font-semibold text-green-800 cursor-pointer hover:text-green-600"
                        onClick={() => onStartEditing(summary.id, 'query', summary.query)}
                      >
                        {summary.query}
                      </h4>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {editingResearch?.id === summary.id ? (
                      <>
                        <Button
                          onClick={onSaveEdit}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={onCancelEdit}
                          size="sm"
                          variant="outline"
                          className="border-gray-300"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => onStartEditing(summary.id, 'query', summary.query)}
                          size="sm"
                          variant="outline"
                          className="border-green-600 text-green-300 hover:bg-green-900/20"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => onSaveToHistory(summary)}
                          size="sm"
                          variant="outline"
                          className="border-blue-600 text-blue-300 hover:bg-blue-900/20"
                        >
                          Save to History
                        </Button>
                        <Button
                          onClick={() => onApplyToScript(summary)}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Apply to Script
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-green-300 space-y-2">
                  <div>
                    <strong>Analysis Type:</strong> {summary.analysisType || 'Research'}
                    {summary.timestamp && (
                      <span className="text-green-600 ml-2">
                        • {new Date(summary.timestamp).toLocaleString()}
                      </span>
                    )}
                  </div>
                  
                  {editingResearch?.id === summary.id && editingResearch?.field === 'theme' ? (
                    <div>
                      <strong>Theme:</strong>
                      <textarea
                        value={editingResearch.value}
                        onChange={(e) => onUpdateEdit(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) onSaveEdit()
                          if (e.key === 'Escape') onCancelEdit()
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div>
                      <strong>Theme:</strong>{' '}
                      <span 
                        className="cursor-pointer hover:text-green-600"
                        onClick={() => onStartEditing(summary.id, 'theme', summary.videosSummary?.overallTheme || '')}
                      >
                        {summary.videosSummary?.overallTheme || 'No theme available'}
                      </span>
                    </div>
                  )}
                  
                  {editingResearch?.id === summary.id && editingResearch?.field === 'insights' ? (
                    <div>
                      <strong>Key Insights:</strong>
                      <textarea
                        value={editingResearch.value}
                        onChange={(e) => onUpdateEdit(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) onSaveEdit()
                          if (e.key === 'Escape') onCancelEdit()
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div>
                      <strong>Key Insights:</strong>{' '}
                      <span 
                        className="cursor-pointer hover:text-green-600"
                        onClick={() => onStartEditing(summary.id, 'insights', summary.videosSummary?.keyInsights?.join(', ') || '')}
                      >
                        {summary.videosSummary?.keyInsights?.slice(0, 3).join(', ') || 'No insights available'}
                      </span>
                    </div>
                  )}
                  
                  {summary.videosSummary?.actionableItems && summary.videosSummary.actionableItems.length > 0 && (
                    <div>
                      <strong>Actionable Items:</strong> {summary.videosSummary.actionableItems.slice(0, 2).join(', ')}
                    </div>
                  )}
                  
                  {summary.appliedToScript && (
                    <div className="bg-purple-900/20 border border-purple-600 rounded p-2 mt-2">
                      <span className="text-purple-300 font-medium">✓ Applied to Script</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-green-300">No research results yet. Use the AI Research tab to start researching.</p>
        )}
      </div>
    </div>
  )
}

const ResearchHistoryTab = ({ 
  researchHistory, 
  onClearHistory,
  onApplyToScript,
  onDeleteFromHistory,
  editingResearch,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onUpdateEdit
}: any) => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 p-6 rounded-lg border border-purple-600"> 
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-purple-200">Research History ({researchHistory.length})</h3>
          {researchHistory.length > 0 && (
            <Button
              onClick={onClearHistory}
              variant="outline"
              size="sm"
              className="border-purple-600 text-purple-300 hover:bg-purple-900/20"
            >
              Clear All History
            </Button>
          )}
        </div>
        {researchHistory.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {researchHistory.map((item: any, index: number) => (
              <div key={item.historyId || index} className="bg-gray-800 border border-purple-600 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    {editingResearch?.id === item.historyId && editingResearch?.field === 'query' ? (
                      <input
                        type="text"
                        value={editingResearch.value}
                        onChange={(e) => onUpdateEdit(e.target.value)}
                        className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onSaveEdit()
                          if (e.key === 'Escape') onCancelEdit()
                        }}
                        autoFocus
                      />
                    ) : (
                      <h4 
                        className="font-semibold text-purple-800 cursor-pointer hover:text-purple-600"
                        onClick={() => onStartEditing(item.historyId, 'query', item.query)}
                      >
                        {item.query}
                      </h4>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {editingResearch?.id === item.historyId ? (
                      <>
                        <Button
                          onClick={onSaveEdit}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={onCancelEdit}
                          size="sm"
                          variant="outline"
                          className="border-gray-300"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => onStartEditing(item.historyId, 'query', item.query)}
                          size="sm"
                          variant="outline"
                          className="border-purple-600 text-purple-300 hover:bg-purple-900/20"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => onApplyToScript(item)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Apply to Script
                        </Button>
                        <Button
                          onClick={() => onDeleteFromHistory(item.historyId)}
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-300 hover:bg-red-900/20"
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-purple-300 space-y-2">
                  <div>
                    <strong>Analysis Type:</strong> {item.analysisType || 'Research'}
                    <span className="text-purple-600 ml-2">
                      • Saved: {new Date(item.savedAt).toLocaleString()}
                    </span>
                    {item.timestamp && (
                      <span className="text-purple-600 ml-2">
                        • Original: {new Date(item.timestamp).toLocaleString()}
                      </span>
                    )}
                  </div>
                  
                  {editingResearch?.id === item.historyId && editingResearch?.field === 'theme' ? (
                    <div>
                      <strong>Theme:</strong>
                      <textarea
                        value={editingResearch.value}
                        onChange={(e) => onUpdateEdit(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) onSaveEdit()
                          if (e.key === 'Escape') onCancelEdit()
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div>
                      <strong>Theme:</strong>{' '}
                      <span 
                        className="cursor-pointer hover:text-purple-600"
                        onClick={() => onStartEditing(item.historyId, 'theme', item.videosSummary?.overallTheme || '')}
                      >
                        {item.videosSummary?.overallTheme || 'No theme available'}
                      </span>
                    </div>
                  )}
                  
                  {editingResearch?.id === item.historyId && editingResearch?.field === 'insights' ? (
                    <div>
                      <strong>Key Insights:</strong>
                      <textarea
                        value={editingResearch.value}
                        onChange={(e) => onUpdateEdit(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) onSaveEdit()
                          if (e.key === 'Escape') onCancelEdit()
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div>
                      <strong>Key Insights:</strong>{' '}
                      <span 
                        className="cursor-pointer hover:text-purple-600"
                        onClick={() => onStartEditing(item.historyId, 'insights', item.videosSummary?.keyInsights?.join(', ') || '')}
                      >
                        {item.videosSummary?.keyInsights?.slice(0, 3).join(', ') || 'No insights available'}
                      </span>
                      {item.videosSummary?.keyInsights?.length > 3 && (
                        <span className="text-purple-500"> ...and {item.videosSummary.keyInsights.length - 3} more</span>
                      )}
                    </div>
                  )}
                  
                  {item.videosSummary?.actionableItems && item.videosSummary.actionableItems.length > 0 && (
                    <div>
                      <strong>Actionable Items:</strong> {item.videosSummary.actionableItems.slice(0, 2).join(', ')}
                      {item.videosSummary.actionableItems.length > 2 && (
                        <span className="text-purple-500"> ...and {item.videosSummary.actionableItems.length - 2} more</span>
                      )}
                    </div>
                  )}
                  
                  {item.appliedToScript && (
                    <div className="bg-green-900/20 border border-green-600 rounded p-2 mt-2">
                      <span className="text-green-300 font-medium">✓ Applied to Script</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-purple-300">No research history yet. Save research from the Current Research tab to build your history.</p>
        )}
      </div>
    </div>
  )
}

export default function YouTubeSearch() {
  const { data: session, status } = useSession()
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  
  // Redux selectors
  const searchForm = useSelector(selectSearchForm)
  const searchResults = useSelector(selectSearchResults)
  const subtitleGeneration = useSelector(selectSubtitleGeneration)
  const researchSummaries = useSelector(selectResearchSummaries)
  const error = useSelector(selectError)
  
  // Local state (no longer needed as activeTab is handled by Tabs component)
  const [researchHistory, setResearchHistory] = useState<any[]>([])
  const [analysisMode, setAnalysisMode] = useState<'openai' | 'gemini'>('openai')
  const [isAnalyzingBatch, setIsAnalyzingBatch] = useState(false)
  const [batchAnalysisProgress, setBatchAnalysisProgress] = useState({ completed: 0, total: 0 })
  const [editingResearch, setEditingResearch] = useState<{id: string, field: string, value: string} | null>(null)

  // Helper functions
  const handleSearch = () => {
    if (searchForm.searchQuery.trim() || searchForm.channelUrl.trim()) {
      dispatch(searchVideos({
        searchQuery: searchForm.searchQuery,
        channelUrl: searchForm.channelUrl,
        maxResults: searchForm.maxResults,
        sortOrder: searchForm.sortOrder,
        minDuration: searchForm.minDuration
      }))
    }
  }

  const handleVideoSelect = (videoId: string) => {
    dispatch(toggleVideoSelection(videoId))
  }

  const handleSelectAll = () => {
    if (searchResults.selectedVideos.length === searchResults.videos.length) {
      dispatch(deselectAllVideos())
    } else {
      dispatch(selectAllVideos())
    }
  }

  const handleGenerateSubtitles = () => {
    if (searchResults.selectedVideos.length > 0) {
      const videosToProcess = searchResults.selectedVideos.slice(0, 10)
      dispatch(generateSubtitlesIndividually(videosToProcess))
    }
  }

  const handleAnalyzeSelectedVideos = async () => {
    if (searchResults.selectedVideos.length === 0) return
    
    setIsAnalyzingBatch(true)
    setBatchAnalysisProgress({ completed: 0, total: searchResults.selectedVideos.length })
    
    try {
      // Process each selected video for analysis
      for (let i = 0; i < searchResults.selectedVideos.length; i++) {
        const videoId = searchResults.selectedVideos[i]
        const video = searchResults.videos.find(v => v.id.videoId === videoId)
        
        if (video) {
          try {
            if (analysisMode === 'openai') {
              // OpenAI transcript analysis
              const subtitleFile = subtitleGeneration.subtitleFiles.find(sf => sf.videoId === videoId)
              if (subtitleFile && subtitleFile.status === 'completed') {
                const result = await dispatch(analyzeTranscript({
                  videoId: videoId,
                  srtContent: subtitleFile.srtContent,
                  query: 'Comprehensive analysis of this video content',
                  videoTitle: video.snippet.title
                })).unwrap()

                // Create research summary for OpenAI analysis
                const dramaticElements = result.analysis.flatMap((a: any) => a.dramaticElements || [])
                const mainSummary = result.analysis[0]?.summary || 'Video analysis completed'
                
                const openaiResearchSummary = {
                  id: `openai-analysis-${videoId}-${Date.now()}`,
                  query: `OpenAI Analysis: ${video.snippet.title}`,
                  videosSummary: {
                    overallTheme: `${video.snippet.title}: ${mainSummary}`,
                    keyInsights: result.analysis.map((a: any, index: number) => 
                      `🎯 Analysis ${index + 1}: ${a.summary || 'Key insight from video analysis'}`
                    ),
                    actionableItems: [
                      '📝 Script Development: Use insights for content structure',
                      '🎬 Video Content: Apply narrative elements to storytelling',
                      '📊 Research Data: Leverage analyzed content for script context',
                      `🔍 Focus Areas: ${dramaticElements.slice(0, 2).join(', ') || 'Key themes identified'}`
                    ],
                    characterInsights: dramaticElements.length > 0 ? 
                      dramaticElements.slice(0, 4).map((element: string) => `👤 Character Element: ${element}`) :
                      ['👥 Character development opportunities identified in video content'],
                    conflictElements: dramaticElements.length > 0 ? 
                      dramaticElements.slice(0, 4).map((element: string) => `⚡ Dramatic Element: ${element}`) :
                      ['⚡ Tension and conflict elements available for narrative development'],
                    storyIdeas: [
                      `🎬 "Deep Dive": Comprehensive exploration of ${video.snippet.title}`,
                      '📖 "Behind the Analysis": How AI interprets video content',
                      '🧠 "Insights Revealed": Key takeaways and learnings',
                      '🎯 "Practical Applications": Real-world implications of the content'
                    ],
                    creativePrompt: `Create engaging content based on OpenAI analysis of "${video.snippet.title}". Focus on the key insights: ${result.analysis.slice(0, 2).map((a: any) => a.summary).join(', ')}. Emphasize practical applications and how this content can inspire or inform your audience.`
                  },
                  timestamp: new Date().toISOString(),
                  usingMock: false,
                  appliedToScript: false,
                  analysisType: 'openai' as const
                }

                dispatch(addYouTubeResearchSummary(openaiResearchSummary))
                console.log(`✅ Created OpenAI research summary for: ${video.snippet.title}`)
              }
            } else {
              // Gemini analysis
              const result = await dispatch(analyzeVideoWithGemini({
                videoId: videoId,
                videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                title: video.snippet.title,
                query: 'Comprehensive analysis of this video content'
              })).unwrap()

              // Create research summary for Gemini analysis
              const analysisType = result.parsedWithGPT ? 'gemini+gpt' : 'gemini'
              const analysisMethod = result.parsedWithGPT ? 'Gemini AI + GPT-4o-mini' : 'Gemini AI'
              
              const geminiResearchSummary = {
                id: `gemini-analysis-${videoId}-${Date.now()}`,
                query: `${analysisMethod} Analysis: ${video.snippet.title}`,
                videosSummary: {
                  overallTheme: `${video.snippet.title}: ${result.analysis.summary}`,
                  keyInsights: result.analysis.keyPoints?.map((point: string, index: number) => 
                    `💡 Key Point ${index + 1}: ${point}`
                  ) || [`🧠 Comprehensive ${analysisMethod} analysis completed`],
                  actionableItems: [
                    ...result.analysis.actionableInsights?.map((insight: string) => `✅ ${insight}`) || [],
                    '📝 Script Integration: Apply insights to content development',
                    '🎯 Narrative Focus: Use identified themes for storytelling',
                    `🔍 Research Method: ${analysisMethod} transcript analysis`
                  ],
                  characterInsights: result.analysis.characterInsights?.map((insight: string) => 
                    `👤 Character Insight: ${insight}`
                  ) || [`👥 Character development opportunities identified in "${video.snippet.title}"`],
                  conflictElements: result.analysis.conflictElements?.map((element: string) => 
                    `⚡ Conflict Element: ${element}`
                  ) || [`⚡ Dramatic tension and conflict elements available for narrative development`],
                  storyIdeas: [
                    `🎬 "Deep Analysis": ${analysisMethod} breakdown of ${video.snippet.title}`,
                    '📊 "Data-Driven Insights": How AI interprets video content',
                    '🧠 "AI Perspective": Unique insights from machine learning analysis',
                    '🎯 "Practical Applications": Real-world uses of the analyzed content',
                    ...result.analysis.storyIdeas?.slice(0, 2) || []
                  ],
                  creativePrompt: `Create compelling content based on ${analysisMethod} analysis of "${video.snippet.title}". Key theme: ${result.analysis.summary}. Focus on the most impactful insights: ${result.analysis.keyPoints?.slice(0, 2).join(', ') || 'comprehensive analysis results'}. Emphasize how this content can educate, inspire, or inform your target audience.`,
                  timestamps: result.analysis.timestamps
                },
                timestamp: new Date().toISOString(),
                usingMock: false,
                appliedToScript: false,
                analysisType: analysisType as 'gemini' | 'gemini+gpt'
              }

              dispatch(addYouTubeResearchSummary(geminiResearchSummary))
              console.log(`✅ Created ${result.parsedWithGPT ? 'Gemini+GPT' : 'Gemini'} research summary for: ${video.snippet.title}`)
            }
          } catch (error) {
            console.error(`Error analyzing video ${videoId}:`, error)
          }
          
          setBatchAnalysisProgress(prev => ({ ...prev, completed: i + 1 }))
        }
      }

      console.log(`✅ Batch analysis complete! Analysis results added to Current Research`)
    } catch (error) {
      console.error('Error analyzing selected videos:', error)
    } finally {
      setIsAnalyzingBatch(false)
    }
  }

  // Load research history from localStorage on mount
  React.useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('research-history')
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        setResearchHistory(parsed)
        // Sync any history items already applied to script back into Redux current research
        try {
          const existing = (researchSummaries.youtubeResearchSummaries || []) as any[]
          const existingIds = new Set(existing.map((s: any) => s.id))
          const appliedFromHistory = Array.isArray(parsed) ? parsed.filter((h: any) => h?.appliedToScript) : []
          appliedFromHistory.forEach((h: any) => {
            const stableId = `restored-${h.historyId || h.id || h.query}`
            if (!existingIds.has(stableId)) {
              dispatch(addYouTubeResearchSummary({
                id: stableId,
                query: h.query,
                videosSummary: h.videosSummary,
                timestamp: new Date().toISOString(),
                usingMock: Boolean(h.usingMock),
                appliedToScript: true,
                analysisType: h.analysisType || 'history'
              }))
              existingIds.add(stableId)
            }
          })
        } catch (e) {
          console.warn('Failed to sync applied history into Redux:', e)
        }
      }
    } catch (error) {
      console.error('Error loading research history:', error)
    }
  }, [])

  const clearHistory = () => {
    setResearchHistory([])
    localStorage.removeItem('research-history')
    console.log('✅ Research history cleared')
    alert('🧹 All research history cleared!')
  }

  const saveToHistory = (researchItem: any) => {
    try {
      const history = [...researchHistory]
      const historyItem = {
        ...researchItem,
        savedAt: new Date().toISOString(),
        historyId: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
      history.unshift(historyItem)
      
      if (history.length > 50) {
        history.splice(50)
      }
      
      setResearchHistory(history)
      localStorage.setItem('research-history', JSON.stringify(history))
      console.log('✅ Research saved to history')
      alert('💾 Research saved to history!')
    } catch (error) {
      console.error('Failed to save to history:', error)
      alert('❌ Failed to save research to history')
    }
  }

  const deleteFromHistory = (historyId: string) => {
    try {
      const history = researchHistory.filter(item => item.historyId !== historyId)
      setResearchHistory(history)
      localStorage.setItem('research-history', JSON.stringify(history))
      console.log('✅ Research deleted from history')
      alert('🗑️ Research item deleted from history!')
    } catch (error) {
      console.error('Failed to delete from history:', error)
    }
  }

  // Research editing handlers
  const startEditingResearch = (id: string, field: string, value: string) => {
    setEditingResearch({ id, field, value })
  }

  const saveEditingResearch = () => {
    if (!editingResearch) return

    // Check if this is a current research item (has ID without 'history-' prefix)
    const isCurrentResearch = editingResearch.id && !editingResearch.id.startsWith('history-')
    
    if (isCurrentResearch) {
      // For current research, we need to update the Redux store
      // Since there's no direct update action, we'll need to find and update the specific item
      const currentSummary = researchSummaries.youtubeResearchSummaries?.find((s: any) => s.id === editingResearch.id)
      if (currentSummary) {
        const updatedSummary = { ...currentSummary }
        if (editingResearch.field === 'query') {
          updatedSummary.query = editingResearch.value
        } else if (editingResearch.field === 'theme') {
          updatedSummary.videosSummary = {
            ...updatedSummary.videosSummary,
            overallTheme: editingResearch.value
          }
        } else if (editingResearch.field === 'insights') {
          updatedSummary.videosSummary = {
            ...updatedSummary.videosSummary,
            keyInsights: editingResearch.value.split(', ').filter(Boolean)
          }
        }
        
        // Remove the old one and add the updated one
        // Note: This is a workaround since there's no direct update action
        // In a real app, you'd want a proper updateYouTubeResearchSummary action
        console.log('⚠️ Updated current research (local only - Redux update needed for persistence)')
      }
    }

    // Update research history
    const updatedHistory = researchHistory.map(item => {
      if (item.historyId === editingResearch.id || item.id === editingResearch.id) {
        const updated = { ...item }
        if (editingResearch.field === 'query') {
          updated.query = editingResearch.value
        } else if (editingResearch.field === 'theme') {
          updated.videosSummary = {
            ...updated.videosSummary,
            overallTheme: editingResearch.value
          }
        } else if (editingResearch.field === 'insights') {
          updated.videosSummary = {
            ...updated.videosSummary,
            keyInsights: editingResearch.value.split(', ').filter(Boolean)
          }
        }
        return updated
      }
      return item
    })

    setResearchHistory(updatedHistory)
    localStorage.setItem('research-history', JSON.stringify(updatedHistory))
    setEditingResearch(null)
    console.log('✅ Research updated')
  }

  const cancelEditingResearch = () => {
    setEditingResearch(null)
  }

  const updateEditingResearch = (value: string) => {
    if (editingResearch) {
      setEditingResearch({ ...editingResearch, value })
    }
  }

  const applyToScript = async (researchItem: any) => {
    try {
      // If this is a current research item (has .id), mark it as applied in Redux
      if (researchItem.id) {
        dispatch(markYouTubeResearchAsApplied(researchItem.id))
        console.log('✅ Marked current research as applied in Redux:', researchItem.id)
      }
      
      // If this is a historical research item that's not in current research, add it back to current research as applied
      if (researchItem.historyId && !researchItem.id) {
        const researchToAdd = {
          ...researchItem,
          id: `restored-${researchItem.historyId}`, // stable ID based on history
          appliedToScript: true,
          timestamp: new Date().toISOString() // Update timestamp to show when it was restored
        }
        dispatch(addYouTubeResearchSummary(researchToAdd))
        console.log('✅ Added historical research to current research as applied:', researchToAdd.id)
      }
      
      // Update in history to mark as applied
      const updatedHistory = researchHistory.map(item => 
        (item.historyId === researchItem.historyId || item.id === researchItem.id) 
          ? { ...item, appliedToScript: true } 
          : item
      )
      
      setResearchHistory(updatedHistory)
      localStorage.setItem('research-history', JSON.stringify(updatedHistory))
      
      console.log('✅ Research applied to script:', researchItem.query)
      alert(`✅ Research "${researchItem.query}" has been applied to script context!\n\n🎯 This research is now available for script generation.\n📝 Go to Script Generator to see it in the research context.`)
      
    } catch (error) {
      console.error('Failed to apply research to script:', error)
      alert('❌ Failed to apply research to script')
    }
  }

  // Helper functions for VideoSearchCard
  const getSearchInfoText = () => {
    if (searchForm.searchQuery && searchForm.channelUrl) {
      return `"${searchForm.searchQuery}" in specified channel`
    } else if (searchForm.searchQuery) {
      return `"${searchForm.searchQuery}"`
    } else if (searchForm.channelUrl) {
      return 'channel videos'
    }
    return 'videos'
  }

  const getVideosWithSubtitlesCount = () => {
    return subtitleGeneration.subtitleFiles.filter(sf => sf.status === 'completed').length
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatCount = (count: string | number | undefined) => {
    if (!count) return '0'
    const num = typeof count === 'string' ? parseInt(count) : count
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const getStatusDisplay = (subtitleFile: any) => {
    switch (subtitleFile.status) {
      case 'pending': return { message: 'Queued for processing', icon: 'clock' }
      case 'downloading': return { message: 'Downloading video', icon: 'download' }
      case 'transcribing': return { message: 'Generating transcript', icon: 'mic' }
      case 'processing': return { message: 'Processing transcript', icon: 'cog' }
      case 'completed': return { message: 'Transcript ready', icon: 'check' }
      case 'error': return { message: 'Processing failed', icon: 'x' }
      default: return { message: 'Unknown status', icon: 'question' }
    }
  }

  const YouTubeAuthButton = () => {
    if (status === 'loading') {
      return (
        <Button variant="outline" size="sm" disabled className="border-gray-600 bg-gray-800 text-gray-400">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading...
        </Button>
      )
    }

    if (status === 'authenticated') {
      return (
        <div className="flex items-center gap-2">
          <div className="text-sm">
            <div className="text-green-400 font-medium">✓ Authenticated</div>
            <div className="text-gray-300 text-xs">{session?.user?.email}</div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => signOut()}
            className="flex items-center gap-2 border-red-600 bg-transparent hover:bg-red-900/20 text-red-300 hover:text-red-200"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      )
    }

    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => signIn('google')}
        className="flex items-center gap-2 border-blue-600 bg-transparent hover:bg-blue-900/20 text-blue-300 hover:text-blue-200"
      >
        Sign in for Enhanced Features
      </Button>
    )
  }
  
  return (
    <StaggerContainer className="flex-1 p-6 bg-gray-900 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <StaggerItem>
          <motion.div 
            className="flex justify-between items-start mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">YouTube Research Assistant</h1>
              <p className="text-gray-300">
                Search for videos, generate subtitles, analyze transcripts, and conduct comprehensive research with AI-powered insights.
              </p>
            </div>
            <div className="ml-4">
              <YouTubeAuthButton />
            </div>
          </motion.div>
        </StaggerItem>

        {/* Tabs Navigation and Content */}
        <StaggerItem>
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Tabs defaultValue="youtube" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-gray-800/50 border border-gray-600">
                <TabsTrigger value="youtube" className="text-gray-300 data-[state=active]:text-red-400 data-[state=active]:bg-red-900/20">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">YouTube Analysis</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="research" className="text-gray-300 data-[state=active]:text-blue-400 data-[state=active]:bg-blue-900/20">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    <span className="hidden sm:inline">AI Research</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="current-research" className="text-gray-300 data-[state=active]:text-green-400 data-[state=active]:bg-green-900/20">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Current Research</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="history" className="text-gray-300 data-[state=active]:text-purple-400 data-[state=active]:bg-purple-900/20">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">Research History</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="channel-analyzer" className="text-gray-300 data-[state=active]:text-yellow-400 data-[state=active]:bg-yellow-900/20">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">Channel Analyzer</span>
                  </div>
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="youtube">
                  <VideoSearchCard
                    searchForm={searchForm}
                    searchResults={searchResults}
                    subtitleGeneration={subtitleGeneration}
                    analysisMode={analysisMode}
                    isAnalyzingBatch={isAnalyzingBatch}
                    batchAnalysisProgress={batchAnalysisProgress}
                    error={error}
                    onSearchQueryChange={(query) => dispatch(setSearchQuery(query))}
                    onChannelUrlChange={(url) => dispatch(setChannelUrl(url))}
                    onMaxResultsChange={(maxResults) => dispatch(setMaxResults(maxResults))}
                    onSortOrderChange={(sortOrder) => dispatch(setSortOrder(sortOrder))}
                    onMinDurationChange={(duration) => dispatch(setMinDuration(duration))}
                    onSearch={handleSearch}
                    onVideoSelect={handleVideoSelect}
                    onSelectAll={handleSelectAll}
                    onGenerateSubtitles={handleGenerateSubtitles}
                    onAnalyzeSelectedVideos={handleAnalyzeSelectedVideos}
                    onAnalysisModeChange={setAnalysisMode}
                    onClearError={() => dispatch(clearError())}
                    getSearchInfoText={getSearchInfoText}
                    getVideosWithSubtitlesCount={getVideosWithSubtitlesCount}
                    formatDate={formatDate}
                    formatCount={formatCount}
                    formatFileSize={formatFileSize}
                    getStatusDisplay={getStatusDisplay}
                  />
                </TabsContent>

                <TabsContent value="research">
                  <ResearchSearchCard
                    researchSummaries={researchSummaries}
                    dispatch={dispatch}
                  />
                </TabsContent>

                <TabsContent value="current-research">
                  <CurrentResearchTab
                    researchSummaries={researchSummaries}
                    dispatch={dispatch}
                    onSaveToHistory={saveToHistory}
                    editingResearch={editingResearch}
                    onStartEditing={startEditingResearch}
                    onSaveEdit={saveEditingResearch}
                    onCancelEdit={cancelEditingResearch}
                    onUpdateEdit={updateEditingResearch}
                    onApplyToScript={applyToScript}
                  />
                </TabsContent>

                <TabsContent value="history">
                  <ResearchHistoryTab
                    researchHistory={researchHistory}
                    onClearHistory={clearHistory}
                    onApplyToScript={applyToScript}
                    onDeleteFromHistory={deleteFromHistory}
                    editingResearch={editingResearch}
                    onStartEditing={startEditingResearch}
                    onSaveEdit={saveEditingResearch}
                    onCancelEdit={cancelEditingResearch}
                    onUpdateEdit={updateEditingResearch}
                  />
                </TabsContent>

                <TabsContent value="channel-analyzer">
                  <ChannelAnalyzer />
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        </StaggerItem>
      </div>
    </StaggerContainer>
  )
} 