'use client'

import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ImageIcon, RefreshCw } from 'lucide-react'
import type { ExtractedScene, ImageProvider } from '@/types/image-generation'
import { MODEL_INFO, IMAGE_STYLES } from '@/data/image'

interface ImageGenerationControlsProps {
  selectedScenes: number[]
  extractedScenes: ExtractedScene[]
  isGenerating: boolean
  generationInfo: string | null
  selectedModel: ImageProvider
  aspectRatio: string
  selectedImageStyle: string
  onGenerateFromScenes: () => void
}

export function ImageGenerationControls({
  selectedScenes,
  extractedScenes,
  isGenerating,
  generationInfo,
  selectedModel,
  aspectRatio,
  selectedImageStyle,
  onGenerateFromScenes
}: ImageGenerationControlsProps) {
  const currentModel = MODEL_INFO[selectedModel]
  const estimatedBatches = selectedScenes.length > 0 ? Math.ceil(selectedScenes.length / currentModel.batchSize) : 0

  if (extractedScenes.length === 0) {
    return null
  }

  return (
    <div className="space-y-4 bg-gray-900 text-white p-4 rounded-lg">
      <Button 
        className="w-full" 
        onClick={onGenerateFromScenes}
        disabled={isGenerating || selectedScenes.length === 0}
        size="lg"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            {generationInfo || 'Generating...'}
          </>
        ) : (
          <>
            <ImageIcon className="h-5 w-5 mr-2" />
            Generate Images for {selectedScenes.length} Selected Scene{selectedScenes.length !== 1 ? 's' : ''}
            {selectedScenes.length > 0 && (
              <Badge className="ml-2 bg-blue-600">
                {estimatedBatches} batch{estimatedBatches !== 1 ? 'es' : ''}
              </Badge>
            )}
          </>
        )}
      </Button>

      {/* Quick Settings Summary */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{currentModel.name}</Badge>
        <Badge variant="secondary">{aspectRatio} Aspect Ratio</Badge>
        {selectedImageStyle && selectedImageStyle !== 'none' && (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            {IMAGE_STYLES[selectedImageStyle as keyof typeof IMAGE_STYLES]?.name || 'Custom Style'}
          </Badge>
        )}
        <Badge variant="secondary">{selectedScenes.length} Selected Scene{selectedScenes.length !== 1 ? 's' : ''}</Badge>
        <Badge variant="outline" className="text-blue-700 border-blue-300">
          Batch size: {currentModel.batchSize}
        </Badge>
      </div>
    </div>
  )
} 