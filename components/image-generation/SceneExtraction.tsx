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
import { FileText, Sparkles, RefreshCw, Trash2, Edit3, Save, X, Plus, Palette, Sun, Moon, Zap } from 'lucide-react'
import type { ExtractedScene } from '@/types/image-generation'
import { IMAGE_STYLES, LIGHTING_TONES } from '@/data/image'

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
  // Style options
  selectedImageStyle?: string
  onImageStyleChange?: (style: string) => void
  selectedLightingTone?: string
  onLightingToneChange?: (tone: string) => void
  customStylePrompt?: string
  onCustomStylePromptChange?: (prompt: string) => void
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
  scriptSourceInfo,
  selectedImageStyle = 'realistic',
  onImageStyleChange,
  selectedLightingTone = 'balanced',
  onLightingToneChange,
  customStylePrompt = '',
  onCustomStylePromptChange
}: SceneExtractionProps) {
  const [editingScene, setEditingScene] = useState<number | null>(null)
  const [editPrompt, setEditPrompt] = useState('')
  const [showCustomScene, setShowCustomScene] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [showStyleOptions, setShowStyleOptions] = useState(false)

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
      // Apply styles to the custom scene prompt
      const styledPrompt = getStyledPrompt(customPrompt.trim())
      onAddCustomScene(styledPrompt, customTitle.trim())
      setCustomPrompt('')
      setCustomTitle('')
      setShowCustomScene(false)
    }
  }

  const getImageStyleIcon = (styleKey: string) => {
    switch (styleKey) {
      case 'realistic': return '📸'
      case 'artistic': return '🎨'
      case 'cinematic': return '🎬'
      case 'animation': return '🎭'
      case 'graphic': return '📊'
      case 'fantasy': return '🧙‍♂️'
      default: return '🖼️'
    }
  }

  const getLightingIcon = (tone: string) => {
    switch (tone) {
      case 'light': return <Sun className="h-4 w-4" />
      case 'dark': return <Moon className="h-4 w-4" />
      default: return <Zap className="h-4 w-4" />
    }
  }

  // Helper function to combine styles into final prompt
  const getStyledPrompt = (basePrompt: string) => {
    let finalPrompt = basePrompt
    
    // Apply Image Style
    if (selectedImageStyle && selectedImageStyle !== 'realistic') {
      const style = IMAGE_STYLES[selectedImageStyle as keyof typeof IMAGE_STYLES]
      if (style) {
        finalPrompt = `${style.prefix}${finalPrompt}`
      }
    }
    
    // Apply Lighting Tone
    if (selectedLightingTone && selectedLightingTone !== 'balanced') {
      const tone = LIGHTING_TONES[selectedLightingTone as keyof typeof LIGHTING_TONES]
      if (tone) {
        finalPrompt = `${tone.prefix}${finalPrompt}`
      }
    }
    
    // Apply Custom Style
    if (customStylePrompt && customStylePrompt.trim()) {
      finalPrompt = `${customStylePrompt.trim()}, ${finalPrompt}`
    }
    
    return finalPrompt
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
        {/* Style Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Scene Style Options</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStyleOptions(!showStyleOptions)}
              disabled={isExtractingScenes}
            >
              <Palette className="h-4 w-4 mr-2" />
              {showStyleOptions ? 'Hide' : 'Show'} Styles
            </Button>
          </div>

          {showStyleOptions && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardContent className="pt-6 space-y-6">
                {/* Image Style Section */}
                {onImageStyleChange && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-blue-600" />
                      <Label className="font-semibold">Image Style</Label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(IMAGE_STYLES).map(([key, style]) => (
                        <Button
                          key={key}
                          variant={selectedImageStyle === key ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => onImageStyleChange(key)}
                          disabled={isExtractingScenes}
                          className="flex flex-col h-auto py-3 px-2 text-center"
                        >
                          <span className="text-sm mb-1">{getImageStyleIcon(key)}</span>
                          <span className="font-medium text-xs">{style.name}</span>
                          <span className="text-[10px] opacity-70 leading-tight mt-1">{style.description}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lighting Tone Section */}
                {onLightingToneChange && (
                  <div className="space-y-3">
                    <Label className="font-semibold">Lighting Tone</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(LIGHTING_TONES).map(([key, tone]) => (
                        <Button
                          key={key}
                          variant={selectedLightingTone === key ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => onLightingToneChange(key)}
                          disabled={isExtractingScenes}
                          className="flex flex-col h-auto py-3"
                        >
                          <div className="mb-1">{getLightingIcon(key)}</div>
                          <span className="font-medium text-xs">{tone.name}</span>
                          <span className="text-[10px] opacity-70 text-center leading-tight mt-1">{tone.description}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Style Prompt */}
                {onCustomStylePromptChange && (
                  <div className="space-y-3">
                    <Label className="font-semibold">Custom Style (Optional)</Label>
                    <Textarea
                      placeholder="Add custom scene style (e.g., 'dramatic atmosphere, cinematic angles, vibrant colors')"
                      value={customStylePrompt}
                      onChange={(e) => onCustomStylePromptChange(e.target.value)}
                      disabled={isExtractingScenes}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                )}

                {/* Style Preview */}
                {(selectedImageStyle !== 'realistic' || selectedLightingTone !== 'balanced' || customStylePrompt) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <Label className="text-xs font-medium text-green-800">Active Styles:</Label>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedImageStyle && selectedImageStyle !== 'realistic' && (
                        <Badge variant="outline" className="text-xs">
                          {getImageStyleIcon(selectedImageStyle)} {IMAGE_STYLES[selectedImageStyle as keyof typeof IMAGE_STYLES]?.name}
                        </Badge>
                      )}
                      {selectedLightingTone && selectedLightingTone !== 'balanced' && (
                        <Badge variant="outline" className="text-xs">
                          {getLightingIcon(selectedLightingTone)} {LIGHTING_TONES[selectedLightingTone as keyof typeof LIGHTING_TONES]?.name}
                        </Badge>
                      )}
                      {customStylePrompt && (
                        <Badge variant="outline" className="text-xs">
                          Custom Style
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

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
            max={1000}
            step={1}
            disabled={isExtractingScenes}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 scene</span>
            <span>1000 scenes</span>
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
                    {customPrompt && (selectedImageStyle !== 'realistic' || selectedLightingTone !== 'balanced' || customStylePrompt) && (
                      <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                        <strong>Styled Prompt Preview:</strong> {getStyledPrompt(customPrompt)}
                      </div>
                    )}
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
                        <div className="space-y-2">
                          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border-l-4 border-blue-400">
                            {getStyledPrompt(scene.imagePrompt)}
                          </div>
                          {(selectedImageStyle !== 'realistic' || selectedLightingTone !== 'balanced' || customStylePrompt) && (
                            <details className="text-xs">
                              <summary className="cursor-pointer font-medium text-gray-600">View Original Prompt</summary>
                              <div className="mt-1 p-2 bg-gray-100 rounded text-gray-600">
                                {scene.imagePrompt}
                              </div>
                            </details>
                          )}
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