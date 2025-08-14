'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'
import { Settings, Palette, AlertCircle, Loader2, VideoIcon, Clock, MoveUp, MoveDown, RotateCcw, GripVertical } from 'lucide-react'
import type { SegmentTiming, IntroImageConfig, IntroVideoConfig } from '@/types/video-generation'

// Type for segment items that can be reordered
type SegmentItem = {
  id: string
  type: 'image' | 'video'
  url: string
  duration: number
  originalIndex: number
  thumbnail?: string
}

interface VideoSettingsProps {
  settings: any
  onSettingsChange: (settings: any) => void
  hasPrerequisites: boolean
  selectedImagesCount: number
  selectedVideosCount: number
  audioGeneration: any
  isGeneratingVideo: boolean
  onGenerateVideo: () => void
  // Segment timing props
  customSegmentTimings: SegmentTiming[]
  onUpdateSegmentTiming: (index: number, duration: number) => void
  onDistributeEquallyAcrossSegments: () => void
  totalSegmentDuration: number
  // Subtitle styling props
  subtitleSettings: any
  onSubtitleSettingsChange: (settings: any) => void
  // Segment ordering props
  orderedSegments: SegmentItem[]
  onMoveSegment: (fromIndex: number, toIndex: number) => void
  onResetOrder: () => void
  isCustomOrder: boolean
}

