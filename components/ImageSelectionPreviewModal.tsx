'use client'

import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../lib/hooks'
import { setConfirmedImageSelection } from '../lib/features/imageGeneration/imageGenerationSlice'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { GeneratedImageSet } from '../types/image-generation'
import { CheckCircle, ArrowUp, ArrowDown, X, ImageIcon } from 'lucide-react'

interface ImageSelectionPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  selectedImagesOrder: string[]
  imageSets: GeneratedImageSet[]
  onUpdateOrder: (newOrder: string[]) => void
}

export function ImageSelectionPreviewModal({
  isOpen,
  onClose,
  selectedImagesOrder,
  imageSets,
  onUpdateOrder
}: ImageSelectionPreviewModalProps) {
  const dispatch = useAppDispatch()
  const { confirmedImageSelection } = useAppSelector(state => state.imageGeneration)

  const moveImageUp = (imageId: string) => {
    const index = selectedImagesOrder.indexOf(imageId)
    if (index > 0) {
      const newOrder = [...selectedImagesOrder]
      ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
      onUpdateOrder(newOrder)
    }
  }

  const moveImageDown = (imageId: string) => {
    const index = selectedImagesOrder.indexOf(imageId)
    if (index >= 0 && index < selectedImagesOrder.length - 1) {
      const newOrder = [...selectedImagesOrder]
      ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
      onUpdateOrder(newOrder)
    }
  }

  const removeImage = (imageId: string) => {
    const newOrder = selectedImagesOrder.filter(id => id !== imageId)
    onUpdateOrder(newOrder)
  }

  const handleConfirmSelection = () => {
    dispatch(setConfirmedImageSelection(selectedImagesOrder))
    onClose()
  }

  const getImageInfo = (imageId: string) => {
    const [setId, imageIndexStr] = imageId.split(':')
    const imageIndex = parseInt(imageIndexStr)
    const imageSet = imageSets.find(set => set.id === setId)
    
    if (!imageSet) return null
    
    const imageUrl = imageSet.imageUrls[imageIndex]
    const imageData = imageSet.imageData[imageIndex]
    
    return {
      url: imageUrl,
      data: imageData,
      prompt: imageSet.originalPrompt,
      provider: imageSet.provider
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Video Generation Preview
          </DialogTitle>
          <DialogDescription>
            Review and reorder your selected images. This is the exact order they will appear in your video.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selection Summary */}
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1">
                {selectedImagesOrder.length} Images Selected
              </Badge>
              {confirmedImageSelection.length > 0 && (
                <Badge variant="outline" className="text-green-700 border-green-300">
                  Previously confirmed: {confirmedImageSelection.length} images
                </Badge>
              )}
            </div>
            <div className="text-sm text-blue-700">
              {selectedImagesOrder.length === 0 ? 'No images selected' : 'Drag to reorder or use arrow buttons'}
            </div>
          </div>

          {/* Image Order Display */}
          {selectedImagesOrder.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Video Sequence Order</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedImagesOrder.map((imageId, orderIndex) => {
                  const imageInfo = getImageInfo(imageId)
                  
                  if (!imageInfo) return null
                  
                  return (
                    <div key={imageId} className="relative bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                      {/* Order Number */}
                      <div className="absolute top-2 left-2 z-10">
                        <div className="bg-blue-600 text-white text-sm font-bold px-2 py-1 rounded">
                          #{orderIndex + 1}
                        </div>
                      </div>

                      {/* Remove Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 z-10 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeImage(imageId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>

                      {/* Image */}
                      <div className="aspect-video mb-3 rounded overflow-hidden bg-gray-100">
                        <img
                          src={imageInfo.url || `data:image/png;base64,${imageInfo.data}`}
                          alt={`Sequence ${orderIndex + 1}`}
                          className="w-full h-full object-cover"
                          onMouseDown={(e) => e.preventDefault()}
                          onDragStart={(e) => e.preventDefault()}
                          onContextMenu={(e) => e.preventDefault()}
                          style={{ userSelect: 'none', pointerEvents: 'none' }}
                        />
                      </div>

                      {/* Image Info */}
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500 truncate">
                          {imageInfo.prompt.substring(0, 60)}...
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {imageInfo.provider}
                        </Badge>
                      </div>

                      {/* Reorder Controls */}
                      <div className="flex justify-center gap-1 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => moveImageUp(imageId)}
                          disabled={orderIndex === 0}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => moveImageDown(imageId)}
                          disabled={orderIndex === selectedImagesOrder.length - 1}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Images Selected</h3>
              <p className="text-gray-500">
                Select images from the image generator to preview your video sequence.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onUpdateOrder([])}
                disabled={selectedImagesOrder.length === 0}
              >
                Clear All
              </Button>
              <Button
                onClick={handleConfirmSelection}
                disabled={selectedImagesOrder.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Selection ({selectedImagesOrder.length} images)
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 