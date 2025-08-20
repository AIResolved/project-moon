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
import { ProviderModelSelector } from './ProviderModelSelector'
import { VIDEO_PROVIDERS } from '../../types/text-image-video-generation'
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
  Square
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
  
  const [prompts, setPrompts] = useState<string[]>([''])
  const [images, setImages] = useState<File[]>([])
  const [duration, setDuration] = useState<5 | 10>(defaultDuration as 5 | 10)
  const [dragActive, setDragActive] = useState(false)
  const [availableDurations, setAvailableDurations] = useState<number[]>([4, 6, 8, 10])
  const [modelDefaultDuration, setModelDefaultDuration] = useState<number>(6)
  
  // State for generated images selection
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([])
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState<string>('')

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

  const handleGenerate = async () => {
    const validPrompts = prompts.filter(p => p.trim().length > 0)
    if (validPrompts.length === 0 || images.length === 0) return

    // Immediate user notification
    alert('✅ Generation started! You can track progress under the "Current Generation" tab.')

    onDurationChange(duration)
    await onGenerate(validPrompts, images, duration)
  }

  const validPrompts = prompts.filter(p => p.trim().length > 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-purple-600" />
            Image to Video Generation
          </CardTitle>
          <CardDescription>
            Generate videos from images with text prompts. Each image will create a {duration}-second video.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Provider and Model Selection */}
      <ProviderModelSelector mode="image-to-video" />

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

      {/* Generation Summary */}
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
              
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || validPrompts.length === 0 || images.length === 0}
                size="lg"
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4 mr-2" />
                    Generate Videos
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 