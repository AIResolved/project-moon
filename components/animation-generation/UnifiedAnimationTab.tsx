'use client'

import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import {
  FileText,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Zap,
  Upload,
  Image as ImageIcon,
  Users,
  Play,
  Download,
  Eye,
  X
} from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import { addImageSet } from '@/lib/features/imageGeneration/imageGenerationSlice'

interface ExtractedAnimationScene {
  id: string
  title: string
  prompt: string
  characterVariation?: string
  duration?: number
}

interface ImageResult {
  id: string
  sceneId: string
  prompt: string
  imageUrl?: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  error?: string
}

interface UnifiedAnimationTabProps {
  // Callback to send generated images to parent gallery
  onImageGenerated?: (result: { id: string; url: string; prompt: string; sceneTitle: string; sceneId: string }) => void
}

export function UnifiedAnimationTab({ onImageGenerated }: UnifiedAnimationTabProps) {
  // Get script from Redux state and image sets for gallery integration
  const { fullScript } = useAppSelector(state => state.scripts)
  const { imageSets } = useAppSelector(state => state.imageGeneration)
  const dispatch = useAppDispatch()
  
  // State for reference image
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>('')
  
  // State for scene extraction
  const [numberOfScenes, setNumberOfScenes] = useState(10) // User-selectable scene count
  const [extractedScenes, setExtractedScenes] = useState<ExtractedAnimationScene[]>([])
  const [selectedScenes, setSelectedScenes] = useState<number[]>([])
  const [isExtractingScenes, setIsExtractingScenes] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  
  // State for image generation
  const [imageResults, setImageResults] = useState<ImageResult[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Handle reference image upload
  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setReferenceImage(file)
      const url = URL.createObjectURL(file)
      setReferenceImageUrl(url)
    }
  }

  // Extract animation scenes from script with character variations
  const handleExtractScenes = async () => {
    if (!fullScript?.scriptWithMarkdown) {
      setExtractionError('Please generate a script first')
      return
    }

    if (!referenceImage) {
      setExtractionError('Please upload a reference image first')
      return
    }

    setIsExtractingScenes(true)
    setExtractionError(null)

    try {
      const formData = new FormData()
      formData.append('script', fullScript.scriptWithMarkdown)
      formData.append('numberOfScenes', numberOfScenes.toString())
      formData.append('referenceImage', referenceImage)

      const response = await fetch('/api/extract-animation-scenes', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Failed to extract scenes: ${response.status}`)
      }

      const data = await response.json()
      setExtractedScenes(data.scenes || [])
      // Auto-select all extracted scenes
      setSelectedScenes(data.scenes ? data.scenes.map((_: any, index: number) => index) : [])

    } catch (error) {
      console.error('Error extracting animation scenes:', error)
      setExtractionError(error instanceof Error ? error.message : 'Failed to extract scenes')
    } finally {
      setIsExtractingScenes(false)
    }
  }

  // Generate animations for selected scenes
  const handleGenerateAnimations = async () => {
    if (selectedScenes.length === 0) {
      setGenerationError('Please select at least one scene to animate')
      return
    }

    setIsGenerating(true)
    setGenerationError(null)
    setGenerationProgress(0)

    try {
      const scenesToGenerate = selectedScenes.map(index => extractedScenes[index])
      const totalScenes = scenesToGenerate.length
      
      // Initialize results
      const initialResults: ImageResult[] = scenesToGenerate.map(scene => ({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        sceneId: scene.id,
        prompt: scene.prompt,
        status: 'pending' as const
      }))
      
      setImageResults(initialResults)

      // Process in batches of 5 with 1-minute delays
      const BATCH_SIZE = 5
      const DELAY_BETWEEN_BATCHES = 60000 // 1 minute in milliseconds

      for (let batchStart = 0; batchStart < scenesToGenerate.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, scenesToGenerate.length)
        const batch = scenesToGenerate.slice(batchStart, batchEnd)
        
        console.log(`🎬 Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1} (scenes ${batchStart + 1}-${batchEnd})`)

        // Process all scenes in current batch simultaneously
        const batchPromises = batch.map(async (scene, batchIndex) => {
          const globalIndex = batchStart + batchIndex
          const resultId = initialResults[globalIndex].id

          try {
            // Update status to generating
            setImageResults(prev => prev.map(result => 
              result.id === resultId 
                ? { ...result, status: 'generating' as const }
                : result
            ))

            // Create FormData with prompt and reference image
            const formData = new FormData()
            formData.append('prompt', scene.prompt)
            
            // Add the reference image
            if (referenceImage) {
              formData.append('referenceImage0', referenceImage)
            }

            const response = await fetch('/api/generate-animation', {
              method: 'POST',
              body: formData
            })

            if (!response.ok) {
              throw new Error(`Animation generation failed: ${response.status}`)
            }

            const result = await response.json()
            
            // Update with completed result
            setImageResults(prev => prev.map(imageResult => 
              imageResult.id === resultId 
                ? { 
                    ...imageResult, 
                    status: 'completed' as const, 
                    imageUrl: result.animationUrl 
                  }
                : imageResult
            ))

            // Send to parent gallery
            if (onImageGenerated) {
              onImageGenerated({
                id: resultId,
                url: result.animationUrl,
                prompt: scene.prompt,
                sceneTitle: scene.title,
                sceneId: scene.id
              })
            }

            // Add to gallery: update the "all-animation-results" image set in Redux
            const existingAnimationSet = imageSets.find(set => set.id === 'all-animation-results')
            
            if (existingAnimationSet) {
              // Update existing set by adding new image
              const updatedSet = {
                ...existingAnimationSet,
                finalPrompts: [...existingAnimationSet.finalPrompts, scene.prompt],
                imageUrls: [...existingAnimationSet.imageUrls, result.animationUrl],
                generatedAt: new Date().toISOString() // Update timestamp
              }
              dispatch(addImageSet(updatedSet))
            } else {
              // Create new "all-animation-results" set
              const animationSet = {
                id: 'all-animation-results',
                originalPrompt: 'All Animation Results',
                finalPrompts: [scene.prompt],
                imageUrls: [result.animationUrl],
                imageData: [],
                provider: 'gpt-image-1' as const,
                generatedAt: new Date().toISOString(),
                aspectRatio: '1:1' as const,
                imageStyle: undefined
              }
              dispatch(addImageSet(animationSet))
            }

          } catch (error) {
            console.error(`Error generating animation for scene ${scene.id}:`, error)
            
            // Update with error
            setImageResults(prev => prev.map(result => 
              result.id === resultId 
                ? { 
                    ...result, 
                    status: 'failed' as const, 
                    error: error instanceof Error ? error.message : 'Generation failed' 
                  }
                : result
            ))
          }

          // Update progress
          setGenerationProgress(((globalIndex + 1) / totalScenes) * 100)
        })

        // Wait for all requests in the current batch to complete
        await Promise.all(batchPromises)

        // Add delay before next batch (except for the last batch)
        if (batchEnd < scenesToGenerate.length) {
          console.log(`⏱️ Waiting 1 minute before next batch...`)
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
        }
      }

    } catch (error) {
      console.error('Error in animation generation process:', error)
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate animations')
    } finally {
      setIsGenerating(false)
    }
  }

  // Toggle scene selection
  const toggleSceneSelection = (index: number) => {
    setSelectedScenes(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  // Regenerate a single image
  const handleRegenerateImage = async (resultId: string) => {
    const result = imageResults.find(r => r.id === resultId)
    if (!result) return

    const scene = extractedScenes.find(s => s.id === result.sceneId)
    if (!scene) return

    try {
      // Update status to generating
      setImageResults(prev => prev.map(r => 
        r.id === resultId 
          ? { ...r, status: 'generating' as const, error: undefined }
          : r
      ))

      // Create FormData with prompt and reference image
      const formData = new FormData()
      formData.append('prompt', scene.prompt)
      
      if (referenceImage) {
        formData.append('referenceImage0', referenceImage)
      }

      const response = await fetch('/api/generate-animation', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Regeneration failed: ${response.status}`)
      }

      const apiResult = await response.json()
      
      // Update with completed result
      setImageResults(prev => prev.map(r => 
        r.id === resultId 
          ? { 
              ...r, 
              status: 'completed' as const, 
              imageUrl: apiResult.animationUrl 
            }
          : r
      ))

      // Send regenerated image to parent gallery
      if (onImageGenerated) {
        const newId = `${resultId}_regen_${Date.now()}`
        onImageGenerated({
          id: newId,
          url: apiResult.animationUrl,
          prompt: scene.prompt,
          sceneTitle: scene.title,
          sceneId: scene.id
        })
      }

      // Add regenerated image to gallery: update the "all-animation-results" image set in Redux
      const existingAnimationSet = imageSets.find(set => set.id === 'all-animation-results')
      
      if (existingAnimationSet) {
        // Update existing set by adding regenerated image
        const updatedSet = {
          ...existingAnimationSet,
          finalPrompts: [...existingAnimationSet.finalPrompts, scene.prompt],
          imageUrls: [...existingAnimationSet.imageUrls, apiResult.animationUrl],
          generatedAt: new Date().toISOString() // Update timestamp
        }
        dispatch(addImageSet(updatedSet))
      } else {
        // Create new "all-animation-results" set
        const animationSet = {
          id: 'all-animation-results',
          originalPrompt: 'All Animation Results',
          finalPrompts: [scene.prompt],
          imageUrls: [apiResult.animationUrl],
          imageData: [],
          provider: 'gpt-image-1' as const,
          generatedAt: new Date().toISOString(),
          aspectRatio: '1:1' as const,
          imageStyle: undefined
        }
        dispatch(addImageSet(animationSet))
      }

    } catch (error) {
      console.error(`Error regenerating image ${resultId}:`, error)
      
      // Update with error
      setImageResults(prev => prev.map(r => 
        r.id === resultId 
          ? { 
              ...r, 
              status: 'failed' as const, 
              error: error instanceof Error ? error.message : 'Regeneration failed' 
            }
          : r
      ))
    }
  }

  // Clear all selections and results
  const handleClear = () => {
    setExtractedScenes([])
    setSelectedScenes([])
    setImageResults([])
    setExtractionError(null)
    setGenerationError(null)
    setGenerationProgress(0)
  }

  // Check if we have prerequisites
  const hasScript = fullScript?.scriptWithMarkdown?.trim()
  const hasReferenceImage = referenceImage !== null
  const canExtractScenes = hasScript && hasReferenceImage
  const canGenerateAnimations = extractedScenes.length > 0 && selectedScenes.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Image Generation from Reference</h2>
        <p className="text-gray-300">Upload a reference image and generate new images based on your script scenes with consistent styling</p>
      </div>

      {/* Reference Image Upload */}
      <Card className="bg-gray-900 border-gray-700 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-400" />
            Upload Reference Image
          </CardTitle>
          <CardDescription className="text-gray-300">
            Upload an image to define the visual style that will be applied to all characters and scenes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="reference-image" className="text-sm font-medium">
                Reference Image
              </Label>
              <Input
                id="reference-image"
                type="file"
                accept="image/*"
                onChange={handleReferenceImageUpload}
                className="bg-gray-800 border-gray-600 text-white mt-1"
              />
            </div>

            {referenceImageUrl && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Preview</Label>
                <div className="relative w-full max-w-md">
                  <img
                    src={referenceImageUrl}
                    alt="Reference"
                    className="w-full h-auto rounded-lg border border-gray-600"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReferenceImage(null)
                      setReferenceImageUrl('')
                      URL.revokeObjectURL(referenceImageUrl)
                    }}
                    className="absolute top-2 right-2 bg-black/50 border-gray-600 hover:bg-black/70"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>



      {/* Extract Scenes from Script */}
      <Card className="bg-gray-900 border-gray-700 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-400" />
            Extract Image Scenes
          </CardTitle>
          <CardDescription className="text-gray-300">
            Analyze your script and apply the uploaded image style to all characters and scenes in the generated images
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Number of Scenes Selector */}
          <div className="space-y-2">
            <Label htmlFor="numberOfScenes" className="text-sm font-medium text-gray-300">
              Number of Scenes to Extract (1-1000)
            </Label>
            <Input
              id="numberOfScenes"
              type="number"
              min="1"
              max="1000"
              value={numberOfScenes}
              onChange={(e) => setNumberOfScenes(Math.min(1000, Math.max(1, parseInt(e.target.value) || 10)))}
              className="bg-gray-800 border-gray-600 text-white"
              placeholder="Enter number of scenes (1-1000)"
            />
            <p className="text-xs text-gray-400">
              Choose how many scenes/prompts to extract from your script
            </p>
          </div>

          {/* Prerequisites Check */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg border ${hasScript ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}`}>
              <div className="flex items-center gap-2">
                <FileText className={`h-4 w-4 ${hasScript ? 'text-green-400' : 'text-red-400'}`} />
                <span className="text-sm font-medium">Script Available</span>
              </div>
              <p className="text-xs text-gray-300 mt-1">
                {hasScript ? 'Script is ready for scene extraction' : 'Please generate a script first'}
              </p>
            </div>

            <div className={`p-3 rounded-lg border ${hasReferenceImage ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}`}>
              <div className="flex items-center gap-2">
                <ImageIcon className={`h-4 w-4 ${hasReferenceImage ? 'text-green-400' : 'text-red-400'}`} />
                <span className="text-sm font-medium">Reference Image</span>
              </div>
              <p className="text-xs text-gray-300 mt-1">
                {hasReferenceImage ? 'Reference image uploaded' : 'Please upload a reference image'}
              </p>
            </div>
          </div>

          {/* Extract Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleExtractScenes}
              disabled={!canExtractScenes || isExtractingScenes}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isExtractingScenes ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Extracting Scenes...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract Image Scenes
                </>
              )}
            </Button>

            {extractedScenes.length > 0 && (
              <Button variant="outline" onClick={handleClear}>
                Clear All
              </Button>
            )}
          </div>

          {/* Extraction Error */}
          {extractionError && (
            <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-red-400 font-medium">Extraction Error</span>
              </div>
              <p className="text-sm text-red-300 mt-1">{extractionError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extracted Scenes */}
      {extractedScenes.length > 0 && (
        <Card className="bg-gray-900 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-yellow-400" />
              Extracted Image Scenes
              <Badge variant="outline" className="ml-2">
                {extractedScenes.length} scenes
              </Badge>
            </CardTitle>
            <CardDescription className="text-gray-300">
              Select scenes to generate images. Each scene is tailored to your reference image.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scene Selection */}
            <div className="space-y-3">
              {extractedScenes.map((scene, index) => (
                <div
                  key={scene.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedScenes.includes(index)
                      ? 'bg-blue-900/20 border-blue-600'
                      : 'bg-gray-800 border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => toggleSceneSelection(index)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                      selectedScenes.includes(index)
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-400'
                    }`}>
                      {selectedScenes.includes(index) && (
                        <div className="w-2 h-2 bg-white rounded-sm" />
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <h4 className="font-medium text-white">{scene.title}</h4>
                      <p className="text-sm text-gray-300 leading-relaxed">{scene.prompt}</p>
                      {scene.characterVariation && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Character Variation: {scene.characterVariation}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Generate Animations Button */}
            <div className="pt-4 border-t border-gray-700">
              <Button
                onClick={handleGenerateAnimations}
                disabled={!canGenerateAnimations || isGenerating}
                className="w-full bg-yellow-600 hover:bg-yellow-700 h-12"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Images... ({generationProgress.toFixed(0)}%)
                  </>
                              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Images ({selectedScenes.length} scenes)
                </>
              )}
              </Button>

              {isGenerating && (
                <div className="mt-3">
                  <Progress value={generationProgress} className="w-full" />
                </div>
              )}
            </div>

            {/* Generation Error */}
            {generationError && (
              <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-red-400 font-medium">Generation Error</span>
                </div>
                <p className="text-sm text-red-300 mt-1">{generationError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generated Images Results */}
      {imageResults.length > 0 && (
        <Card className="bg-gray-900 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-400" />
              Generated Images
              <Badge variant="outline" className="ml-2">
                {imageResults.filter(r => r.status === 'completed').length} / {imageResults.length} completed
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {imageResults.map((result) => (
                <div
                  key={result.id}
                  className="p-4 bg-gray-800 rounded-lg border border-gray-600"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white truncate">
                        {extractedScenes.find(s => s.id === result.sceneId)?.title || 'Scene'}
                      </h4>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          result.status === 'completed' ? 'text-green-400 border-green-600' :
                          result.status === 'generating' ? 'text-yellow-400 border-yellow-600' :
                          result.status === 'failed' ? 'text-red-400 border-red-600' :
                          'text-gray-400 border-gray-600'
                        }`}
                      >
                        {result.status}
                      </Badge>
                    </div>

                    <div className="text-sm text-gray-300 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                      {result.prompt}
                    </div>

                    {result.status === 'generating' && (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-yellow-400" />
                        <span className="text-sm text-yellow-400">Generating...</span>
                      </div>
                    )}

                    {result.status === 'failed' && (
                      <div className="space-y-2">
                        {result.error && (
                          <div className="p-2 bg-red-900/20 border border-red-700 rounded text-sm text-red-300">
                            {result.error}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerateImage(result.id)}
                          className="text-purple-400 border-purple-600 hover:bg-purple-900/20"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Retry Generation
                        </Button>
                      </div>
                    )}

                    {result.status === 'completed' && result.imageUrl && (
                      <div className="space-y-2">
                        <img
                          src={result.imageUrl}
                          alt={`Generated image: ${extractedScenes.find(s => s.id === result.sceneId)?.title || 'Scene'}`}
                          className="w-full rounded border border-gray-600"
                          style={{ maxHeight: '300px', objectFit: 'contain' }}
                        />
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(result.imageUrl, '_blank')}
                            className="text-blue-400 border-blue-600 hover:bg-blue-900/20"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Full
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const a = document.createElement('a')
                              a.href = result.imageUrl!
                              a.download = `image-${result.id}.png`
                              a.click()
                            }}
                            className="text-green-400 border-green-600 hover:bg-green-900/20"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateImage(result.id)}
                            className="text-purple-400 border-purple-600 hover:bg-purple-900/20"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Regenerate
                          </Button>
                        </div>
                        <div className="text-xs text-gray-400">
                          🎨 Generated with OpenAI image-1
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}