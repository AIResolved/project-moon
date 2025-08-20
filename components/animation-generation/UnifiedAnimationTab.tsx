'use client'

import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Slider } from '../ui/slider'
import { Separator } from '../ui/separator'
import { Progress } from '../ui/progress'
import {
  FileText,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Zap,
  Plus,
  Trash2,
  X,
  Edit,
  Check,
  Play,
  Square,
  Download,
  Grid,
  Upload
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
  prompt: string
  videoUrl?: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  error?: string
}

interface UnifiedAnimationTabProps {
  // Script extraction
  scriptInput: string
  setScriptInput: (script: string) => void
  numberOfScenesToExtract: number
  setNumberOfScenesToExtract: (count: number) => void
  isExtractingScenes: boolean
  sceneExtractionError: string | null
  allPrompts: ExtractedAnimationScene[]
  onExtractScenes: () => void
  onClearAllPrompts: () => void
  getScriptSourceInfo: () => { source: string; count: number; type: string }
  
  // Generation
  animationPrompt: string
  setAnimationPrompt: (prompt: string) => void
  isGenerating: boolean
  generationError: string | null
  onGenerate: (prompt: string) => void
  
  // Reference images
  referenceImages: File[]
  setReferenceImages: (images: File[]) => void
  referenceImageDescription: string
  setReferenceImageDescription: (description: string) => void
  
  // Batch generation
  batchResults: BatchGenerationResult[]
  isBatchGenerating: boolean
  batchProgress: { current: number; total: number }
  onBatchGenerate: (prompts: string[]) => void
  onClearBatch: () => void
}