const fontFamilyOptions = [
  { value: 'Arapey Regular', label: 'Arapey Regular' },
  { value: 'Clear Sans', label: 'Clear Sans' },
  { value: 'Didact Gothic', label: 'Didact Gothic' },
  { value: 'Montserrat ExtraBold', label: 'Montserrat ExtraBold' },
  { value: 'Montserrat SemiBold', label: 'Montserrat SemiBold' },
  { value: 'OpenSans Bold', label: 'OpenSans Bold' },
  { value: 'Permanent Marker', label: 'Permanent Marker' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Sue Ellen Francisco', label: 'Sue Ellen Francisco' },
  { value: 'UniNeue', label: 'UniNeue' },
  { value: 'WorkSans Light', label: 'WorkSans Light' }
]

export function VideoSettings({
  settings,
  onSettingsChange,
  hasPrerequisites,
  selectedImagesCount,
  selectedVideosCount,
  audioGeneration,
  isGeneratingVideo,
  onGenerateVideo,
  customSegmentTimings,
  onUpdateSegmentTiming,
  onDistributeEquallyAcrossSegments,
  totalSegmentDuration,
  subtitleSettings,
  onSubtitleSettingsChange,
  orderedSegments,
  onMoveSegment,
  onResetOrder,
  isCustomOrder
}: VideoSettingsProps) {




  return (
    <div className="space-y-6">
      {/* Simplified Video Settings */}
      <Card className="bg-gray-800 shadow-sm border border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Video Settings
          </CardTitle>
          <CardDescription>
            Configure video effects and segment durations for your images and videos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video Effects */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Video Effects</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dust-overlay"
                  checked={settings.dustOverlay || false}
                  onCheckedChange={(checked) => onSettingsChange({ dustOverlay: checked })}
                  disabled={!hasPrerequisites}
                />
                <Label htmlFor="dust-overlay" className="text-sm">Dust overlay effect</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="zoom-effect"
                  checked={settings.zoomEffect || false}
                  onCheckedChange={(checked) => onSettingsChange({ zoomEffect: checked })}
                  disabled={!hasPrerequisites}
                />
                <Label htmlFor="zoom-effect" className="text-sm">Zoom in/out effects</Label>
              </div>
            </div>
          </div>

          {/* Segment Durations with Reordering */}
          {orderedSegments.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Segment Order & Durations</Label>
                <div className="flex gap-2">
                  <Button
                    onClick={onDistributeEquallyAcrossSegments}
                    size="sm"
                    variant="outline"
                    disabled={!hasPrerequisites}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Distribute Equally
                  </Button>
                  {isCustomOrder && (
                    <Button
                      onClick={onResetOrder}
                      size="sm"
                      variant="outline"
                      disabled={!hasPrerequisites}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset Order
                    </Button>
                  )}
                  <Badge variant="outline" className="border-gray-600">
                    Total: {totalSegmentDuration.toFixed(1)}s / {audioGeneration?.duration?.toFixed(1) || '0'}s
                  </Badge>
                </div>
              </div>

              {isCustomOrder && (
                <div className="text-xs text-blue-400 bg-blue-900/20 p-2 rounded">
                  ℹ️ Custom order active. Drag segments to reorder or click Reset Order to restore default sequence.
                </div>
              )}

              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-4">
                {orderedSegments.map((segment, index) => {
                  const timing = customSegmentTimings[index]
                  if (!timing) return null
                  
                  const mediaTypeIcon = segment.type === 'image' ? '🖼️' : '🎬'
                  const mediaType = segment.type === 'image' ? 'Image' : 'Video'
                  
                  return (
                    <div key={`${segment.id}-${index}`} className="flex items-center gap-3 p-3 bg-gray-700 border-2 border-gray-600 rounded-lg hover:border-gray-500 transition-colors">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-8 h-8 rounded overflow-hidden bg-gray-600">
                        {segment.thumbnail && (
                          <img 
                            src={segment.thumbnail} 
                            alt={`${mediaType} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      
                      {/* Position & Type */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-1">
                        <Badge variant="secondary" className="bg-gray-600 text-gray-300 text-xs">
                          {index + 1}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {mediaTypeIcon}
                        </span>
                      </div>
                      
                      {/* Type Label */}
                      <div className="flex-shrink-0 w-12 text-sm font-medium text-gray-300">
                        {mediaType}
                      </div>
                      
                      {/* Duration Input */}
                      <div className="flex-1">
                        <Input
                          type="number"
                          value={timing.duration.toFixed(1)}
                          onChange={(e) => onUpdateSegmentTiming(index, parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs"
                          step="0.5"
                          min="0.5"
                          disabled={!hasPrerequisites}
                        />
                      </div>
                      
                      <div className="flex-shrink-0 text-xs text-gray-400">
                        seconds
                      </div>
                      
                      {/* Reorder Controls */}
                      <div className="flex-shrink-0 flex flex-col gap-1">
                        <Button
                          onClick={() => onMoveSegment(index, index - 1)}
                          size="sm"
                          variant="ghost"
                          disabled={!hasPrerequisites || index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <MoveUp className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => onMoveSegment(index, index + 1)}
                          size="sm"
                          variant="ghost"
                          disabled={!hasPrerequisites || index === orderedSegments.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <MoveDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <div className="text-xs text-gray-300 bg-blue-900/20 p-3 rounded-lg">
                <p className="font-medium mb-1">Duration Logic:</p>
                <ul className="space-y-1">
                  <li>• Videos use their original duration by default</li>
                  <li>• Images share the remaining audio duration equally</li>
                  <li>• Adjust individual segments as needed</li>
                  <li>• Total should match your audio duration for best results</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>





      {/* Universal Settings Card - Quality and Subtitles */}
      <Card className="bg-gray-800 shadow-sm border border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Video Quality & Subtitles
          </CardTitle>
          <CardDescription>
            Configure video quality and subtitle options for all video modes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Video Quality</Label>
              <Select 
                value={settings.videoQuality} 
                onValueChange={(value: 'hd' | 'sd') => onSettingsChange({ videoQuality: value })}
                disabled={!hasPrerequisites}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hd">HD (1280x720)</SelectItem>
                  <SelectItem value="sd">SD (854x480)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Subtitles</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-subtitles-universal"
                  checked={settings.includeSubtitles || false}
                  onCheckedChange={(checked) => onSettingsChange({ includeSubtitles: checked as boolean })}
                  disabled={!hasPrerequisites || !audioGeneration?.subtitlesUrl}
                />
                <Label htmlFor="include-subtitles-universal" className="text-sm">
                  Include subtitles {!audioGeneration?.subtitlesUrl && '(not available)'}
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Background Music</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-uploaded-music"
                  checked={settings.useCustomMusic || false}
                  onCheckedChange={(checked) => onSettingsChange({ 
                    ...settings, 
                    useCustomMusic: checked as boolean 
                  })}
                  disabled={!hasPrerequisites}
                />
                <Label htmlFor="use-uploaded-music" className="text-sm">
                  Use uploaded music files
                </Label>
              </div>
            </div>
          </div>

          {/* Subtitle Styling Controls */}
          {settings.includeSubtitles && audioGeneration?.subtitlesUrl && (
            <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="h-5 w-5 text-yellow-600" />
                <h4 className="font-medium text-yellow-800">Subtitle Styling</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Font Family */}
                <div className="space-y-2">
                  <Label className="text-sm">Font Family</Label>
                  <Select 
                    value={subtitleSettings.fontFamily} 
                    onValueChange={(value) => onSubtitleSettingsChange({ ...subtitleSettings, fontFamily: value })}
                    disabled={!hasPrerequisites}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilyOptions.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Font Weight */}
                <div className="space-y-2">
                  <Label className="text-sm">Font Weight</Label>
                  <Select 
                    value={subtitleSettings.fontWeight} 
                    onValueChange={(value) => onSubtitleSettingsChange({ ...subtitleSettings, fontWeight: value })}
                    disabled={!hasPrerequisites}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal (400)</SelectItem>
                      <SelectItem value="500">Medium (500)</SelectItem>
                      <SelectItem value="600">Semi Bold (600)</SelectItem>
                      <SelectItem value="700">Bold (700)</SelectItem>
                      <SelectItem value="800">Extra Bold (800)</SelectItem>
                      <SelectItem value="900">Black (900)</SelectItem>
                      <SelectItem value="1000">Ultra Black (1000)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Text Transform */}
                <div className="space-y-2">
                  <Label className="text-sm">Text Style</Label>
                  <Select 
                    value={subtitleSettings.textTransform} 
                    onValueChange={(value) => onSubtitleSettingsChange({ ...subtitleSettings, textTransform: value })}
                    disabled={!hasPrerequisites}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Normal</SelectItem>
                      <SelectItem value="uppercase">UPPERCASE</SelectItem>
                      <SelectItem value="lowercase">lowercase</SelectItem>
                      <SelectItem value="capitalize">Capitalize</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Font Color */}
                <div className="space-y-2">
                  <Label className="text-sm">Font Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={subtitleSettings.fontColor}
                      onChange={(e) => onSubtitleSettingsChange({ ...subtitleSettings, fontColor: e.target.value })}
                      className="w-12 h-8 p-0 border rounded cursor-pointer"
                      disabled={!hasPrerequisites}
                    />
                    <Input
                      type="text"
                      value={subtitleSettings.fontColor}
                      onChange={(e) => onSubtitleSettingsChange({ ...subtitleSettings, fontColor: e.target.value })}
                      placeholder="#ffffff"
                      className="flex-1 h-8 text-xs"
                      disabled={!hasPrerequisites}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Font Size */}
                <div className="space-y-2">
                  <Label className="text-sm">Font Size: {subtitleSettings.fontSize}px</Label>
                  <input
                    type="range"
                    min="12"
                    max="60"
                    step="2"
                    value={subtitleSettings.fontSize}
                    onChange={(e) => onSubtitleSettingsChange({ ...subtitleSettings, fontSize: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                    disabled={!hasPrerequisites}
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>12px</span>
                    <span>60px</span>
                  </div>
                </div>

                {/* Stroke Width */}
                <div className="space-y-2">
                  <Label className="text-sm">Stroke Outline: {subtitleSettings.strokeWidth}px</Label>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="0.5"
                    value={subtitleSettings.strokeWidth}
                    onChange={(e) => onSubtitleSettingsChange({ ...subtitleSettings, strokeWidth: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                    disabled={!hasPrerequisites}
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0px</span>
                    <span>8px</span>
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="mt-4 p-4 bg-black rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-2">Subtitle Preview:</p>
                  <div 
                    style={{
                      fontFamily: subtitleSettings.fontFamily,
                      color: subtitleSettings.fontColor,
                      fontSize: `${Math.min(subtitleSettings.fontSize * 0.7, 24)}px`, // Scale down for preview
                      textShadow: subtitleSettings.strokeWidth > 0 
                        ? `${subtitleSettings.strokeWidth * 0.7}px ${subtitleSettings.strokeWidth * 0.7}px 0px #000000, -${subtitleSettings.strokeWidth * 0.7}px -${subtitleSettings.strokeWidth * 0.7}px 0px #000000, ${subtitleSettings.strokeWidth * 0.7}px -${subtitleSettings.strokeWidth * 0.7}px 0px #000000, -${subtitleSettings.strokeWidth * 0.7}px ${subtitleSettings.strokeWidth * 0.7}px 0px #000000`
                        : 'none',
                      fontWeight: subtitleSettings.fontWeight,
                      textTransform: subtitleSettings.textTransform as any
                    }}
                  >
                    Sample subtitle text appears here
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Prerequisites Warning */}
          {!hasPrerequisites && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-orange-800">Prerequisites Required</span>
              </div>
              <div className="text-sm text-orange-700 space-y-1">
                {selectedImagesCount === 0 && selectedVideosCount === 0 && <div>• Select images from Image Generator OR videos from Text/Image-to-Video Generator</div>}
                {!audioGeneration?.audioUrl && <div>• Generate audio from scripts</div>}
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={onGenerateVideo}
            disabled={isGeneratingVideo || !hasPrerequisites}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600"
            size="lg"
          >
            {isGeneratingVideo ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Video...
              </>
            ) : !hasPrerequisites ? (
              <>
                <VideoIcon className="h-4 w-4 mr-2" />
                Complete Prerequisites to Generate Video
              </>
            ) : selectedImagesCount === 0 && selectedVideosCount === 0 ? (
              <>
                <VideoIcon className="h-4 w-4 mr-2" />
                Select Images OR Videos First
              </>
            ) : (
              <>
                <VideoIcon className="h-4 w-4 mr-2" />
                Generate Video with {
                  selectedImagesCount > 0 ? 
                    `${selectedImagesCount} Selected Image${selectedImagesCount !== 1 ? 's' : ''}` :
                    `${selectedVideosCount} Selected Video${selectedVideosCount !== 1 ? 's' : ''}`
                } ({
                  settings.videoMode === 'option1' ? 'Loop All with Zoom' :
                  settings.videoMode === 'option2' ? 'Intro + Loop' :
                  settings.useSegmentedTiming ? 'Custom Timing' :
                  'Traditional'
                })
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 