'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'
import { Label } from '../ui/label'
import { Separator } from '../ui/separator'
import { 
  VIDEO_PROVIDERS,
  VideoProvider,
  TextToVideoModel,
  ImageToVideoModel
} from '../../types/text-image-video-generation'
import { useAppSelector, useAppDispatch } from '../../lib/hooks'
import { setProvider, setModel } from '../../lib/features/textImageVideo/textImageVideoSlice'
import { Zap, Clock, Layers, RatioIcon } from 'lucide-react'

interface ProviderModelSelectorProps {
  mode: 'text-to-video' | 'image-to-video'
  className?: string
}

export function ProviderModelSelector({ mode, className }: ProviderModelSelectorProps) {
  const dispatch = useAppDispatch()
  const selectedProvider = useAppSelector(state => state.textImageVideo.selectedProvider)
  const selectedModel = useAppSelector(state => state.textImageVideo.selectedModel)

  const handleProviderChange = (provider: VideoProvider) => {
    dispatch(setProvider(provider))
  }

  const handleModelChange = (model: string) => {
    dispatch(setModel(model))
  }

  const getAvailableModels = (provider: VideoProvider) => {
    const providerConfig = VIDEO_PROVIDERS[provider]
    return mode === 'text-to-video' 
      ? providerConfig.textToVideoModels 
      : providerConfig.imageToVideoModels
  }

  const getCurrentModelInfo = () => {
    const models = getAvailableModels(selectedProvider)
    return models[selectedModel as keyof typeof models] as any
  }

  const availableModels = getAvailableModels(selectedProvider)
  const currentModelInfo = getCurrentModelInfo()

  return (
    <Card className={`bg-gray-800 border-gray-600 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Layers className="h-5 w-5" />
          Provider & Model Selection
        </CardTitle>
        <CardDescription className="text-gray-300">
          Choose your video generation provider and model for {mode.replace('-', '-to-')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="provider-select" className="text-gray-300">Provider</Label>
          <Select 
            value={selectedProvider} 
            onValueChange={handleProviderChange}
          >
            <SelectTrigger id="provider-select">
              <SelectValue placeholder="Select a provider" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VIDEO_PROVIDERS).map(([key, provider]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                      <span className="font-medium">{provider.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {provider.description}
                      </span>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Badge variant="outline" className="text-xs">
                        {provider.rateLimitPerMinute}/min
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Batch: {provider.batchSize}
                      </Badge>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Model Selection */}
        <div className="space-y-2">
          <Label htmlFor="model-select" className="text-gray-300">Model</Label>
          <Select 
            value={selectedModel} 
            onValueChange={handleModelChange}
          >
            <SelectTrigger id="model-select">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(availableModels).map(([key, model]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex flex-col">
                    <span className="font-medium">{(model as any).name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(model as any).description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model Information */}
        {currentModelInfo && (
          <div className="mt-4 p-3 bg-gray-700 rounded-lg space-y-3">
            <div className="text-sm font-medium text-gray-300">
              Model Details
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400">Duration:</span>
                <Badge variant="secondary" className="text-xs">
                  {currentModelInfo.supportedDurations?.join('s, ')}s
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400">Max:</span>
                <Badge variant="secondary" className="text-xs">
                  {currentModelInfo.maxDuration}s
                </Badge>
              </div>
            </div>

            {/* Additional model-specific info */}
            {currentModelInfo.supportedAspectRatios && (
              <div className="flex items-center gap-2 text-sm">
                <RatioIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400">Aspect Ratios:</span>
                <div className="flex gap-1">
                  {currentModelInfo.supportedAspectRatios.map((ratio: string) => (
                    <Badge key={ratio} variant="outline" className="text-xs">
                      {ratio}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {currentModelInfo.supportedFps && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">FPS:</span>
                <div className="flex gap-1">
                  {currentModelInfo.supportedFps.map((fps: number) => (
                    <Badge key={fps} variant="outline" className="text-xs">
                      {fps}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Provider-specific notes */}
        <div className="text-xs text-gray-400">
          {selectedProvider === 'replicate' && (
            <p>💡 Replicate: Stable performance, good for batch processing</p>
          )}
          {selectedProvider === 'fal' && (
            <p>💡 FAL AI: Advanced models with more customization options</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}