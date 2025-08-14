'use client'

import { useState, useEffect } from 'react'
import { useAppSelector } from '../../lib/hooks'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import {
  Zap,
  Upload,
  X,
  Trash2,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Info,
  Play,
  FileText,
  Plus
} from 'lucide-react'

interface ExtractedAnimationScene {
  id: string
  title: string
  prompt: string
  duration?: number
  effects?: string[]
}

interface UnifiedAnimationSectionProps {
  hasPrerequisites: boolean
}

export function UnifiedAnimationSection({ hasPrerequisites }: UnifiedAnimationSectionProps) {
  // Get script data from Redux
  const { scriptSections, fullScript } = useAppSelector(state => state.scripts)
  
  const [animationPrompt, setAnimationPrompt] = useState('')
  const [referenceImages, setReferenceImages] = useState<File[]>([])
  const [isGeneratingAnimation, setIsGeneratingAnimation] = useState(false)
  const [animationResult, setAnimationResult] = useState<string | null>(null)
  const [animationError, setAnimationError] = useState<string | null>(null)

  // Scene extraction state
  const [scriptInput, setScriptInput] = useState('')
  const [numberOfScenesToExtract, setNumberOfScenesToExtract] = useState(3) // Smaller default for video generator
  const [isExtractingScenes, setIsExtractingScenes] = useState(false)
  const [sceneExtractionError, setSceneExtractionError] = useState<string | null>(null)
  
  // Unified prompt management
  const [allPrompts, setAllPrompts] = useState<ExtractedAnimationScene[]>([])
  const [mainContext, setMainContext] = useState('')

  // Initialize script input from Redux
  useEffect(() => {
    if (fullScript?.scriptCleaned && !scriptInput.trim()) {
      setScriptInput(fullScript.scriptCleaned)
    } else if (scriptSections.length > 0 && !scriptInput.trim()) {
      const combinedScript = scriptSections
        .map(section => section.writingInstructions)
        .filter(instruction => instruction && instruction.trim())
        .join('\n\n')
      setScriptInput(combinedScript)
    }
  }, [fullScript, scriptSections, scriptInput])

  const handleReferenceImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setReferenceImages([...referenceImages, ...files])
  }

  const removeReferenceImage = (index: number) => {
    const newImages = referenceImages.filter((_, i) => i !== index)
    setReferenceImages(newImages)
  }

  const handleGenerateAnimation = async () => {
    try {
      setIsGeneratingAnimation(true)
      setAnimationError(null)
      
      // Create FormData for the request
      const formData = new FormData()
      formData.append('prompt', animationPrompt)
      
      // Add reference images
      referenceImages.forEach((file, index) => {
        formData.append(`referenceImage${index}`, file)
      })
      
      const response = await fetch('/api/generate-animation', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate animation')
      }

      const data = await response.json()
      console.log('Animation API response:', data)
      
      if (data.success && data.animationUrl) {
        setAnimationResult(data.animationUrl)
      } else {
        throw new Error(data.error || 'Failed to generate animation')
      }
      
    } catch (error: any) {
      console.error('Animation generation error:', error)
      setAnimationError(error.message || 'Failed to generate animation')
    } finally {
      setIsGeneratingAnimation(false)
    }
  }

  const handleClearAnimation = () => {
    setAnimationPrompt('')
    setReferenceImages([])
    setAnimationResult(null)
    setAnimationError(null)
  }

  // Scene extraction functions
  const handleExtractScenes = async () => {
    try {
      setIsExtractingScenes(true)
      setSceneExtractionError(null)

      const response = await fetch('/api/extract-animation-scenes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: scriptInput,
          numberOfScenes: numberOfScenesToExtract,
          mainContext: mainContext,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to extract animation scenes')
      }

      const data = await response.json()
      setAllPrompts(prev => [...prev, ...data.scenes])
      
    } catch (error: any) {
      console.error('Scene extraction error:', error)
      setSceneExtractionError(error.message || 'Failed to extract animation scenes')
    } finally {
      setIsExtractingScenes(false)
    }
  }

  const handleAddManualPrompt = () => {
    if (!animationPrompt.trim()) return
    
    const newPrompt: ExtractedAnimationScene = {
      id: `manual_${Date.now()}`,
      title: `Manual Prompt ${allPrompts.length + 1}`,
      prompt: animationPrompt.trim(),
      duration: 5,
      effects: ['manual']
    }
    
    setAllPrompts(prev => [...prev, newPrompt])
    setAnimationPrompt('')
  }

  const handleUsePromptForGeneration = (prompt: string) => {
    setAnimationPrompt(prompt)
  }

  const handleRemovePrompt = (promptId: string) => {
    setAllPrompts(prev => prev.filter(p => p.id !== promptId))
  }

  const handleClearAllPrompts = () => {
    setAllPrompts([])
  }

  return (
    <Card className="bg-gray-800 shadow-sm border border-gray-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-purple-600" />
          Animation Generator
        </CardTitle>
        <CardDescription>
          Create animations from reference images to add to your video
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Context Field */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Image/Character Context</Label>
          <Textarea
            placeholder="Describe what's in your reference image (e.g., 'a stickman figure on a white background')"
            value={mainContext}
            onChange={(e) => setMainContext(e.target.value)}
            disabled={!hasPrerequisites || isGeneratingAnimation}
            rows={2}
            className="text-xs"
          />
          <div className="text-xs text-blue-300 bg-blue-900/20 p-2 rounded">
            <strong>💡 Tip:</strong> This context will be applied to extracted scene prompts.
          </div>
        </div>

        {/* Reference Images Upload */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Reference Images</Label>
            {(referenceImages.length > 0 || animationResult) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAnimation}
                disabled={!hasPrerequisites || isGeneratingAnimation}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-4">
            <div className="text-center">
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <div className="space-y-1">
                <Label htmlFor="animation-reference-upload" className="cursor-pointer text-sm">
                  <div className="font-medium text-white">Upload Reference Images</div>
                  <div className="text-xs text-gray-400">PNG, JPG up to 10MB each</div>
                </Label>
                <Input
                  id="animation-reference-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleReferenceImageUpload}
                  className="hidden"
                  disabled={!hasPrerequisites || isGeneratingAnimation}
                />
              </div>
            </div>
          </div>

          {/* Reference Images Preview */}
          {referenceImages.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-300">
                Reference Images ({referenceImages.length})
              </Label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {referenceImages.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square bg-gray-600 rounded overflow-hidden">
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
                      disabled={!hasPrerequisites || isGeneratingAnimation}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scene Extraction */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" />
            <Label className="text-sm font-medium">Extract from Script</Label>
          </div>
          
          <Textarea
            placeholder="Paste your script here..."
            value={scriptInput}
            onChange={(e) => setScriptInput(e.target.value)}
            disabled={!hasPrerequisites || isExtractingScenes}
            rows={3}
            className="text-xs"
          />

          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs font-medium">Scenes</Label>
              <Input
                type="number"
                value={numberOfScenesToExtract}
                onChange={(e) => setNumberOfScenesToExtract(parseInt(e.target.value) || 3)}
                min={1}
                max={10}
                disabled={!hasPrerequisites || isExtractingScenes}
                className="text-xs"
              />
            </div>
            <Button
              onClick={handleExtractScenes}
              disabled={!hasPrerequisites || isExtractingScenes || !scriptInput.trim()}
              size="sm"
            >
              {isExtractingScenes ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Extract
                </>
              )}
            </Button>
          </div>

          {sceneExtractionError && (
            <div className="bg-red-900/20 border border-red-600 rounded p-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3 w-3 text-red-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-300 text-xs">Extraction Failed</h4>
                  <p className="text-xs text-red-300">{sceneExtractionError}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Manual Prompt Addition */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-600" />
            <Label className="text-sm font-medium">Manual Prompt</Label>
          </div>
          
          <div className="space-y-2">
            <Textarea
              placeholder="Describe the animation (e.g., 'slow zoom in with particles floating around')"
              value={animationPrompt}
              onChange={(e) => setAnimationPrompt(e.target.value)}
              disabled={!hasPrerequisites || isGeneratingAnimation}
              rows={2}
              className="text-xs"
            />
            <Button
              onClick={handleAddManualPrompt}
              disabled={!hasPrerequisites || !animationPrompt.trim()}
              variant="outline"
              size="sm"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add to List
            </Button>
          </div>
        </div>

        {/* Unified Prompt List */}
        {allPrompts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Animation Prompts ({allPrompts.length})
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllPrompts}
                disabled={!hasPrerequisites || isGeneratingAnimation}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            </div>
            
            <div className="max-h-40 overflow-y-auto space-y-2">
              {allPrompts.map((prompt, index) => (
                <div key={prompt.id} className="border border-gray-600 rounded p-2 bg-gray-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1 mb-1">
                        <h4 className="font-medium text-xs text-white">{prompt.title}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {prompt.effects?.[0] === 'manual' ? '✍️' : '🤖'}
                        </Badge>
                        {prompt.duration && (
                          <Badge variant="outline" className="text-xs">
                            {prompt.duration}s
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {prompt.prompt}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUsePromptForGeneration(prompt.prompt)}
                        disabled={!hasPrerequisites || isGeneratingAnimation}
                        className="text-xs"
                      >
                        Use
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemovePrompt(prompt.id)}
                        disabled={!hasPrerequisites || isGeneratingAnimation}
                        className="text-xs"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Generation Prompt */}
        {animationPrompt && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Current Prompt</Label>
            <div className="bg-blue-900/20 border border-blue-600 rounded p-2">
              <p className="text-xs text-blue-300">{animationPrompt}</p>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerateAnimation}
          disabled={!hasPrerequisites || isGeneratingAnimation || !animationPrompt.trim() || referenceImages.length === 0}
          className="w-full"
          size="sm"
        >
          {isGeneratingAnimation ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating Animation...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Animation
            </>
          )}
        </Button>

        {/* Results */}
        {animationError && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-300 text-sm">Generation Failed</h4>
                <p className="text-xs text-red-300 mt-1">{animationError}</p>
              </div>
            </div>
          </div>
        )}

        {animationResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <Label className="text-sm font-medium text-green-300">Generated Animation</Label>
            </div>
            
            <div className="bg-gray-700 border border-gray-600 rounded-lg p-3">
              <video
                src={animationResult}
                controls
                className="w-full rounded shadow-sm"
                autoPlay
                loop
                muted
              />
            </div>
          </div>
        )}

        {/* Usage Tips */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-purple-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-purple-900 text-sm">Quick Tips</h4>
              <ul className="text-xs text-purple-700 space-y-1">
                <li>• Describe your image context first</li>
                <li>• Extract scenes from script automatically</li>
                <li>• Add manual prompts for specific effects</li>
                <li>• Use any prompt from your list for generation</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}