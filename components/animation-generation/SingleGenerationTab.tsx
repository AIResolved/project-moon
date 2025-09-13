'use client'

import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { IMAGE_STYLES, LIGHTING_TONES } from '@/data/image'
import {
  Zap,
  Upload,
  X,
  Trash2,
  Download,
  Sparkles,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  Palette,
  Sun,
  Moon
} from 'lucide-react'

interface SingleGenerationTabProps {
  animationPrompt: string
  setAnimationPrompt: (prompt: string) => void
  referenceImages: File[]
  setReferenceImages: (images: File[]) => void
  isGeneratingAnimation: boolean
  animationResult: {url: string, prompt: string} | null
  animationError: string | null
  selectedImageStyle: string
  setSelectedImageStyle: (style: string) => void
  selectedLightingTone: string
  setSelectedLightingTone: (tone: string) => void
  customStylePrompt: string
  setCustomStylePrompt: (prompt: string) => void
  onGenerateAnimation: () => void
  onDownloadAnimation: () => void
  onClearAnimationGenerator: () => void
}

export function SingleGenerationTab({
  animationPrompt,
  setAnimationPrompt,
  referenceImages,
  setReferenceImages,
  isGeneratingAnimation,
  animationResult,
  animationError,
  selectedImageStyle,
  setSelectedImageStyle,
  selectedLightingTone,
  setSelectedLightingTone,
  customStylePrompt,
  setCustomStylePrompt,
  onGenerateAnimation,
  onDownloadAnimation,
  onClearAnimationGenerator
}: SingleGenerationTabProps) {
  const [showStyleOptions, setShowStyleOptions] = useState(false)

  const handleReferenceImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setReferenceImages([...referenceImages, ...files])
  }

  const removeReferenceImage = (index: number) => {
    const newImages = referenceImages.filter((_, i) => i !== index)
    setReferenceImages(newImages)
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
  const getStyledPrompt = () => {
    let finalPrompt = animationPrompt
    
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
          <Zap className="h-5 w-5 text-white-600" />
          Animation Generator
        </CardTitle>
        <CardDescription>
          Create animations from reference images with custom prompts and style options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Style Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Animation Style Options</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStyleOptions(!showStyleOptions)}
              disabled={isGeneratingAnimation}
            >
              <Palette className="h-4 w-4 mr-2" />
              {showStyleOptions ? 'Hide' : 'Show'} Styles
            </Button>
          </div>

          {showStyleOptions && (
            <Card className="border-purple-200 bg-purple-50/30">
              <CardContent className="pt-6 space-y-6">
                {/* Image Style Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-purple-600" />
                    <Label className="font-semibold">Animation Style</Label>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(IMAGE_STYLES).map(([key, style]) => (
                      <Button
                        key={key}
                        variant={selectedImageStyle === key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedImageStyle(key)}
                        disabled={isGeneratingAnimation}
                        className="flex flex-col h-auto py-3 px-2 text-center"
                      >
                        <span className="text-sm mb-1">{getImageStyleIcon(key)}</span>
                        <span className="font-medium text-xs">{style.name}</span>
                        <span className="text-[10px] opacity-70 leading-tight mt-1">{style.description}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Lighting Tone Section */}
                <div className="space-y-3">
                  <Label className="font-semibold">Lighting Tone</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(LIGHTING_TONES).map(([key, tone]) => (
                      <Button
                        key={key}
                        variant={selectedLightingTone === key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedLightingTone(key)}
                        disabled={isGeneratingAnimation}
                        className="flex flex-col h-auto py-3"
                      >
                        <div className="mb-1">{getLightingIcon(key)}</div>
                        <span className="font-medium text-xs">{tone.name}</span>
                        <span className="text-[10px] opacity-70 text-center leading-tight mt-1">{tone.description}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Style Prompt */}
                <div className="space-y-3">
                  <Label className="font-semibold">Custom Style (Optional)</Label>
                  <Textarea
                    placeholder="Add custom animation style (e.g., 'smooth camera movement, particle effects, glowing elements')"
                    value={customStylePrompt}
                    onChange={(e) => setCustomStylePrompt(e.target.value)}
                    disabled={isGeneratingAnimation}
                    rows={2}
                    className="text-sm"
                  />
                </div>

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

        {/* Animation Prompt */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Animation Description</Label>
          <Textarea
            placeholder="Describe how you want the reference image to animate (e.g., 'slow zoom in with particles floating around, gentle camera movement from left to right')"
            value={animationPrompt}
            onChange={(e) => setAnimationPrompt(e.target.value)}
            disabled={isGeneratingAnimation}
            rows={4}
            className="text-sm"
          />
          {(selectedImageStyle !== 'realistic' || selectedLightingTone !== 'balanced' || customStylePrompt) && (
            <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded">
              <strong>Final Prompt Preview:</strong> {getStyledPrompt()}
            </div>
          )}
        </div>

        {/* Reference Images Upload */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Reference Images (Required)</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAnimationGenerator}
              disabled={isGeneratingAnimation}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
          
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
                  disabled={isGeneratingAnimation}
                />
              </div>
            </div>
          </div>

          {/* Reference Images Preview */}
          {referenceImages.length > 0 && (
            <div className="space-y-3">
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
                      disabled={isGeneratingAnimation}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                      {file.name.length > 12 ? file.name.substring(0, 12) + '...' : file.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <Button
          onClick={onGenerateAnimation}
          disabled={isGeneratingAnimation || !animationPrompt.trim() || referenceImages.length === 0}
          className="w-full"
          size="lg"
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Generation Failed</h4>
                <p className="text-sm text-red-700 mt-1">{animationError}</p>
              </div>
            </div>
          </div>
        )}

        {animationResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <Label className="text-base font-medium text-green-900">Generated Image</Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onDownloadAnimation}
                disabled={isGeneratingAnimation}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 relative">
              <div className="relative inline-block">
                <img
                  src={animationResult.url}
                  alt="Generated animation frame"
                  className="w-full max-w-lg mx-auto rounded-lg shadow-lg"
                />
                {/* Info icon with tooltip */}
                <div className="absolute top-2 right-2 group">
                  <div className="bg-black bg-opacity-60 rounded-full p-2 cursor-help">
                    <Info className="h-4 w-4 text-white" />
                  </div>
                  {/* Tooltip */}
                  <div className="absolute right-0 top-10 bg-black text-white text-xs rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 w-80 max-w-xs">
                    <div className="font-semibold mb-1">Prompt Used:</div>
                    <div className="break-words">{animationResult.prompt}</div>
                    {/* Arrow */}
                    <div className="absolute -top-1 right-4 w-2 h-2 bg-black transform rotate-45"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}