'use client'

import { useState, useEffect } from 'react'
import { useAppSelector } from '../../lib/hooks'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Textarea } from '../ui/textarea'
import { Separator } from '../ui/separator'
import { ProviderModelSelector } from './ProviderModelSelector'
import { VIDEO_PROVIDERS } from '../../types/text-image-video-generation'
import { 
  Plus, 
  Trash2, 
  Video, 
  Clock,
  Zap,
  RefreshCw,
  X,
  Grid,
  CheckSquare,
  Square
} from 'lucide-react'

interface TextToVideoTabProps {
  defaultDuration: 5 | 10
  isGenerating: boolean
  onGenerate: (prompts: string[], duration: 5 | 10) => Promise<void>
  onDurationChange: (duration: 5 | 10) => void
}

export function TextToVideoTab({
  defaultDuration,
  isGenerating,
  onGenerate,
  onDurationChange
}: TextToVideoTabProps) {
  // Get Redux state
  const { selectedProvider, selectedModel } = useAppSelector(state => state.textImageVideo)
  
  // Local state (only for manual prompts)
  const [prompts, setPrompts] = useState<string[]>([''])
  const [duration, setDuration] = useState<5 | 10>(defaultDuration)
  const [bulkPrompts, setBulkPrompts] = useState('')
  const [showBulkInput, setShowBulkInput] = useState(false)
  
  // Update duration when defaultDuration changes
  useEffect(() => {
    setDuration(defaultDuration)
  }, [defaultDuration])

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

  const handleBulkPromptsSubmit = () => {
    if (bulkPrompts.trim()) {
      const newPrompts = bulkPrompts
        .split('\n')
        .map(prompt => prompt.trim())
        .filter(prompt => prompt.length > 0)
      
      if (newPrompts.length > 0) {
        setPrompts(newPrompts)
        setBulkPrompts('')
        setShowBulkInput(false)
      }
    }
  }

  const handleGenerate = async () => {
    const validPrompts = prompts.filter(p => p.trim().length > 0)
    if (validPrompts.length === 0) return

    onDurationChange(duration)
    await onGenerate(validPrompts, duration)
  }

  const getProviderConfig = () => {
    return VIDEO_PROVIDERS[selectedProvider]
  }

  const getModelConfig = () => {
    const providerConfig = getProviderConfig()
    if (!providerConfig?.textToVideoModels) return null
    return providerConfig.textToVideoModels[selectedModel as keyof typeof providerConfig.textToVideoModels] as any
  }

  const modelConfig = getModelConfig()
  const supportedDurations = modelConfig?.supportedDurations || [5, 10]

  return (
    <div className="space-y-6">
      {/* Provider & Model Selection */}
      <ProviderModelSelector mode="text-to-video" />

      {/* Text Prompts Section */}
      <Card className="bg-gray-900 border-gray-700 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-400" />
              <CardTitle>Video Prompts</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkInput(!showBulkInput)}
                className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
              >
                <Grid className="h-4 w-4 mr-1" />
                {showBulkInput ? 'Single Mode' : 'Bulk Mode'}
              </Button>
            </div>
          </div>
          <CardDescription className="text-gray-300">
            Enter descriptive prompts for video generation. Be specific about scenes, actions, and visual details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showBulkInput ? (
            // Bulk input mode
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Bulk Prompts (one per line)</Label>
                <Textarea
                  placeholder="Enter multiple prompts, one per line&#10;Example:&#10;A serene sunset over ocean waves&#10;A bustling city street at night&#10;A peaceful forest with morning light"
                  value={bulkPrompts}
                  onChange={(e) => setBulkPrompts(e.target.value)}
                  rows={8}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleBulkPromptsSubmit}>
                  Apply Prompts
                </Button>
                <Button variant="outline" onClick={() => setBulkPrompts('')}>
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            // Individual prompt inputs
            <div className="space-y-4">
              {prompts.map((prompt, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <Label className="text-sm text-gray-300">Prompt {index + 1}</Label>
                    <Textarea
                      placeholder="Describe the video you want to generate in detail..."
                      value={prompt}
                      onChange={(e) => updatePrompt(index, e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white min-h-[80px]"
                      rows={3}
                    />
                  </div>
                  <div className="flex flex-col gap-1 mt-6">
                    {prompts.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removePrompt(index)}
                        className="text-red-400 border-red-400 hover:bg-red-400/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={addPrompt}
                  className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Prompt
                </Button>
              </div>
            </div>
          )}

          <Separator className="bg-gray-600" />

          {/* Duration Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <Label>Video Duration</Label>
              <Badge variant="outline" className="text-xs">
                {modelConfig?.name || selectedModel}
              </Badge>
            </div>
            
            <div className="flex gap-2">
              {supportedDurations.map((dur: number) => (
                <Button
                  key={dur}
                  variant={duration === dur ? 'default' : 'outline'}
                  onClick={() => {
                    setDuration(dur as 5 | 10)
                    onDurationChange(dur as 5 | 10)
                  }}
                  disabled={isGenerating}
                  className="flex-1 h-12"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {dur}s
                </Button>
              ))}
            </div>
          </div>

          <Separator className="bg-gray-600" />

          {/* Generation Controls */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || prompts.every(p => p.trim().length === 0)}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating Videos...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Videos ({prompts.filter(p => p.trim().length > 0).length})
                </>
              )}
            </Button>
            
            {prompts.filter(p => p.trim().length > 0).length > 0 && (
              <div className="text-center">
                <Badge variant="outline" className="text-xs">
                  {prompts.filter(p => p.trim().length > 0).length} prompt(s) × {duration}s duration
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
