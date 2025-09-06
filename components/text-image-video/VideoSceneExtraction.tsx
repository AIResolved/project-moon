'use client'

import { useState } from 'react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Slider } from '../ui/slider'
import { Checkbox } from '../ui/checkbox'
import { ScrollArea } from '../ui/scroll-area'
import { Input } from '../ui/input'
import { FileText, Sparkles, RefreshCw, Trash2, Edit3, Save, X, Plus, AlertCircle } from 'lucide-react'
import type { ExtractedVideoScene } from '@/types/text-image-video-generation'

interface VideoSceneExtractionProps {
  scriptInput: string
  onScriptInputChange: (value: string) => void
  numberOfScenesToExtract: number
  onNumberOfScenesChange: (value: number) => void
  isExtractingScenes: boolean
  sceneExtractionError: string | null
  extractedScenes: ExtractedVideoScene[]
  selectedScenes: number[]
  onToggleSceneSelection: (index: number) => void
  onExtractScenes: () => void
  onClearError: () => void
  onUpdateScenePrompt?: (index: number, newPrompt: string) => void
  onAddCustomScene?: (prompt: string, title: string) => void
  scriptSourceInfo: {
    source: string
    count: number
    type: string
  }
}

export function VideoSceneExtraction({
  scriptInput,
  onScriptInputChange,
  numberOfScenesToExtract,
  onNumberOfScenesChange,
  isExtractingScenes,
  sceneExtractionError,
  extractedScenes,
  selectedScenes,
  onToggleSceneSelection,
  onExtractScenes,
  onClearError,
  onUpdateScenePrompt,
  onAddCustomScene,
  scriptSourceInfo
}: VideoSceneExtractionProps) {
  
  const [editingScene, setEditingScene] = useState<number | null>(null)
  const [editPrompt, setEditPrompt] = useState('')
  const [showCustomScene, setShowCustomScene] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [customTitle, setCustomTitle] = useState('')

  const handleStartEdit = (index: number, currentPrompt: string) => {
    setEditingScene(index)
    setEditPrompt(currentPrompt)
  }

  const handleSaveEdit = () => {
    if (editingScene !== null && onUpdateScenePrompt) {
      onUpdateScenePrompt(editingScene, editPrompt)
      setEditingScene(null)
      setEditPrompt('')
    }
  }

  const handleCancelEdit = () => {
    setEditingScene(null)
    setEditPrompt('')
  }

  const handleAddCustomScene = () => {
    if (customPrompt.trim() && customTitle.trim() && onAddCustomScene) {
      onAddCustomScene(customPrompt.trim(), customTitle.trim())
      setCustomPrompt('')
      setCustomTitle('')
      setShowCustomScene(false)
    }
  }

  const handleSelectAll = () => {
    const allIndices = extractedScenes.map((_, index) => index)
    const allSelected = allIndices.every(index => selectedScenes.includes(index))
    
    if (allSelected) {
      // If all are selected, deselect all
      selectedScenes.forEach(index => onToggleSceneSelection(index))
    } else {
      // Select all unselected scenes
      allIndices.filter(index => !selectedScenes.includes(index))
        .forEach(index => onToggleSceneSelection(index))
    }
  }

  return (
    <div className="space-y-6">
      {/* Script Input Section */}
      <Card className="bg-gray-900 border-gray-700 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            Script Input for Video Generation
            {scriptSourceInfo.count > 0 && (
              <Badge variant="outline" className="ml-2">
                {scriptSourceInfo.source} ({scriptSourceInfo.count} {scriptSourceInfo.type})
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {scriptInput.trim() 
              ? "Your generated script is loaded below. You can edit it or paste a different script to extract video-optimized prompts."
              : "Enter your script to extract video-optimized prompts, or generate a script first to have it automatically loaded here."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="script-input" className="text-sm font-medium">
              Script Content
            </Label>
            <Textarea
              id="script-input"
              value={scriptInput}
              onChange={(e) => onScriptInputChange(e.target.value)}
              className="min-h-[200px] bg-gray-800 border-gray-600 text-white resize-y"
              placeholder="Your generated script will appear here automatically. You can edit it or paste a different script..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scenes-slider" className="text-sm font-medium flex items-center justify-between">
              Number of Video Scenes to Extract
              <Badge variant="outline" className="ml-2">{numberOfScenesToExtract} scenes</Badge>
            </Label>
            <Slider
              id="scenes-slider"
              min={1}
              max={1000}
              step={1}
              value={[numberOfScenesToExtract]}
              onValueChange={(value) => onNumberOfScenesChange(value[0])}
              className="w-full"
            />
            <p className="text-xs text-gray-400">
              Each scene will be optimized for video generation with cinematic descriptions. You can extract up to 1000 scenes.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onExtractScenes}
              disabled={isExtractingScenes}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isExtractingScenes ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Extracting Video Scenes...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract Video Scenes
                </>
              )}
            </Button>
            
            {extractedScenes.length > 0 && (
              <Button variant="outline" onClick={() => setShowCustomScene(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Scene
              </Button>
            )}
          </div>

          {/* Error Display */}
          {sceneExtractionError && (
            <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-red-400 font-medium">Extraction Error</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClearError}
                  className="ml-auto h-6 w-6 p-0 text-red-400"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm text-red-300 mt-1">{sceneExtractionError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Scene Modal */}
      {showCustomScene && (
        <Card className="bg-gray-900 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Add Custom Video Scene
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCustomScene(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-title" className="text-sm font-medium">Scene Title</Label>
              <Input
                id="custom-title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="e.g., Opening scene"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="custom-prompt" className="text-sm font-medium">Video Prompt</Label>
              <Textarea
                id="custom-prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white min-h-[100px]"
                placeholder="Enter your custom video prompt with cinematic details..."
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleAddCustomScene} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Scene
              </Button>
              <Button variant="outline" onClick={() => setShowCustomScene(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Scenes */}
      {extractedScenes.length > 0 && (
        <Card className="bg-gray-900 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Extracted Video Scenes
              <Badge variant="outline" className="ml-2">
                {selectedScenes.length}/{extractedScenes.length} selected
              </Badge>
            </CardTitle>
            <CardDescription className="text-gray-300">
              Select video scenes to generate. Each scene is optimized for cinematic video generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedScenes.length === extractedScenes.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {extractedScenes.map((scene, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedScenes.includes(index)
                        ? 'bg-purple-900/20 border-purple-600'
                        : 'bg-gray-800 border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={() => onToggleSceneSelection(index)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedScenes.includes(index)}
                        onChange={() => onToggleSceneSelection(index)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-white">Scene {index + 1}</h4>
                          <div className="flex gap-1">
                            {editingScene === index ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSaveEdit()
                                  }}
                                  className="h-6 w-6 p-0 text-green-400"
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCancelEdit()
                                  }}
                                  className="h-6 w-6 p-0 text-gray-400"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStartEdit(index, scene.videoPrompt)
                                }}
                                className="h-6 w-6 p-0 text-blue-400"
                                disabled={!onUpdateScenePrompt}
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-300">
                          <strong>Original:</strong> {scene.originalText}
                        </div>
                        
                        <div className="text-sm">
                          <strong className="text-purple-300">Video Prompt:</strong>
                          {editingScene === index ? (
                            <Textarea
                              value={editPrompt}
                              onChange={(e) => setEditPrompt(e.target.value)}
                              className="mt-1 bg-gray-700 border-gray-600 text-white text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="text-gray-200 block mt-1">{scene.videoPrompt}</span>
                          )}
                        </div>
                        
                        {scene.searchQuery && (
                          <div className="text-xs text-gray-400">
                            <strong>Search Query:</strong> {scene.searchQuery}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
