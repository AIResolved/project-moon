'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Eye, Video, CheckCircle, ArrowRight } from 'lucide-react'
import type { GeneratedImageSet } from '@/types/image-generation'

interface VideoSelectionConfirmationProps {
  selectedImagesOrder: string[]
  imageSets: GeneratedImageSet[]
  onConfirmSelection: () => void
  onClearSelection: () => void
  onPreviewSelection: () => void
}

export function VideoSelectionConfirmation({
  selectedImagesOrder,
  imageSets,
  onConfirmSelection,
  onClearSelection,
  onPreviewSelection
}: VideoSelectionConfirmationProps) {
  // Helper function to get image details
  const getImageDetails = (imageId: string) => {
    const [setId, imageIndex] = imageId.split(':')
    const imageSet = imageSets.find(set => set.id === setId)
    if (imageSet && imageSet.imageUrls[parseInt(imageIndex)]) {
      return {
        url: imageSet.imageUrls[parseInt(imageIndex)],
        prompt: imageSet.originalPrompt,
        provider: imageSet.provider
      }
    }
    return null
  }

  if (selectedImagesOrder.length === 0) {
    return null
  }

  return (
    <Card className="border border-green-200 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-800">Images Selected for Video</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {selectedImagesOrder.length} images
          </Badge>
        </div>
        <CardDescription className="text-green-700">
          Your selected images are ready for video generation. Review the order and proceed to the Video Generator.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image preview grid */}
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {selectedImagesOrder.slice(0, 8).map((imageId, index) => {
            const imageDetails = getImageDetails(imageId)
            if (!imageDetails) return null
            
            return (
              <div key={imageId} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border-2 border-green-300 shadow-sm">
                  <img
                    src={imageDetails.url}
                    alt={`Selected image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -top-2 -left-2 bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
              </div>
            )
          })}
          {selectedImagesOrder.length > 8 && (
            <div className="aspect-square rounded-lg border-2 border-dashed border-green-300 flex items-center justify-center bg-green-50">
              <span className="text-green-600 text-sm font-medium">
                +{selectedImagesOrder.length - 8}
              </span>
            </div>
          )}
        </div>

        {/* Summary info */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-green-300 text-green-700">
            Total: {selectedImagesOrder.length} images
          </Badge>
          <Badge variant="outline" className="border-blue-300 text-blue-700">
            Order: Sequential 1-{selectedImagesOrder.length}
          </Badge>
          <Badge variant="outline" className="border-purple-300 text-purple-700">
            Ready for video
          </Badge>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={onConfirmSelection}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Confirm for Video
          </Button>
          
          <Button
            onClick={onPreviewSelection}
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview Order
          </Button>
          
          <Button
            onClick={onClearSelection}
            variant="outline"
            size="sm"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            Clear Selection
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 