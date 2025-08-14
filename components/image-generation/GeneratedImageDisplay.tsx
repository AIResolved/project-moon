'use client'

import { useState } from 'react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
import { Progress } from '../ui/progress'
import {
  ImageIcon,
  Download,
  Trash2,
  RefreshCw,
  Package,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import type { GeneratedImageSet, ImageProvider } from '@/types/image-generation'
import { MODEL_INFO } from '@/data/image'
import { ImageSelectionPreviewModal } from '../ImageSelectionPreviewModal'

interface GeneratedImageDisplayProps {
  imageSets: GeneratedImageSet[]
  isGenerating: boolean
  error: string | null
  generationInfo: string | null
  batchProgress: { current: number; total: number; currentBatch: number; totalBatches: number }
  selectedImagesOrder: string[]
  showImageSelection: boolean
  downloadingZip: string | null
  regeneratingImages: Set<string>
  selectedModel: ImageProvider
  aspectRatio: string
  onToggleImageSelection: (setId: string, imageIndex: number) => void
  onSelectAllImages: () => void
  onUnselectAllImages: () => void
  onMoveImageUp: (imageId: string) => void
  onMoveImageDown: (imageId: string) => void
  onToggleSelectionMode: () => void
  onDownloadAsZip: (imageSet: GeneratedImageSet) => void
  onDownloadAllAsZip: () => void
  onDownloadSelectedAsZip: () => void
  onClearAll: () => void
  onRemoveSet: (setId: string) => void
  onRegenerateImage: (setId: string, imageIndex: number) => void
  onClearError: () => void
  onUpdateImageOrder: (newOrder: string[]) => void
}

export function GeneratedImageDisplay({
  imageSets,
  isGenerating,
  error,
  generationInfo,
  batchProgress,
  selectedImagesOrder,
  showImageSelection,
  downloadingZip,
  regeneratingImages,
  selectedModel,
  aspectRatio,
  onToggleImageSelection,
  onSelectAllImages,
  onUnselectAllImages,
  onMoveImageUp,
  onMoveImageDown,
  onToggleSelectionMode,
  onDownloadAsZip,
  onDownloadAllAsZip,
  onDownloadSelectedAsZip,
  onClearAll,
  onRemoveSet,
  onRegenerateImage,
  onClearError,
  onUpdateImageOrder
}: GeneratedImageDisplayProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  // Helper functions
  const getImageId = (setId: string, imageIndex: number) => `${setId}:${imageIndex}`
  
  const getImageOrderNumber = (setId: string, imageIndex: number) => {
    const imageId = getImageId(setId, imageIndex)
    const orderIndex = selectedImagesOrder.indexOf(imageId)
    return orderIndex >= 0 ? orderIndex + 1 : null
  }

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const currentModel = MODEL_INFO[selectedModel]

  // Error Display
  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="font-semibold text-red-800">Generation Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClearError}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Loading State
  if (isGenerating && imageSets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <ImageIcon className="h-8 w-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">
                {generationInfo || 'Generating images...'}
              </h3>
              <p className="text-gray-500">
                Choose your AI model, extract scenes from your script, and generate images for selected scenes
              </p>
              {batchProgress.total > 0 && (
                <p className="text-sm text-muted-foreground">
                  Processing batch {batchProgress.currentBatch} of {batchProgress.totalBatches}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty State
  if (imageSets.length === 0 && !isGenerating) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <ImageIcon className="h-12 w-12 mx-auto text-gray-400" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">No images generated yet</h3>
              <p className="text-gray-500">
                Choose your AI model, extract scenes from your script, and generate images for selected scenes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Generated Images Display
  return (
    <div className="space-y-4 bg-gray-900 text-white p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Generated Images ({imageSets.length} sets)</h2>
        <div className="flex items-center gap-2">
          {/* Selection Controls */}
          <Button 
            variant={showImageSelection ? "default" : "outline"}
            size="sm" 
            onClick={onToggleSelectionMode}
          >
            {showImageSelection ? (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                Exit Selection ({selectedImagesOrder.length})
              </>
            ) : (
              <>
                <Square className="h-4 w-4 mr-2" />
                Select for Video
              </>
            )}
          </Button>
          
          {showImageSelection && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onSelectAllImages}
                disabled={selectedImagesOrder.length === imageSets.reduce((total, set) => total + set.imageUrls.length, 0)}
              >
                Select All ({imageSets.reduce((total, set) => total + set.imageUrls.length, 0)})
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onUnselectAllImages}
                disabled={selectedImagesOrder.length === 0}
              >
                Unselect All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPreviewModal(true)}
                disabled={selectedImagesOrder.length === 0}
                className="bg-blue-900/20 border-blue-600 text-blue-300 hover:bg-blue-900/30"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Order ({selectedImagesOrder.length})
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={onDownloadSelectedAsZip}
                disabled={selectedImagesOrder.length === 0 || downloadingZip === 'selected'}
                className="bg-green-600 hover:bg-green-700"
              >
                {downloadingZip === 'selected' ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating ZIP...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Download Selected ({selectedImagesOrder.length})
                  </>
                )}
              </Button>
            </>
          )}
          
          {imageSets.length > 1 && !showImageSelection && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDownloadAllAsZip}
              disabled={downloadingZip === 'all'}
            >
              {downloadingZip === 'all' ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating ZIP...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Download All ({imageSets.reduce((total, set) => total + set.imageUrls.length, 0)})
                </>
              )}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClearAll}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Batch Progress */}
      {isGenerating && batchProgress.total > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress: {batchProgress.current}/{batchProgress.total} images</span>
            <span>Batch: {batchProgress.currentBatch}/{batchProgress.totalBatches}</span>
          </div>
          <Progress value={(batchProgress.current / batchProgress.total) * 100} className="w-full" />
        </div>
      )}

      {/* Selection Order Display */}
      {showImageSelection && selectedImagesOrder.length > 0 && (
        <Card className="bg-blue-900/20 border-blue-600">
          <CardHeader>
            <CardTitle className="text-lg text-white">Video Generation Order ({selectedImagesOrder.length} images)</CardTitle>
            <CardDescription className="text-gray-300">
              Images will appear in this order in your video. Use the preview button to review and reorder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedImagesOrder.slice(0, 10).map((imageId, orderIndex) => {
                const [setId, imageIndexStr] = imageId.split(':')
                const imageIndex = parseInt(imageIndexStr)
                const imageSet = imageSets.find(set => set.id === setId)
                const imageUrl = imageSet?.imageUrls[imageIndex]
                
                if (!imageUrl) return null
                
                return (
                  <div key={imageId} className="flex items-center gap-1 bg-gray-700 rounded-lg border border-gray-600 p-2">
                    <div className="w-12 h-12 rounded overflow-hidden">
                      <img 
                        src={imageUrl} 
                        alt={`Order ${orderIndex + 1}`} 
                        className="w-full h-full object-cover"
                        onMouseDown={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                      />
                    </div>
                    <div className="text-sm font-medium text-white">#{orderIndex + 1}</div>
                  </div>
                )
              })}
              {selectedImagesOrder.length > 10 && (
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg border text-sm font-medium text-gray-500">
                  +{selectedImagesOrder.length - 10}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Sets Display */}
      {imageSets.map((imageSet: GeneratedImageSet, setIndex: number) => (
        <Card key={imageSet.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">"{imageSet.originalPrompt}"</CardTitle>
                <CardDescription>
                  Generated {new Date(imageSet.generatedAt).toLocaleString()} • 
                  {imageSet.imageUrls.length} image{imageSet.imageUrls.length > 1 ? 's' : ''} • 
                  {MODEL_INFO[imageSet.provider as keyof typeof MODEL_INFO]?.name || imageSet.provider} • 
                  {imageSet.aspectRatio}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {!showImageSelection && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onDownloadAsZip(imageSet)}
                    disabled={downloadingZip === imageSet.id}
                  >
                    {downloadingZip === imageSet.id ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating ZIP...
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4 mr-2" />
                        Download ZIP ({imageSet.imageUrls.length})
                      </>
                    )}
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onRemoveSet(imageSet.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {imageSet.imageUrls.map((url: string, imageIndex: number) => {
                const imageId = getImageId(imageSet.id, imageIndex)
                const isSelected = selectedImagesOrder.includes(imageId)
                const orderNumber = getImageOrderNumber(imageSet.id, imageIndex)
                const isRegenerating = regeneratingImages.has(imageId)
                
                return (
                  <div key={imageIndex} className="relative group">
                    {/* Selection checkbox */}
                    {showImageSelection && (
                      <div className="absolute top-2 left-2 z-10">
                        <div className="flex items-center gap-1">
                          <Checkbox 
                            id={`image-${imageSet.id}-${imageIndex}`}
                            checked={isSelected}
                            onCheckedChange={() => onToggleImageSelection(imageSet.id, imageIndex)}
                            className="bg-gray-700 border-2"
                          />
                          {orderNumber && (
                            <div className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                              #{orderNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div 
                      className={`aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 transition-colors ${
                        showImageSelection && isSelected
                          ? 'border-blue-500 bg-blue-900/20' 
                          : showImageSelection 
                          ? 'border-gray-300 hover:border-blue-300' 
                          : 'border-transparent hover:border-blue-300 cursor-pointer'
                      }`}
                      onClick={showImageSelection 
                        ? () => onToggleImageSelection(imageSet.id, imageIndex) 
                        : () => window.open(url, '_blank', 'noopener,noreferrer')
                      }
                      style={{ cursor: 'pointer' }}
                      title={showImageSelection ? 'Click to select/deselect' : 'Click to open in new window'}
                    >
                      <img 
                        src={url} 
                        alt={`Image ${imageIndex + 1} of ${imageSet.imageUrls.length}: ${imageSet.originalPrompt}`}
                        className="w-full h-full object-cover"
                        onMouseDown={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                      />
                      
                      {/* Regenerating overlay */}
                      {isRegenerating && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <div className="text-white text-center">
                            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                            <div className="text-sm">Regenerating...</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Action buttons overlay */}
                      {!showImageSelection && !isRegenerating && (
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation()
                              downloadImage(url, `${setIndex + 1}_${imageIndex + 1}_${imageSet.provider}_${imageSet.aspectRatio}.png`)
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation()
                              onRegenerateImage(imageSet.id, imageIndex)
                            }}
                            disabled={isRegenerating}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(url, '_blank', 'noopener,noreferrer')
                            }}
                            title="Open in new window"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Image number badge */}
                    <div className={`absolute top-2 ${showImageSelection ? 'right-2' : 'left-2'} bg-black/80 text-white text-sm font-bold px-2 py-1 rounded-md`}>
                      #{(imageIndex + 1).toString().padStart(2, '0')}
                    </div>
                    
                    {/* Image info badge */}
                    <div className={`absolute ${showImageSelection ? 'bottom-2 right-2' : 'top-2 right-2'} bg-gray-800/90 text-white text-xs px-2 py-1 rounded-md`}>
                      {imageIndex + 1}/{imageSet.imageUrls.length}
                    </div>
                    
                    {/* Selection indicator overlay */}
                    {showImageSelection && isSelected && (
                      <div className="absolute inset-0 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                          #{orderNumber}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Image Set Summary */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="font-medium">Set #{setIndex + 1}</span>
                  <span className="text-muted-foreground">{imageSet.imageUrls.length} images</span>
                  <span className="text-muted-foreground">{imageSet.aspectRatio} aspect ratio</span>
                  {showImageSelection && (
                    <span className="text-blue-600 font-medium">
                      {imageSet.imageUrls.filter((_, idx) => selectedImagesOrder.includes(getImageId(imageSet.id, idx))).length} selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{MODEL_INFO[imageSet.provider as keyof typeof MODEL_INFO]?.name || imageSet.provider}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(imageSet.generatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Preview Modal */}
      <ImageSelectionPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        selectedImagesOrder={selectedImagesOrder}
        imageSets={imageSets}
        onUpdateOrder={onUpdateImageOrder}
      />
    </div>
  )
}