'use client'

import { useState } from 'react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { IMAGE_STYLES, LIGHTING_TONES, LEGACY_IMAGE_STYLES } from '@/data/image'
import { Plus, Save, X, Palette, Sun, Moon, Zap } from 'lucide-react'
import type { ExtractedScene } from '@/types/image-generation'

interface ImageStyleSelectorProps {
  selectedImageStyle: string
  onImageStyleChange: (style: string) => void
  selectedLightingTone: string
  onLightingToneChange: (tone: string) => void
  aspectRatio: string
  onAspectRatioChange: (ratio: '16:9' | '1:1' | '9:16') => void
  selectedScenes: number[]
  extractedScenes: ExtractedScene[]
  isGenerating: boolean
  isExtractingScenes: boolean
  customStylePrompt?: string
  onCustomStylePromptChange?: (prompt: string) => void
}

export function ImageStyleSelector({
  selectedImageStyle,
  onImageStyleChange,
  selectedLightingTone,
  onLightingToneChange,
  aspectRatio,
  onAspectRatioChange,
  selectedScenes,
  extractedScenes,
  isGenerating,
  isExtractingScenes,
  customStylePrompt = '',
  onCustomStylePromptChange
}: ImageStyleSelectorProps) {
  const [showCustomStyle, setShowCustomStyle] = useState(false)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  // Helper function to apply combined styles to prompt
  const applyStylesToPrompt = (basePrompt: string) => {
    let styledPrompt = basePrompt
    
    // Apply Image Style
    if (selectedImageStyle && selectedImageStyle !== 'none') {
      const style = IMAGE_STYLES[selectedImageStyle as keyof typeof IMAGE_STYLES]
      if (style) {
        styledPrompt = `${style.prefix}${styledPrompt}`
      }
    }
    
    // Apply Lighting Tone
    if (selectedLightingTone && selectedLightingTone !== 'balanced') {
      const tone = LIGHTING_TONES[selectedLightingTone as keyof typeof LIGHTING_TONES]
      if (tone) {
        styledPrompt = `${tone.prefix}${styledPrompt}`
      }
    }
    
    // Apply Custom Style if provided
    if (customStylePrompt && customStylePrompt.trim()) {
      styledPrompt = `${customStylePrompt.trim()}, ${styledPrompt}`
    }
    
    return styledPrompt
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

  return (
    <div className="space-y-6 bg-gray-900 text-white p-4 rounded-lg">
      <div className="space-y-4">
        {/* Image Style Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-blue-600" />
            <Label className="text-base font-semibold">Image Style</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose the visual style for your generated images
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(IMAGE_STYLES).map(([key, style]) => (
              <Button
                key={key}
                variant={selectedImageStyle === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => onImageStyleChange(key)}
                disabled={isGenerating}
                className="flex flex-col h-auto py-4 px-3 text-center"
              >
                <span className="text-lg mb-1">{getImageStyleIcon(key)}</span>
                <span className="font-medium text-xs">{style.name}</span>
                <span className="text-[10px] opacity-70 leading-tight mt-1">{style.description}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Lighting Tone Section */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Lighting Tone</Label>
          <p className="text-sm text-muted-foreground">
            Set the lighting mood and atmosphere
          </p>
          
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(LIGHTING_TONES).map(([key, tone]) => (
              <Button
                key={key}
                variant={selectedLightingTone === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => onLightingToneChange(key)}
                disabled={isGenerating}
                className="flex flex-col h-auto py-4"
              >
                <div className="mb-2">{getLightingIcon(key)}</div>
                <span className="font-medium text-sm">{tone.name}</span>
                <span className="text-xs opacity-70 text-center leading-tight mt-1">{tone.description}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Style Prompt */}
        {onCustomStylePromptChange && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">Custom Style (Optional)</Label>
            <Textarea
              placeholder="Add custom style instructions (e.g., 'oil painting, watercolor, cyberpunk neon, vintage photo')"
              value={customStylePrompt}
              onChange={(e) => onCustomStylePromptChange(e.target.value)}
              disabled={isGenerating}
              rows={2}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Custom style will be combined with the selected Image Style and Lighting Tone
            </p>
          </div>
        )}

        {/* Aspect Ratio */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Aspect Ratio</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: '16:9', label: 'Landscape', desc: '16:9', icon: '🖥️' },
              { value: '1:1', label: 'Square', desc: '1:1', icon: '⬜' },
              { value: '9:16', label: 'Portrait', desc: '9:16', icon: '📱' }
            ].map((ratio) => (
              <Button
                key={ratio.value}
                variant={aspectRatio === ratio.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onAspectRatioChange(ratio.value as '16:9' | '1:1' | '9:16')}
                disabled={isGenerating}
                className="flex flex-col h-auto py-3"
              >
                <span className="text-lg mb-1">{ratio.icon}</span>
                <span className="font-medium text-sm">{ratio.label}</span>
                <span className="text-xs opacity-70">{ratio.desc}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <div className="pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="text-blue-600 hover:text-blue-800"
          >
            <Plus className={`h-4 w-4 mr-2 transition-transform ${showAdvancedOptions ? 'rotate-45' : ''}`} />
            {showAdvancedOptions ? 'Hide' : 'Show'} Legacy Styles
          </Button>
        </div>

        {/* Advanced/Legacy Options */}
        {showAdvancedOptions && (
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5 text-blue-600" />
                Legacy Art Styles
              </CardTitle>
              <CardDescription>
                Classic artistic styles for specialized use cases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label>Legacy Style</Label>
                <Select value={selectedImageStyle} onValueChange={onImageStyleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a legacy style (optional)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    <SelectItem value="none">No legacy style</SelectItem>
                    {LEGACY_IMAGE_STYLES.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Legacy styles will override the modern Image Style selection above
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Style Preview */}
      {(selectedImageStyle !== 'none' || selectedLightingTone !== 'balanced' || customStylePrompt) && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">Preview</Badge>
              Active Style Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedImageStyle && selectedImageStyle !== 'none' && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Image Style:</span>
                <Badge variant="outline">
                  {getImageStyleIcon(selectedImageStyle)} {IMAGE_STYLES[selectedImageStyle as keyof typeof IMAGE_STYLES]?.name}
                </Badge>
              </div>
            )}
            {selectedLightingTone && selectedLightingTone !== 'balanced' && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Lighting:</span>
                <Badge variant="outline">
                  {getLightingIcon(selectedLightingTone)} {LIGHTING_TONES[selectedLightingTone as keyof typeof LIGHTING_TONES]?.name}
                </Badge>
              </div>
            )}
            {customStylePrompt && (
              <div className="text-sm">
                <span className="font-medium">Custom Style:</span>
                <p className="text-gray-600 mt-1 text-xs">{customStylePrompt}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 