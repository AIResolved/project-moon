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
  ImageIcon,
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
  Moon,
  Zap
} from 'lucide-react'

interface ThumbnailGeneratorProps {
  thumbnailPrompt: string
  onThumbnailPromptChange: (value: string) => void
  referenceImages: File[]
  onReferenceImagesChange: (files: File[]) => void
  isGeneratingThumbnail: boolean
  thumbnailResult: string | null
  thumbnailError: string | null
  onGenerateThumbnail: () => void
  onDownloadThumbnail: () => void
  onClearThumbnailGenerator: () => void
  // New style props
  selectedImageStyle?: string
  onImageStyleChange?: (style: string) => void
  selectedLightingTone?: string
  onLightingToneChange?: (tone: string) => void
  customStylePrompt?: string
  onCustomStylePromptChange?: (prompt: string) => void
}

export function ThumbnailGenerator({
  thumbnailPrompt,
  onThumbnailPromptChange,
  referenceImages,
  onReferenceImagesChange,
  isGeneratingThumbnail,
  thumbnailResult,
  thumbnailError,
  onGenerateThumbnail,
  onDownloadThumbnail,
  onClearThumbnailGenerator,
  selectedImageStyle = 'realistic',
  onImageStyleChange,
  selectedLightingTone = 'balanced',
  onLightingToneChange,
  customStylePrompt = '',
  onCustomStylePromptChange
}: ThumbnailGeneratorProps) {
  const [showStyleOptions, setShowStyleOptions] = useState(false)

  const handleReferenceImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    onReferenceImagesChange([...referenceImages, ...files])
  }

  const removeReferenceImage = (index: number) => {
    const newImages = referenceImages.filter((_, i) => i !== index)
    onReferenceImagesChange(newImages)
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
    let finalPrompt = thumbnailPrompt
    
    // Apply Image Style
    if (selectedImageStyle && selectedImageStyle !== 'none') {
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
          <ImageIcon className="h-5 w-5 text-green-600" />
          Thumbnail Generator
        </CardTitle>
        <CardDescription>
          Generate custom thumbnails with style options, reference images, and AI prompts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Style Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Thumbnail Style Options</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStyleOptions(!showStyleOptions)}
              disabled={isGeneratingThumbnail}
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
                          disabled={isGeneratingThumbnail}
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
                          disabled={isGeneratingThumbnail}
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
                      placeholder="Add custom thumbnail style (e.g., 'bold text overlay, vibrant colors, high contrast')"
                      value={customStylePrompt}
                      onChange={(e) => onCustomStylePromptChange(e.target.value)}
                      disabled={isGeneratingThumbnail}
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

        {/* Thumbnail Prompt */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Thumbnail Description</Label>
          <Textarea
            placeholder="Describe your ideal thumbnail (e.g., 'YouTube thumbnail with surprised person pointing at glowing text saying AMAZING DISCOVERY')"
            value={thumbnailPrompt}
            onChange={(e) => onThumbnailPromptChange(e.target.value)}
            disabled={isGeneratingThumbnail}
            rows={4}
            className="text-sm"
          />
          {(selectedImageStyle !== 'realistic' || selectedLightingTone !== 'balanced' || customStylePrompt) && (
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
              <strong>Final Prompt Preview:</strong> {getStyledPrompt()}
            </div>
          )}
        </div>

        {/* Reference Images Upload */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Reference Images (Optional)</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearThumbnailGenerator}
              disabled={isGeneratingThumbnail}
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
                  disabled={isGeneratingThumbnail}
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
                      disabled={isGeneratingThumbnail}
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
          onClick={onGenerateThumbnail}
          disabled={isGeneratingThumbnail || !thumbnailPrompt.trim()}
          className="w-full"
          size="lg"
        >
          {isGeneratingThumbnail ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating Thumbnail...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Thumbnail
            </>
          )}
        </Button>

        {/* Results */}
        {thumbnailError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Generation Failed</h4>
                <p className="text-sm text-red-700 mt-1">{thumbnailError}</p>
              </div>
            </div>
          </div>
        )}

        {thumbnailResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <Label className="text-base font-medium text-green-900">Generated Thumbnail</Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onDownloadThumbnail}
                disabled={isGeneratingThumbnail}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <img
                src={thumbnailResult}
                alt="Generated Thumbnail"
                className="w-full max-w-lg mx-auto rounded-lg shadow-lg"
              />
            </div>
          </div>
        )}

        {/* Usage Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">Thumbnail Tips</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Use bold, clear descriptions for better results</li>
                <li>• Reference images help guide the style and composition</li>
                <li>• Combine Image Style + Lighting Tone for consistent looks</li>
                <li>• Include text descriptions like "BIG TEXT saying [your text]"</li>
                <li>• Mention colors, emotions, and visual elements explicitly</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 