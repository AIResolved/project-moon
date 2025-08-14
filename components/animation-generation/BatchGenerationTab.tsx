'use client'

import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { useState } from 'react'
import {
  Play,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Info,
  Trash2,
  Download,
  CheckCircle,
  RotateCcw,
  CheckSquare
} from 'lucide-react'

interface ExtractedAnimationScene {
  id: string
  title: string
  prompt: string
  duration?: number
  effects?: string[]
}

interface BatchGenerationResult {
  id: string
  url: string
  prompt: string
  sceneId: string
  sceneTitle: string
}

interface BatchGenerationTabProps {
  allPrompts: ExtractedAnimationScene[]
  selectedPrompts: string[]
  setSelectedPrompts: (prompts: string[]) => void
  referenceImages: File[]
  isBatchGenerating: boolean
  batchProgress: { current: number; total: number }
  batchResults: BatchGenerationResult[]
  batchError: string | null
  currentBatchIndex: number
  batchDelayRemaining: number
  onBatchGenerate: () => void
  onClearBatchResults: () => void
  onRegenerateImage: (prompt: string, resultId: string) => void
  singleResults?: BatchGenerationResult[]
  onClearSingleResults?: () => void
}

export function BatchGenerationTab({
  allPrompts,
  selectedPrompts,
  setSelectedPrompts,
  referenceImages,
  isBatchGenerating,
  batchProgress,
  batchResults,
  batchError,
  currentBatchIndex,
  batchDelayRemaining,
  onBatchGenerate,
  onClearBatchResults,
  onRegenerateImage,
  singleResults = [],
  onClearSingleResults
}: BatchGenerationTabProps) {

  
  const handleTogglePromptSelection = (promptId: string) => {
    setSelectedPrompts(
      selectedPrompts.includes(promptId)
        ? selectedPrompts.filter(id => id !== promptId)
        : [...selectedPrompts, promptId]
    )
  }

  const handleSelectAllPrompts = () => {
    setSelectedPrompts(allPrompts.map(prompt => prompt.id))
  }

  const handleDeselectAllPrompts = () => {
    setSelectedPrompts([])
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5 text-green-600" />
          Batch Generation
        </CardTitle>
        <CardDescription>
          Generate images for multiple selected scenes with progress tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prerequisites Check */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900">Prerequisites</h4>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li>• Extract scenes from your script first</li>
                <li>• Select scenes you want to generate</li>
                <li>• Upload reference images</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Prompt Selection */}
        {allPrompts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Select Prompts for Batch Generation ({allPrompts.length} available)
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllPrompts}
                  disabled={selectedPrompts.length === allPrompts.length}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAllPrompts}
                  disabled={selectedPrompts.length === 0}
                >
                  Deselect All
                </Button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {allPrompts.map((prompt) => (
                <div key={prompt.id} className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedPrompts.includes(prompt.id) 
                    ? 'border-green-500 bg-green-50' 
                    : 'hover:border-gray-300'
                }`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedPrompts.includes(prompt.id)}
                      onChange={() => handleTogglePromptSelection(prompt.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-gray-900">{prompt.title}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {prompt.effects?.[0] === 'manual' ? '✍️ Manual' : '🤖 Extracted'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{prompt.prompt}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{allPrompts.length}</div>
              <div className="text-sm text-gray-600">Total Prompts</div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{selectedPrompts.length}</div>
              <div className="text-sm text-gray-600">Selected</div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{referenceImages.length}</div>
              <div className="text-sm text-gray-600">Reference Images</div>
            </div>
          </Card>
        </div>

        {/* Batch Generation Controls */}
        <div className="space-y-4">
          <Button
            onClick={onBatchGenerate}
            disabled={isBatchGenerating || selectedPrompts.length === 0 || referenceImages.length === 0}
            className="w-full"
            size="lg"
          >
            {isBatchGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating... ({batchProgress.current}/{batchProgress.total})
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Start Batch Generation ({selectedPrompts.length} prompts)
              </>
            )}
          </Button>

          {/* Enhanced Progress Bar */}
          {isBatchGenerating && batchProgress.total > 0 && (
            <div className="space-y-4">
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Overall Progress</span>
                  <span className="text-blue-600 font-medium">
                    {batchProgress.current}/{batchProgress.total} images ({Math.round((batchProgress.current / batchProgress.total) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Batch Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">
                    Current Batch: {currentBatchIndex} / {Math.ceil(batchProgress.total / 10)}
                  </span>
                  <span className="text-xs text-blue-700">
                    Batch Size: 10 images
                  </span>
                </div>
                
                {/* Countdown Timer */}
                {batchDelayRemaining > 0 && (
                  <div className="mt-2 text-center">
                    <div className="text-sm text-blue-800 mb-1">
                      Next batch starts in:
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.floor(batchDelayRemaining / 60)}:{(batchDelayRemaining % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${((60 - batchDelayRemaining) / 60) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Batch Error */}
        {batchError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Batch Generation Failed</h4>
                <p className="text-sm text-red-700 mt-1">{batchError}</p>
              </div>
            </div>
          </div>
        )}

        {/* All Results (Single + Batch) */}
        {(singleResults.length > 0 || batchResults.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                All Generated Images ({singleResults.length + batchResults.length})
              </Label>
              <div className="flex gap-2">
                {singleResults.length > 0 && onClearSingleResults && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearSingleResults}
                    disabled={isBatchGenerating}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Single
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearBatchResults}
                  disabled={isBatchGenerating}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
                {(batchResults.length > 0 || singleResults.length > 0) && (
                  <div className="text-sm text-green-600 font-medium">
                    ✅ Results automatically available in Image Generator
                  </div>
                )}
              </div>
            </div>

            {/* Single Generation Results */}
            {singleResults.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-purple-700">
                  Single Generation Results ({singleResults.length})
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {singleResults.map((result) => (
                    <Card key={result.id} className="overflow-hidden border-purple-200">
                      <div className="relative">
                        <img
                          src={result.url}
                          alt={result.sceneTitle}
                          className="w-full h-48 object-cover"
                        />

                        <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                          Single
                        </div>
                        {/* Info icon with tooltip */}
                        <div className="absolute bottom-2 right-2 group">
                          <div className="bg-black bg-opacity-60 rounded-full p-2 cursor-help">
                            <Info className="h-3 w-3 text-white" />
                          </div>
                          {/* Tooltip */}
                          <div className="absolute right-0 bottom-8 bg-black text-white text-xs rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 w-80 max-w-xs">
                            <div className="font-semibold mb-1">Prompt Used:</div>
                            <div className="break-words">{result.prompt}</div>
                            {/* Arrow */}
                            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-black transform rotate-45"></div>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-3 bg-purple-50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-purple-900 mb-1 truncate">{result.sceneTitle}</h4>
                            <p className="text-xs text-purple-700 line-clamp-2">{result.prompt.substring(0, 80)}...</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onRegenerateImage(result.prompt, result.id)}
                              disabled={isBatchGenerating}
                              className="h-7 w-7 p-0"
                              title="Regenerate with same prompt"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a')
                                link.href = result.url
                                link.download = `${result.sceneTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`
                                link.target = '_blank'
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                              }}
                              className="h-7 w-7 p-0"
                              title="Download image"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Batch Generation Results */}
            {batchResults.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-green-700">
                  Batch Generation Results ({batchResults.length})
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {batchResults.map((result) => (
                    <Card key={result.id} className="overflow-hidden border-green-200">
                      <div className="relative">
                        <img
                          src={result.url}
                          alt={result.sceneTitle}
                          className="w-full h-48 object-cover"
                        />

                        <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                          Batch
                        </div>
                        {/* Info icon with tooltip */}
                        <div className="absolute bottom-2 right-2 group">
                          <div className="bg-black bg-opacity-60 rounded-full p-2 cursor-help">
                            <Info className="h-3 w-3 text-white" />
                          </div>
                          {/* Tooltip */}
                          <div className="absolute right-0 bottom-8 bg-black text-white text-xs rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 w-80 max-w-xs">
                            <div className="font-semibold mb-1">Prompt Used:</div>
                            <div className="break-words">{result.prompt}</div>
                            {/* Arrow */}
                            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-black transform rotate-45"></div>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-3 bg-green-50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-green-900 mb-1 truncate">{result.sceneTitle}</h4>
                            <p className="text-xs text-green-700 line-clamp-2">{result.prompt.substring(0, 80)}...</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onRegenerateImage(result.prompt, result.id)}
                              disabled={isBatchGenerating}
                              className="h-7 w-7 p-0"
                              title="Regenerate with same prompt"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a')
                                link.href = result.url
                                link.download = `${result.sceneTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`
                                link.target = '_blank'
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                              }}
                              className="h-7 w-7 p-0"
                              title="Download image"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}