export function UnifiedAnimationTab({
  scriptInput,
  setScriptInput,
  numberOfScenesToExtract,
  setNumberOfScenesToExtract,
  isExtractingScenes,
  sceneExtractionError,
  allPrompts,
  onExtractScenes,
  onClearAllPrompts,
  getScriptSourceInfo,
  animationPrompt,
  setAnimationPrompt,
  isGenerating,
  generationError,
  onGenerate,
  referenceImages,
  setReferenceImages,
  referenceImageDescription,
  setReferenceImageDescription,
  batchResults,
  isBatchGenerating,
  batchProgress,
  onBatchGenerate,
  onClearBatch
}: UnifiedAnimationTabProps) {
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([])
  const [customPrompt, setCustomPrompt] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const scriptSourceInfo = getScriptSourceInfo()

  // Handle prompt selection for batch generation
  const togglePromptSelection = (prompt: string) => {
    setSelectedPrompts(prev => 
      prev.includes(prompt) 
        ? prev.filter(p => p !== prompt)
        : [...prev, prompt]
    )
  }

  const addCustomPrompt = () => {
    if (customPrompt.trim()) {
      setSelectedPrompts(prev => [...prev, customPrompt.trim()])
      setCustomPrompt('')
      setShowCustomInput(false)
    }
  }

  // Reference image upload handlers
  const handleReferenceImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setReferenceImages([...referenceImages, ...files])
  }

  const removeReferenceImage = (index: number) => {
    const newImages = referenceImages.filter((_, i) => i !== index)
    setReferenceImages(newImages)
  }

  // Helper function to combine reference description with scene prompts
  const getPromptWithReference = (basePrompt: string) => {
    if (!referenceImageDescription.trim()) {
      return basePrompt
    }
    
    // If the prompt already mentions the subject, don't duplicate
    const description = referenceImageDescription.trim()
    const lowerPrompt = basePrompt.toLowerCase()
    const lowerDescription = description.toLowerCase()
    
    if (lowerPrompt.includes(lowerDescription)) {
      return basePrompt
    }
    
    // Add reference description to the beginning of the prompt
    return `${description} ${basePrompt}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-600" />
            Animation Generation
          </CardTitle>
          <CardDescription>
            Extract scenes from script, generate single animations, or batch process multiple prompts
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Script & Scene Extraction */}
        <div className="space-y-6">
          {/* Script Source Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Script Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scriptSourceInfo.source !== 'none' ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">{scriptSourceInfo.type}</span> 
                    <span className="text-muted-foreground"> ({scriptSourceInfo.count.toLocaleString()} characters)</span>
                  </p>
                  {scriptSourceInfo.source === 'sections' && (
                    <p className="text-xs text-blue-600">Using prompts from script sections</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-amber-700">No script detected. Add custom script below.</p>
              )}
            </CardContent>
          </Card>

          {/* Script Input & Extraction */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Extract Animation Scenes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="script-input">Custom Script</Label>
                <Textarea
                  id="script-input"
                  placeholder="Paste your script here..."
                  value={scriptInput}
                  onChange={(e) => setScriptInput(e.target.value)}
                  disabled={isExtractingScenes}
                  rows={4}
                  className="text-sm"
                />
              </div>

              {/* Number of Scenes Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Number of Scenes</Label>
                  <Badge variant="outline">{numberOfScenesToExtract}</Badge>
                </div>
                <Slider
                  value={[numberOfScenesToExtract]}
                  onValueChange={(value) => setNumberOfScenesToExtract(value[0])}
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

              <div className="flex gap-2">
                <Button 
                  onClick={onExtractScenes}
                  disabled={isExtractingScenes || !scriptInput.trim()}
                  className="flex-1"
                >
                  {isExtractingScenes ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Extract {numberOfScenesToExtract} Scenes
                    </>
                  )}
                </Button>
                {allPrompts.length > 0 && (
                  <Button variant="outline" onClick={onClearAllPrompts}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {sceneExtractionError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-700">{sceneExtractionError}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reference Images Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-600" />
                Reference Images
              </CardTitle>
              <CardDescription>
                Upload images to animate (required for generation)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <div className="space-y-2">
                    <Label htmlFor="reference-upload" className="cursor-pointer">
                      <div className="text-lg font-medium text-gray-900">Upload Reference Images</div>
                      <div className="text-sm text-gray-500">PNG, JPG up to 10MB each</div>
                    </Label>
                    <Input
                      id="reference-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleReferenceImageUpload}
                      className="hidden"
                      disabled={isGenerating || isBatchGenerating}
                    />
                  </div>
                </div>
              </div>

              {/* Reference Images Preview */}
              {referenceImages.length > 0 && (
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-gray-700">
                    Reference Images ({referenceImages.length})
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {referenceImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Reference ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeReferenceImage(index)}
                          disabled={isGenerating || isBatchGenerating}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Reference Image Description */}
                  <div className="space-y-2">
                    <Label htmlFor="reference-description" className="text-sm font-medium">
                      What's in the reference image? <span className="text-gray-500">(Optional)</span>
                    </Label>
                    <Input
                      id="reference-description"
                      placeholder="e.g., 'a stickman', 'a cartoon character', 'a person in a red shirt'"
                      value={referenceImageDescription}
                      onChange={(e) => setReferenceImageDescription(e.target.value)}
                      disabled={isGenerating || isBatchGenerating}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      This description will be automatically added to all animation prompts to ensure consistency. Leave blank to use prompts as-is.
                    </p>
                    
                    {/* Preview of how prompts will look */}
                    {referenceImageDescription.trim() && animationPrompt.trim() && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <Label className="text-xs font-medium text-blue-800">Prompt Preview:</Label>
                        <p className="text-sm text-blue-700 mt-1">
                          "{getPromptWithReference(animationPrompt)}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Single Animation Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Single Generation</CardTitle>
              <CardDescription>
                Generate a single animation from uploaded reference images
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="animation-prompt">Animation Description</Label>
                <Textarea
                  id="animation-prompt"
                  placeholder="Describe how you want the reference image to animate (e.g., 'slow zoom in with particles floating around, gentle camera movement from left to right')"
                  value={animationPrompt}
                  onChange={(e) => setAnimationPrompt(e.target.value)}
                  disabled={isGenerating}
                  rows={3}
                  className="text-sm"
                />
              </div>

              <Button 
                onClick={() => onGenerate(getPromptWithReference(animationPrompt))}
                disabled={isGenerating || !animationPrompt.trim() || referenceImages.length === 0}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Generate Animation
                  </>
                )}
              </Button>

              {referenceImages.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-700">Please upload reference images to enable generation</p>
                </div>
              )}

              {referenceImages.length > 0 && !referenceImageDescription.trim() && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">💡 Tip: Describe what's in your reference image (e.g., "a stickman") for more consistent animations</p>
                </div>
              )}

              {generationError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{generationError}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Extracted Scenes & Batch Generation */}
        <div className="space-y-6">
          {/* Extracted Scenes */}
          {allPrompts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Grid className="h-4 w-4 text-green-600" />
                    Extracted Scenes ({allPrompts.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedPrompts(allPrompts.map(p => p.prompt))}
                      disabled={selectedPrompts.length === allPrompts.length}
                    >
                      Select All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedPrompts([])}
                      disabled={selectedPrompts.length === 0}
                    >
                      Clear
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {allPrompts.map((scene) => (
                    <div 
                      key={scene.id} 
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPrompts.includes(scene.prompt) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => togglePromptSelection(scene.prompt)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{scene.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {scene.prompt}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {selectedPrompts.includes(scene.prompt) ? (
                            <Check className="h-4 w-4 text-blue-600" />
                          ) : (
                            <div className="h-4 w-4 border border-gray-300 rounded" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custom Prompt Addition */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Custom Prompts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showCustomInput ? (
                <Button 
                  variant="outline" 
                  onClick={() => setShowCustomInput(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Prompt
                </Button>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Enter custom animation prompt..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addCustomPrompt} disabled={!customPrompt.trim()}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setShowCustomInput(false)
                        setCustomPrompt('')
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Selected prompts display */}
              {selectedPrompts.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Selected for Batch ({selectedPrompts.length})
                  </Label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedPrompts.map((prompt, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs bg-gray-50 p-2 rounded">
                        <span className="flex-1 truncate">
                          {referenceImageDescription.trim() ? getPromptWithReference(prompt) : prompt}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedPrompts(prev => prev.filter(p => p !== prompt))}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Batch Generation */}
          {selectedPrompts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Batch Generation</CardTitle>
                <CardDescription>
                  Generate animations for {selectedPrompts.length} selected prompts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isBatchGenerating && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress: {batchProgress.current}/{batchProgress.total}</span>
                      <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                    </div>
                    <Progress value={(batchProgress.current / batchProgress.total) * 100} />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={() => onBatchGenerate(selectedPrompts.map(prompt => getPromptWithReference(prompt)))}
                    disabled={isBatchGenerating || selectedPrompts.length === 0 || referenceImages.length === 0}
                    className="flex-1"
                  >
                    {isBatchGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating Batch...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Generate {selectedPrompts.length} Animations
                      </>
                    )}
                  </Button>
                  {batchResults.length > 0 && (
                    <Button variant="outline" onClick={onClearBatch}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {selectedPrompts.length > 0 && (
                  <>
                    {referenceImages.length === 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-700">Please upload reference images to enable batch generation</p>
                      </div>
                    )}
                    
                    {referenceImages.length > 0 && !referenceImageDescription.trim() && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-700">💡 Tip: Add a reference description above for more consistent batch results</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Batch Results */}
          {batchResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Batch Results ({batchResults.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {batchResults.map((result) => (
                    <div key={result.id} className="flex items-center gap-3 p-2 border rounded">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{result.prompt}</p>
                        <p className="text-xs text-muted-foreground">
                          Status: {result.status}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {result.status === 'completed' && result.videoUrl && (
                          <Button size="sm" variant="outline">
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                        {result.status === 'generating' && (
                          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                        )}
                        {result.status === 'failed' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
