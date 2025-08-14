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
import { FileText, Sparkles, RefreshCw, Trash2, Edit3, Save, X, Plus } from 'lucide-react'
import type { ExtractedScene } from '@/types/image-generation'

interface SceneExtractionProps {
  scriptInput: string
  onScriptInputChange: (value: string) => void
  numberOfScenesToExtract: number
  onNumberOfScenesChange: (value: number) => void
  isExtractingScenes: boolean
  sceneExtractionError: string | null
  extractedScenes: ExtractedScene[]
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

export function SceneExtraction({
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
}: SceneExtractionProps) {
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-600" />
          Scene Extraction
        </CardTitle>
        <CardDescription>
          Extract scenes from scripts for image generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Script Source Information */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-gray-600" />
            <span className="font-medium text-gray-800">Script Source</span>
          </div>
          {scriptSourceInfo.source !== 'none' ? (
            <div className="space-y-1">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{scriptSourceInfo.type}</span> 
                <span className="text-muted-foreground"> ({scriptSourceInfo.count.toLocaleString()} characters)</span>
              </p>
              {scriptSourceInfo.source === 'sections' && (
                <p className="text-xs text-blue-600">Using image generation prompts from script sections</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-700">No script detected. Please paste a custom script below.</p>
          )}
        </div>

        {/* Custom Script Input */}
        <div className="space-y-2">
          <Label htmlFor="script-input">Custom Script (Optional)</Label>
          <Textarea
            id="script-input"
            placeholder="Paste your script here to override the detected script sources..."
            value={scriptInput}
            onChange={(e) => onScriptInputChange(e.target.value)}
            disabled={isExtractingScenes}
            className="min-h-[120px]"
          />
          <p className="text-xs text-muted-foreground">
            This will take priority over the detected script sources above.
          </p>
        </div>

        {/* Number of Scenes Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>Number of Scenes to Extract</Label>
            <Badge variant="outline">{numberOfScenesToExtract}</Badge>
          </div>
          <Slider
            value={[numberOfScenesToExtract]}
            onValueChange={(value) => onNumberOfScenesChange(value[0])}
            min={1}
            max={200}
            step={1}
            disabled={isExtractingScenes}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 scene</span>
            <span>100 scenes</span>
          </div>
        </div>

        {/* Extract Scenes Button */}
        <Button 
          className="w-full" 
          onClick={onExtractScenes}
          disabled={isExtractingScenes || scriptSourceInfo.source === 'none'}
          size="lg"
        >
          {isExtractingScenes ? (
            <>
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Extracting {numberOfScenesToExtract} Scenes...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Extract {numberOfScenesToExtract} Scenes
            </>
          )}
        </Button>

        {/* Scene Extraction Error */}
        {sceneExtractionError && (
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-red-800">Scene Extraction Error</p>
                  <p className="text-sm text-red-600">{sceneExtractionError}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={onClearError}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Custom Scene Creation */}
        {(extractedScenes.length > 0 || showCustomScene) && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Image Prompts ({extractedScenes.length})</Label>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowCustomScene(!showCustomScene)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Custom
                </Button>
                {extractedScenes.length > 0 && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => selectedScenes.forEach((_, i) => onToggleSceneSelection(i))}
                      disabled={selectedScenes.length === 0}
                    >
                      Clear
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const allIndices = Array.from({length: extractedScenes.length}, (_, i) => i)
                        allIndices.forEach(i => {
                          if (!selectedScenes.includes(i)) {
                            onToggleSceneSelection(i)
                          }
                        })
                      }}
                      disabled={selectedScenes.length === extractedScenes.length}
                    >
                      Select All
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Custom Scene Form */}
            {showCustomScene && (
              <Card className="border-blue-200 bg-blue-50/30">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Plus className="h-4 w-4 text-blue-600" />
                    <Label className="font-medium">Add Custom Image Prompt</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="custom-title">Scene Title</Label>
                    <Input
                      id="custom-title"
                      placeholder="e.g., Opening scene, Character introduction..."
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-prompt">Custom Image Prompt</Label>
                    <Textarea
                      id="custom-prompt"
                      placeholder="A detailed description for your custom image. Be specific about characters, setting, lighting, camera angle, and style..."
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <p className="text-xs text-blue-600">
                      💡 Tip: Include specific details like age, gender, clothing, setting, lighting, and camera angle for better results
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleAddCustomScene}
                      disabled={!customPrompt.trim() || !customTitle.trim()}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Add Scene
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setShowCustomScene(false)
                        setCustomPrompt('')
                        setCustomTitle('')
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <ScrollArea className="h-96 border rounded-md p-4">
              <div className="space-y-4">
                {extractedScenes.map((scene: ExtractedScene, index: number) => (
                  <div key={index} className="border rounded-md p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id={`scene-${index}`} 
                          checked={selectedScenes.includes(index)}
                          onCheckedChange={() => onToggleSceneSelection(index)}
                        />
                        <Label 
                          htmlFor={`scene-${index}`} 
                          className="font-medium cursor-pointer"
                        >
                          {scene.summary}
                        </Label>
                      </div>
                      
                      {/* Edit Button */}
                      {onUpdateScenePrompt && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(index, scene.imagePrompt)}
                          disabled={editingScene === index}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {/* Image Prompt Display/Edit */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-600">Image Prompt</Label>
                      {editingScene === index ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            className="min-h-[100px] text-sm"
                            placeholder="Edit the image prompt..."
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEdit}>
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border-l-4 border-blue-400">
                          {scene.imagePrompt}
                        </div>
                      )}
                    </div>
                    
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium text-gray-600">View Original Text</summary>
                      <div className="mt-2 p-2 bg-muted/30 rounded text-muted-foreground max-h-32 overflow-y-auto">
                        {scene.originalText}
                      </div>
                    </details>
                    
                    {scene.error && (
                      <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                        <strong>Error:</strong> {scene.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 