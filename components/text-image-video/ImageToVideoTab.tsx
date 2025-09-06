'use client'

import { useState, useEffect } from 'react'
import { useAppSelector } from '../../lib/hooks'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Checkbox } from '../ui/checkbox'
import { Separator } from '../ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { ProviderModelSelector } from './ProviderModelSelector'
import { VideoSceneExtraction } from './VideoSceneExtraction'
import { VIDEO_PROVIDERS, ExtractedVideoScene } from '../../types/text-image-video-generation'
import { 
  Plus, 
  Trash2, 
  Video, 
  Image as ImageIcon, 
  Clock,
  Zap,
  RefreshCw,
  Upload,
  X,
  Grid,
  CheckSquare,
  Square,
  FileText,
  Edit3
} from 'lucide-react'

interface ImageToVideoTabProps {
  defaultDuration: number
  isGenerating: boolean
  onGenerate: (prompts: string[], images: File[], duration: 5 | 10) => Promise<void>
  onDurationChange: (duration: 5 | 10) => void
}

export function ImageToVideoTab({
  defaultDuration,
  isGenerating,
  onGenerate,
  onDurationChange
}: ImageToVideoTabProps) {
  // Get generated images from Redux
  const { imageSets } = useAppSelector(state => state.imageGeneration)
  const { selectedProvider, selectedModel } = useAppSelector(state => state.textImageVideo)
  const { fullScript } = useAppSelector(state => state.scripts)
  
  const [prompts, setPrompts] = useState<string[]>([''])
  const [images, setImages] = useState<File[]>([])
  const [duration, setDuration] = useState<5 | 10>(defaultDuration as 5 | 10)
  const [dragActive, setDragActive] = useState(false)
  const [availableDurations, setAvailableDurations] = useState<number[]>([4, 6, 8, 10])
  const [modelDefaultDuration, setModelDefaultDuration] = useState<number>(6)
  
  // State for generated images selection
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([])
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState<string>('')
  
  // Scene extraction state
  const [scriptInput, setScriptInput] = useState('')
  const [numberOfScenesToExtract, setNumberOfScenesToExtract] = useState(5)
  const [isExtractingScenes, setIsExtractingScenes] = useState(false)
  const [sceneExtractionError, setSceneExtractionError] = useState<string | null>(null)
  const [extractedScenes, setExtractedScenes] = useState<ExtractedVideoScene[]>([])
  const [selectedScenes, setSelectedScenes] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState<'manual' | 'script'>('manual')

  // Update available durations when provider/model changes
  useEffect(() => {
    const providerConfig = VIDEO_PROVIDERS[selectedProvider]
    if (providerConfig && providerConfig.imageToVideoModels) {
      const modelConfig = providerConfig.imageToVideoModels[selectedModel as keyof typeof providerConfig.imageToVideoModels] as any
      if (modelConfig) {
        setAvailableDurations(modelConfig.supportedDurations || [4, 6, 8, 10])
        const defaultDur = modelConfig.defaultDuration || modelConfig.supportedDurations[0] || 6
        setModelDefaultDuration(defaultDur)
        
        // Only set duration if current duration is not supported by new model
        if (!modelConfig.supportedDurations.includes(duration)) {
          setDuration(defaultDur)
          onDurationChange(defaultDur)
        }
      }
    }
  }, [selectedProvider, selectedModel, onDurationChange, duration])

  // Auto-populate script input when fullScript is available
  useEffect(() => {
    if (fullScript?.scriptWithMarkdown && !scriptInput.trim()) {
      setScriptInput(fullScript.scriptWithMarkdown)
      // Automatically switch to script tab when script is loaded
      setActiveTab('script')
    }
  }, [fullScript?.scriptWithMarkdown, scriptInput])

  const updatePrompt = (index: number, value: string) => {
    const newPrompts = [...prompts]
    newPrompts[index] = value
    setPrompts(newPrompts)
  }

  const addPrompt = () => {
    setPrompts([...prompts, ''])
  }

  const removePrompt = (index: number) => {
    if (prompts.length > 1) {
      setPrompts(prompts.filter((_, i) => i !== index))
    }
  }

  const handleFiles = (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
    setImages(prev => [...prev, ...imageFiles])
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  // Generated images handling
  const toggleImageSelection = (imageUrl: string) => {
    setSelectedImageUrls(prev => 
      prev.includes(imageUrl) 
        ? prev.filter(url => url !== imageUrl)
        : [...prev, imageUrl]
    )
  }

  const selectAllImages = () => {
    const allImageUrls = imageSets.flatMap(set => set.imageUrls)
    setSelectedImageUrls(allImageUrls)
  }

  const clearImageSelection = () => {
    setSelectedImageUrls([])
  }

  const handleGenerateFromSelected = async () => {
    if (selectedImageUrls.length === 0 || !generatedImagePrompt.trim()) return

    // Convert selected image URLs to files (we'll need to modify the onGenerate function to handle URLs)
    try {
      // Immediate user notification
      alert('✅ Generation started! You can track progress under the "Current Generation" tab.')

      const imageFiles: File[] = []
      for (const imageUrl of selectedImageUrls) {
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        const file = new File([blob], `generated-image-${Date.now()}.jpg`, { type: 'image/jpeg' })
        imageFiles.push(file)
      }

      const prompts = selectedImageUrls.map(() => generatedImagePrompt.trim())
      onDurationChange(duration)
      await onGenerate(prompts, imageFiles, duration)
      
      // Clear selection after generation
      setSelectedImageUrls([])
      setGeneratedImagePrompt('')
    } catch (error) {
      console.error('Error converting images to files:', error)
    }
  }

  // Helper function to get script for extraction
  const getScriptForExtraction = () => {
    if (scriptInput.trim()) {
      return scriptInput.trim()
    }
    return fullScript?.scriptWithMarkdown?.trim() || null
  }

  // Get script source info for display
  const getScriptSourceInfo = () => {
    const scriptToUse = getScriptForExtraction()
    if (!scriptToUse) {
      return { source: 'No script', count: 0, type: 'available' }
    }
    if (scriptInput.trim()) {
      return { source: 'Manual input', count: scriptInput.trim().split('\n').length, type: 'lines' }
    }
    return { source: 'Generated script', count: fullScript?.scriptWithMarkdown?.split('\n').length || 0, type: 'lines' }
  }

  // Scene extraction functions
  const handleExtractScenes = async () => {
    const scriptToUse = getScriptForExtraction()
    
    if (!scriptToUse) {
      setSceneExtractionError('No script available. Please generate a script first or paste one in the script input.')
      return
    }

    setIsExtractingScenes(true)
    setSceneExtractionError(null)

    try {
      const response = await fetch('/api/extract-video-scenes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: scriptToUse,
          numberOfScenes: numberOfScenesToExtract,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to extract video scenes')
      }

      const data = await response.json()
      setExtractedScenes(data.scenes || [])
      // Auto-select all extracted scenes
      setSelectedScenes(data.scenes ? data.scenes.map((_: any, index: number) => index) : [])
    } catch (error) {
      console.error('Error extracting video scenes:', error)
      setSceneExtractionError(
        error instanceof Error ? error.message : 'Failed to extract video scenes'
      )
    } finally {
      setIsExtractingScenes(false)
    }
  }

  const handleToggleSceneSelection = (index: number) => {
    setSelectedScenes(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const handleUpdateScenePrompt = (index: number, newPrompt: string) => {
    setExtractedScenes(prev => 
      prev.map((scene, i) => 
        i === index ? { ...scene, videoPrompt: newPrompt } : scene
      )
    )
  }

  const handleAddCustomScene = (prompt: string, title: string) => {
    const newScene: ExtractedVideoScene = {
      chunkIndex: extractedScenes.length,
      originalText: title,
      videoPrompt: prompt,
      searchQuery: '',
      summary: title,
    }
    setExtractedScenes(prev => [...prev, newScene])
    setSelectedScenes(prev => [...prev, extractedScenes.length])
  }

  const handleClearSceneError = () => {
    setSceneExtractionError(null)
  }

  const handleGenerate = async () => {
    let validPrompts: string[] = []
    let imagesToUse: File[] = []
    
    if (activeTab === 'manual') {
      // Manual mode: use manual prompts and uploaded images
      validPrompts = prompts.filter(p => p.trim().length > 0)
      imagesToUse = images
      
      if (validPrompts.length === 0 || imagesToUse.length === 0) return
    } else if (activeTab === 'script') {
      // Script mode: use extracted scene prompts but still need images
      validPrompts = selectedScenes.map(index => extractedScenes[index].videoPrompt)
      imagesToUse = images
      
      if (validPrompts.length === 0) return
      if (imagesToUse.length === 0) {
        setSceneExtractionError('Please upload at least one image to use with the extracted scenes.')
        return
      }
    }

    // Immediate user notification
    alert('✅ Generation started! You can track progress under the "Current Generation" tab.')

    onDurationChange(duration)
    await onGenerate(validPrompts, imagesToUse, duration)
  }

  const validPrompts = prompts.filter(p => p.trim().length > 0)

  return (
    <div className="space-y-6">
      {/* Provider and Model Selection */}
      <ProviderModelSelector mode="image-to-video" />

      {/* Image to Video Generation Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'manual' | 'script')} className="space-y-6">
        <Card className="bg-gray-900 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-purple-400" />
              Image to Video Generation
            </CardTitle>
            <CardDescription className="text-gray-300">
              Generate videos from images with text prompts manually or extract scenes from your script automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Manual Setup
              </TabsTrigger>
              <TabsTrigger value="script" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Script Extraction
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        <TabsContent value="manual" className="space-y-6">
          {/* Duration Selection */}
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-4 w-4 text-green-600" />
            Video Duration
          </CardTitle>
          <CardDescription>
            Available durations for {selectedModel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-2 ${availableDurations.length <= 2 ? 'grid-cols-2' : availableDurations.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
            {availableDurations.map((dur) => (
              <Button
                key={dur}
                variant={duration === dur ? 'default' : 'outline'}
                onClick={() => {
                  setDuration(dur as 5 | 10)
                  onDurationChange(dur as 5 | 10 )
                }}
                disabled={isGenerating}
                className="flex-1 h-12"
              >
                <Clock className="h-4 w-4 mr-2" />
                {dur}s
                {dur === modelDefaultDuration && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Default
                  </Badge>
                )}
              </Button>
            ))}
          </div>
          <div className="mt-3 text-center">
            <Badge variant="outline" className="text-xs">
              Selected: {duration} seconds
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Image Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-4 w-4 text-blue-600" />
            Upload Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragActive(false)
              handleFiles(e.dataTransfer.files)
            }}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Drag and drop images here, or</p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
              id="image-upload"
            />
            <Button 
              variant="outline" 
              className="cursor-pointer"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              Choose Images
            </Button>
          </div>

          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Images Section */}
      {imageSets.length > 0 && (
        <>
          <Separator />
          
          <Card className="bg-green-900/20 border-green-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Grid className="h-4 w-4 text-green-400" />
                Generated Images ({imageSets.reduce((total, set) => total + set.imageUrls.length, 0)} available)
              </CardTitle>
              <CardDescription className="text-gray-300">
                Select images from your previous generations to create videos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selection Controls */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllImages}
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Select All ({imageSets.reduce((total, set) => total + set.imageUrls.length, 0)})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearImageSelection}
                    disabled={isGenerating || selectedImageUrls.length === 0}
                    className="gap-2"
                  >
                    <Square className="h-4 w-4" />
                    Clear Selection
                  </Button>
                </div>
                <Badge variant="secondary" className="bg-green-900/40 text-green-300">
                  {selectedImageUrls.length} selected
                </Badge>
              </div>

              {/* Images Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-96 overflow-y-auto">
                {imageSets.map((set, setIndex) => 
                  set.imageUrls.map((imageUrl, imageIndex) => {
                    const isSelected = selectedImageUrls.includes(imageUrl)
                    return (
                      <div
                        key={`${set.id}-${imageIndex}`}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          isSelected 
                            ? 'border-green-500 bg-green-900/20' 
                            : 'border-gray-600 hover:border-green-400'
                        }`}
                        onClick={() => toggleImageSelection(imageUrl)}
                      >
                        <img
                          src={imageUrl}
                          alt={`Generated image ${setIndex}-${imageIndex}`}
                          className="w-full h-20 object-cover"
                        />
                        
                        {/* Selection indicator */}
                        <div className="absolute top-1 right-1">
                          <Checkbox
                            checked={isSelected}
                            className="bg-gray-700 border-gray-600"
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={() => toggleImageSelection(imageUrl)}
                          />
                        </div>
                        
                        {/* Set info */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 text-white text-xs p-1">
                          Set {setIndex + 1} - {imageIndex + 1}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Prompt for selected images */}
              {selectedImageUrls.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-white">
                    Video Prompt for Selected Images
                  </Label>
                  <Input
                    placeholder="Describe how the selected images should animate..."
                    value={generatedImagePrompt}
                    onChange={(e) => setGeneratedImagePrompt(e.target.value)}
                    disabled={isGenerating}
                    className="bg-gray-700 text-white border-gray-600"
                  />
                </div>
              )}

              {/* Generate button for selected images */}
              {selectedImageUrls.length > 0 && generatedImagePrompt.trim() && (
                <div className="flex items-center justify-between p-4 bg-green-900/30 rounded-lg border border-green-600">
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="bg-green-900/40 text-green-300">
                        {selectedImageUrls.length} Images
                      </Badge>
                      <Badge variant="secondary" className="bg-green-900/40 text-green-300">
                        {duration}s Each
                      </Badge>
                    </div>
                    <p className="text-sm text-green-300">
                      Generate {selectedImageUrls.length} videos from selected images
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleGenerateFromSelected}
                    disabled={isGenerating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4 mr-2" />
                        Generate {selectedImageUrls.length} Videos
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Prompts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-4 w-4 text-purple-600" />
            Video Prompts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {prompts.map((prompt, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1">
                <Label className="text-sm font-medium">
                  Prompt {index + 1}
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Describe how the image should animate..."
                    value={prompt}
                    onChange={(e) => updatePrompt(index, e.target.value)}
                    disabled={isGenerating}
                  />
                  {prompts.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePrompt(index)}
                      disabled={isGenerating}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          <Button
            variant="outline"
            onClick={addPrompt}
            disabled={isGenerating || prompts.length >= 10}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Prompt
          </Button>
        </CardContent>
      </Card>

          {/* Generation Summary for Manual Mode */}
          {validPrompts.length > 0 && images.length > 0 && (
            <Card className="bg-purple-900/20 border-purple-600">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{validPrompts.length} Videos</Badge>
                      <Badge variant="secondary">{images.length} Images</Badge>
                      <Badge variant="secondary">{duration}s Each</Badge>
                    </div>
                    <p className="text-sm text-purple-300">
                      Each prompt will be paired with images (reusing first image if needed)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="script" className="space-y-6">
          <VideoSceneExtraction
            scriptInput={scriptInput}
            onScriptInputChange={setScriptInput}
            numberOfScenesToExtract={numberOfScenesToExtract}
            onNumberOfScenesChange={setNumberOfScenesToExtract}
            isExtractingScenes={isExtractingScenes}
            sceneExtractionError={sceneExtractionError}
            extractedScenes={extractedScenes}
            selectedScenes={selectedScenes}
            onToggleSceneSelection={handleToggleSceneSelection}
            onExtractScenes={handleExtractScenes}
            onClearError={handleClearSceneError}
            onUpdateScenePrompt={handleUpdateScenePrompt}
            onAddCustomScene={handleAddCustomScene}
            scriptSourceInfo={getScriptSourceInfo()}
          />
          
          {/* Note about images still being required */}
          {selectedScenes.length > 0 && (
            <Card className="bg-yellow-900/20 border-yellow-600">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="text-yellow-200 font-medium">Images Still Required</p>
                    <p className="text-sm text-yellow-300">
                      Upload images below to pair with your extracted scene prompts. Images will be reused as needed.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Shared Image Upload */}
        <Card className="bg-gray-900 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-blue-400" />
              Upload Images
            </CardTitle>
            <CardDescription className="text-gray-300">
              Upload images to pair with your prompts. Images will be reused if you have more prompts than images.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setDragActive(false)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setDragActive(false)
                handleFiles(e.dataTransfer.files)
              }}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2 text-white">
                Drop images here or click to upload
              </p>
              <p className="text-gray-400 mb-4">
                Supports JPG, PNG, GIF files up to 10MB each
              </p>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFiles(e.target.files)
                  }
                }}
                multiple
                className="hidden"
                id="image-upload"
              />
              <Button
                onClick={() => document.getElementById('image-upload')?.click()}
                variant="outline"
                className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
              >
                <Upload className="h-4 w-4 mr-2" />
                Select Images
              </Button>
            </div>

            {/* Display uploaded images */}
            {images.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label className="text-white">Uploaded Images ({images.length})</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {images.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border border-gray-600">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-red-600 border-red-600 text-white hover:bg-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shared Duration and Generation Controls */}
        <Card className="bg-gray-900 border-gray-700 text-white">
          <CardContent className="space-y-4 pt-6">
            {/* Duration Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-400" />
                <Label className="text-white">Video Duration</Label>
                <Badge variant="outline" className="text-xs">
                  Available for {selectedModel}
                </Badge>
              </div>
              
              <div className={`grid gap-2 ${availableDurations.length <= 2 ? 'grid-cols-2' : availableDurations.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                {availableDurations.map((dur) => (
                  <Button
                    key={dur}
                    variant={duration === dur ? 'default' : 'outline'}
                    onClick={() => {
                      setDuration(dur as 5 | 10)
                      onDurationChange(dur as 5 | 10 )
                    }}
                    disabled={isGenerating}
                    className="flex-1 h-12"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {dur}s
                    {dur === modelDefaultDuration && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Default
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="bg-gray-600" />

            {/* Generation Controls */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || 
                  (activeTab === 'manual' && (validPrompts.length === 0 || images.length === 0)) ||
                  (activeTab === 'script' && (selectedScenes.length === 0 || images.length === 0))
                }
                size="lg"
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Videos...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4 mr-2" />
                    Generate Videos ({activeTab === 'manual' ? validPrompts.length : selectedScenes.length})
                  </>
                )}
              </Button>
              
              <div className="text-center">
                <Badge variant="outline" className="text-xs">
                  {activeTab === 'manual' ? validPrompts.length : selectedScenes.length} prompt(s) × {images.length} image(s) × {duration}s duration
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  )
} 