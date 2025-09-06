'use client'

import { useState, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../lib/hooks'
import { StaggerContainer, StaggerItem, ScaleOnHover } from './animated-page'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { 
  Image, 
  Video, 
  Zap, 
  GripVertical, 
  Trash2, 
  Play, 
  ArrowUp, 
  ArrowDown,
  Shuffle,
  Eye,
  Download,
  AlertTriangle,
  X,
  RefreshCw
} from 'lucide-react'
import { setSelectedImagesOrder, setMixedContentSequence, clearMixedContentSequence } from '@/lib/features/imageGeneration/imageGenerationSlice'
import { clearSelectedVideosForGenerator, toggleVideoForGenerator } from '@/lib/features/textImageVideo/textImageVideoSlice'

interface ContentItem {
  id: string
  type: 'animation' | 'image' | 'video'
  title: string
  url: string
  thumbnail?: string
  duration?: number
  order: number
  source: string // Which generator it came from
}

export function MixedContentGenerator() {
  const dispatch = useAppDispatch()
  
  // Get content from all generators
  const { imageSets, selectedAnimationImages } = useAppSelector(state => state.imageGeneration)
  const { currentBatch: videoBatch, videoHistory } = useAppSelector(state => state.textImageVideo)
  
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null)
  const [hasCustomOrder, setHasCustomOrder] = useState(false)

  // Save custom order to localStorage
  const saveCustomOrder = (items: ContentItem[]) => {
    try {
      const orderData = {
        items: items.map(item => ({ id: item.id, order: item.order })),
        timestamp: Date.now()
      }
      localStorage.setItem('mixed-content-custom-order', JSON.stringify(orderData))
      setHasCustomOrder(true)
    } catch (error) {
      console.error('Failed to save custom order:', error)
    }
  }

  // Load custom order from localStorage
  const loadCustomOrder = () => {
    try {
      const saved = localStorage.getItem('mixed-content-custom-order')
      if (saved) {
        const orderData = JSON.parse(saved)
        // Only use saved order if it's less than 24 hours old
        if (Date.now() - orderData.timestamp < 24 * 60 * 60 * 1000) {
          return orderData.items
        }
      }
    } catch (error) {
      console.error('Failed to load custom order:', error)
    }
    return null
  }

  // Apply custom order to items
  const applyCustomOrder = (items: ContentItem[], customOrder: { id: string, order: number }[]) => {
    const orderMap = new Map(customOrder.map(item => [item.id, item.order]))
    
    return items
      .map(item => ({
        ...item,
        order: orderMap.has(item.id) ? orderMap.get(item.id)! : item.order
      }))
      .sort((a, b) => a.order - b.order)
  }

  // Collect all content from different sources
  useEffect(() => {
    const items: ContentItem[] = []
    let orderCounter = 0

    // Add animation results (only selected ones from all-animation-results set)
    const animationSet = imageSets.find(set => set.id === 'all-animation-results')
    if (animationSet && selectedAnimationImages.length > 0) {
      animationSet.imageUrls.forEach((imageUrl, index) => {
        const imageId = `animation-${animationSet.id}-${index}`
        
        // Only include images that are selected in the animation gallery
        if (selectedAnimationImages.includes(imageId)) {
          items.push({
            id: imageId,
            type: 'animation',
            title: animationSet.finalPrompts?.[index] || animationSet.originalPrompt || 'Animation',
            url: imageUrl,
            thumbnail: imageUrl,
            order: orderCounter++,
            source: 'Animation Generator'
          })
        }
      })
    }

    // Add regular images (excluding animation results)
    imageSets
      .filter(set => set.id !== 'all-animation-results')
      .forEach(set => {
        set.imageUrls.forEach((imageUrl, index) => {
          items.push({
            id: `image-${set.id}-${index}`,
            type: 'image',
            title: set.finalPrompts?.[index] || set.originalPrompt || `Image from set`,
            url: imageUrl,
            thumbnail: imageUrl,
            order: orderCounter++,
            source: `Image Generator`
          })
        })
      })

    // Add generated videos from current batch and history, avoiding duplicates
    const addedVideoIds = new Set<string>()
    
    // First, add videos from current batch (these are the most recent)
    if (videoBatch) {
      videoBatch.videos.forEach((video) => {
        if (video.videoUrl && !addedVideoIds.has(video.id)) {
          items.push({
            id: `video-${video.id}`,
            type: 'video',
            title: video.prompt || 'Generated Video',
            url: video.videoUrl,
            thumbnail: video.videoUrl,
            duration: video.duration,
            order: orderCounter++,
            source: 'Text/Image to Video Generator'
          })
          addedVideoIds.add(video.id)
          console.log(`➕ Added video from current batch: ${video.id}`)
        } else if (addedVideoIds.has(video.id)) {
          console.log(`⚠️ Skipped duplicate video from current batch: ${video.id}`)
        }
      })
    }

    // Then add video history items, but skip any that are already added
    let historySkipped = 0
    videoHistory.forEach((video, videoIndex) => {
      if (video.videoUrl && !addedVideoIds.has(video.id)) {
        items.push({
          id: `video-${video.id}`, // Use consistent ID format based on video.id
          type: 'video',
          title: video.prompt || 'Historical Video',
          url: video.videoUrl,
          thumbnail: video.videoUrl,
          duration: video.duration,
          order: orderCounter++,
          source: 'Video History'
        })
        addedVideoIds.add(video.id)
        console.log(`➕ Added video from history: ${video.id}`)
      } else if (addedVideoIds.has(video.id)) {
        historySkipped++
      }
    })
    
    if (historySkipped > 0) {
      console.log(`⚠️ Skipped ${historySkipped} duplicate videos from history to avoid duplicates`)
    }

    // Check if we should apply custom order
    const customOrder = loadCustomOrder()
    const finalItems = customOrder ? applyCustomOrder(items, customOrder) : items.sort((a, b) => a.order - b.order)
    
    // Only update if content actually changed (avoid resetting custom order)
    const itemsChanged = 
      contentItems.length !== finalItems.length ||
      finalItems.some(item => !contentItems.find(existing => existing.id === item.id))
    
    if (itemsChanged || !hasCustomOrder) {
      setContentItems(finalItems)
      if (customOrder) {
        setHasCustomOrder(true)
      }
    }
  }, [imageSets, videoBatch, videoHistory, selectedAnimationImages])

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newItems = [...contentItems]
    const [movedItem] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, movedItem)
    
    // Update order numbers
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      order: index
    }))
    
    setContentItems(reorderedItems)
    updateVideoGeneratorOrder(reorderedItems)
    saveCustomOrder(reorderedItems) // Save the custom order
  }

  const updateVideoGeneratorOrder = (items: ContentItem[]) => {
    // Convert ContentItem[] to MixedContentItem[] format for Redux
    const mixedContentSequence = items.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      url: item.url,
      thumbnail: item.thumbnail || item.url, // Fallback to url if thumbnail is undefined
      order: item.order,
      source: item.source,
      duration: item.duration,
      prompt: item.title
    }))
    
    // Save the complete sequence to Redux
    dispatch(setMixedContentSequence(mixedContentSequence))
    
    // Also maintain backwards compatibility with old system
    // Handle images and animations
    const imageOrder = items
      .filter(item => item.type === 'animation' || item.type === 'image')
      .map(item => {
        if (item.type === 'animation') {
          // Extract index from animation ID: "animation-all-animation-results-0" -> "0"
          const idParts = item.id.split('-')
          const imageIndex = idParts[idParts.length - 1]
          return `all-animation-results:${imageIndex}`
        } else {
          // Extract setId and index from image ID: "image-setId-0" -> "setId:0"
          const idParts = item.id.split('-')
          const imageIndex = idParts[idParts.length - 1]
          const setId = idParts.slice(1, -1).join('-') // Handle setIds that might contain dashes
          return `${setId}:${imageIndex}`
        }
      })
    
    // Handle videos - extract video IDs for the video generator
    const videoItems = items.filter(item => item.type === 'video')
    const videoIds = videoItems.map(item => {
      if (item.id.startsWith('video-')) {
        // Extract original video ID: "video-abc123" -> "abc123"
        return item.id.replace('video-', '')
      } else if (item.id.startsWith('history-video-')) {
        // For history videos, we need to get the actual video ID from the videoHistory array
        const historyIndex = parseInt(item.id.replace('history-video-', ''))
        const historyVideo = videoHistory[historyIndex]
        if (historyVideo) {
          return historyVideo.id
        }
      }
      return null
    }).filter(Boolean) as string[]
    
    // Clear and set new video selection
    dispatch(clearSelectedVideosForGenerator())
    videoIds.forEach(videoId => {
      dispatch(toggleVideoForGenerator(videoId))
    })
    
    // Set image order
    dispatch(setSelectedImagesOrder(imageOrder))
    
    console.log('🚀 Mixed content sequence saved to Redux:', mixedContentSequence.length, 'items')
  }

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      handleReorder(index, index - 1)
    }
  }

  const handleMoveDown = (index: number) => {
    if (index < contentItems.length - 1) {
      handleReorder(index, index + 1)
    }
  }

  const handleRemove = (id: string) => {
    const newItems = contentItems
      .filter(item => item.id !== id)
      .map((item, index) => ({ ...item, order: index }))
    
    setContentItems(newItems)
    updateVideoGeneratorOrder(newItems)
    saveCustomOrder(newItems) // Save the custom order
    setRemoveConfirmId(null)
  }

  const handleRemoveType = (type: ContentItem['type']) => {
    const newItems = contentItems
      .filter(item => item.type !== type)
      .map((item, index) => ({ ...item, order: index }))
    
    setContentItems(newItems)
    updateVideoGeneratorOrder(newItems)
    saveCustomOrder(newItems) // Save the custom order
  }

  const handleClearAll = () => {
    setContentItems([])
    dispatch(setSelectedImagesOrder([]))
    dispatch(clearMixedContentSequence())
    // Clear saved custom order
    localStorage.removeItem('mixed-content-custom-order')
    setHasCustomOrder(false)
    console.log('🧹 Cleared all mixed content items')
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', itemId)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (!draggedItem) return
    
    const draggedIndex = contentItems.findIndex(item => item.id === draggedItem)
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedItem(null)
      setDragOverIndex(null)
      return
    }

    handleReorder(draggedIndex, dropIndex)
    setDraggedItem(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverIndex(null)
  }

  const handleShuffle = () => {
    const shuffled = [...contentItems]
      .sort(() => Math.random() - 0.5)
      .map((item, index) => ({ ...item, order: index }))
    
    setContentItems(shuffled)
    updateVideoGeneratorOrder(shuffled)
  }

  const getTypeIcon = (type: ContentItem['type']) => {
    switch (type) {
      case 'animation': return <Zap className="h-4 w-4" />
      case 'image': return <Image className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
    }
  }

  const getTypeBadgeColor = (type: ContentItem['type']) => {
    switch (type) {
      case 'animation': return 'bg-purple-500'
      case 'image': return 'bg-blue-500'
      case 'video': return 'bg-green-500'
    }
  }

  return (
    <StaggerContainer className="flex-1 p-6 space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <StaggerItem>
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-3xl font-bold text-white">Mixed Content Generator</h1>
          <p className="text-gray-300">
            Organize and arrange all your generated content (animations, images, videos) in the perfect sequence for video creation
          </p>
        </motion.div>
      </StaggerItem>

      {/* Controls */}
      <StaggerItem>
        <Card className="bg-gray-800 border-gray-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Shuffle className="h-5 w-5" />
              Content Organization
            </CardTitle>
            <CardDescription className="text-gray-300">
              Drag and drop or use buttons to reorder your content. The order here will be applied to the video generator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Primary Actions */}
              <div className="flex flex-wrap gap-2">
                <ScaleOnHover>
                  <Button 
                    onClick={handleShuffle}
                    variant="outline"
                    className="gap-2"
                    disabled={contentItems.length === 0}
                  >
                    <Shuffle className="h-4 w-4" />
                    Shuffle Order
                  </Button>
                </ScaleOnHover>
                {hasCustomOrder && (
                  <ScaleOnHover>
                    <Button 
                      onClick={() => {
                        localStorage.removeItem('mixed-content-custom-order')
                        setHasCustomOrder(false)
                        // Reset to default order by regenerating content items
                        const items: ContentItem[] = []
                        let orderCounter = 0

                        // Rebuild content items in default order (same as useEffect logic)
                        const animationSet = imageSets.find(set => set.id === 'all-animation-results')
                        if (animationSet && animationSet.imageUrls.length > 0) {
                          animationSet.imageUrls.forEach((imageUrl, index) => {
                            items.push({
                              id: `animation-all-animation-results-${index}`,
                              type: 'animation',
                              title: `Animation ${index + 1}`,
                              url: imageUrl,
                              thumbnail: imageUrl,
                              order: orderCounter++,
                              source: 'Animation Generator'
                            })
                          })
                        }

                        imageSets
                          .filter(set => set.id !== 'all-animation-results')
                          .forEach(set => {
                            set.imageUrls.forEach((imageUrl, index) => {
                              items.push({
                                id: `image-${set.id}-${index}`,
                                type: 'image',
                                title: set.originalPrompt || set.finalPrompts?.[index] || `Image ${index + 1}`,
                                url: imageUrl,
                                thumbnail: imageUrl,
                                order: orderCounter++,
                                source: 'Image Generator'
                              })
                            })
                          })

                        if (videoBatch && videoBatch.videos.length > 0) {
                          videoBatch.videos.forEach((video, index) => {
                            items.push({
                              id: `video-${video.id}`,
                              type: 'video',
                              title: video.prompt || `Video ${index + 1}`,
                              url: video.videoUrl || '',
                              thumbnail: video.videoUrl,
                              order: orderCounter++,
                              source: 'Video Generator'
                            })
                          })
                        }

                        videoHistory.forEach((video, index) => {
                          items.push({
                            id: `history-video-${index}`,
                            type: 'video',
                            title: video.prompt || `History Video ${index + 1}`,
                            url: video.videoUrl || '',
                            thumbnail: video.videoUrl,
                            order: orderCounter++,
                            source: 'Video History'
                          })
                        })

                        // Set the default order
                        setContentItems(items.sort((a, b) => a.order - b.order))
                      }}
                      variant="outline"
                      className="gap-2 text-yellow-400 border-yellow-600 hover:bg-yellow-900/20"
                      disabled={contentItems.length === 0}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reset Order
                    </Button>
                  </ScaleOnHover>
                )}
                <ScaleOnHover>
                  <Button 
                    onClick={() => {
                      updateVideoGeneratorOrder(contentItems)
                      
                      // Show feedback message
                      const imageCount = contentItems.filter(item => item.type === 'animation' || item.type === 'image').length
                      const videoCount = contentItems.filter(item => item.type === 'video').length
                      alert(`✅ Applied ${imageCount} images and ${videoCount} videos to Video Generator!\n\nCheck the Video Generator tab to see the updated sequence.`)
                    }}
                    className="gap-2 glow-button"
                    disabled={contentItems.length === 0}
                  >
                    <Play className="h-4 w-4" />
                    Apply to Video Generator
                  </Button>
                </ScaleOnHover>
              </div>
              
              {/* Bulk Remove Options */}
              {contentItems.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-400 font-medium">Quick Remove:</div>
                  <div className="flex flex-wrap gap-2">
                    {contentItems.some(item => item.type === 'animation') && (
                      <ScaleOnHover>
                        <Button 
                          onClick={() => handleRemoveType('animation')}
                          variant="outline"
                          size="sm"
                          className="gap-1 text-purple-400 border-purple-600 hover:bg-purple-900/20"
                        >
                          <Trash2 className="h-3 w-3" />
                          Animations ({contentItems.filter(item => item.type === 'animation').length})
                        </Button>
                      </ScaleOnHover>
                    )}
                    
                    {contentItems.some(item => item.type === 'image') && (
                      <ScaleOnHover>
                        <Button 
                          onClick={() => handleRemoveType('image')}
                          variant="outline"
                          size="sm"
                          className="gap-1 text-blue-400 border-blue-600 hover:bg-blue-900/20"
                        >
                          <Trash2 className="h-3 w-3" />
                          Images ({contentItems.filter(item => item.type === 'image').length})
                        </Button>
                      </ScaleOnHover>
                    )}
                    
                    {contentItems.some(item => item.type === 'video') && (
                      <ScaleOnHover>
                        <Button 
                          onClick={() => handleRemoveType('video')}
                          variant="outline"
                          size="sm"
                          className="gap-1 text-green-400 border-green-600 hover:bg-green-900/20"
                        >
                          <Trash2 className="h-3 w-3" />
                          Videos ({contentItems.filter(item => item.type === 'video').length})
                        </Button>
                      </ScaleOnHover>
                    )}
                    
                    <ScaleOnHover>
                      <Button 
                        onClick={handleClearAll}
                        variant="outline"
                        size="sm"
                        className="gap-1 text-red-400 border-red-600 hover:bg-red-900/20"
                      >
                        <X className="h-3 w-3" />
                        Clear All
                      </Button>
                    </ScaleOnHover>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </StaggerItem>

      {/* Content Statistics */}
      <StaggerItem>
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-purple-900/20 border-purple-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-400" />
                <div>
                  <div className="text-sm text-purple-300">Animations</div>
                  <div className="text-2xl font-bold text-white">
                    {contentItems.filter(item => item.type === 'animation').length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-900/20 border-blue-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Image className="h-5 w-5 text-blue-400" />
                <div>
                  <div className="text-sm text-blue-300">Images</div>
                  <div className="text-2xl font-bold text-white">
                    {contentItems.filter(item => item.type === 'image').length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-900/20 border-green-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-green-400" />
                <div>
                  <div className="text-sm text-green-300">Videos</div>
                  <div className="text-2xl font-bold text-white">
                    {contentItems.filter(item => item.type === 'video').length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </StaggerItem>

      {/* Content List */}
      <StaggerItem>
        <Card className="bg-gray-800 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white">Content Sequence ({contentItems.length} items)</CardTitle>
            <CardDescription className="text-gray-300">
              Arrange your content in the order you want it to appear in your video
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden">
            {contentItems.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="mb-4">
                  <Image className="h-16 w-16 mx-auto opacity-50" />
                </div>
                <p>No content available yet.</p>
                <p className="text-sm mt-2">Generate some animations, images, or videos first!</p>
              </div>
            ) : (
              <div className="space-y-3 w-full overflow-hidden">
                <div className="max-w-full overflow-x-hidden">
                  <AnimatePresence mode="popLayout">
                  {contentItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      layout="position"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-700 border rounded-lg transition-all duration-200 w-full min-w-0 max-w-full overflow-hidden ${
                        draggedItem === item.id 
                          ? 'border-blue-500 bg-blue-900/20 opacity-50' 
                          : dragOverIndex === index 
                            ? 'border-green-500 bg-green-900/20' 
                            : 'border-gray-600'
                      }`}
                      draggable
                      onDragStart={(e: any) => handleDragStart(e, item.id)}
                      onDragOver={(e: any) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e: any) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      {/* Drag Handle */}
                      <div className="cursor-move text-gray-400 hover:text-gray-200">
                        <GripVertical className="h-5 w-5" />
                      </div>

                      {/* Order Number */}
                      <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-gray-600 rounded-full text-xs sm:text-sm font-bold text-white shrink-0">
                        {index + 1}
                      </div>

                      {/* Thumbnail */}
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gray-600 flex items-center justify-center shrink-0">
                        {item.thumbnail ? (
                          <img 
                            src={item.thumbnail} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getTypeIcon(item.type)
                        )}
                      </div>

                      {/* Content Info */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                          <Badge className={`${getTypeBadgeColor(item.type)} text-white text-xs shrink-0`}>
                            {getTypeIcon(item.type)}
                            <span className="ml-1 capitalize hidden sm:inline">{item.type}</span>
                          </Badge>
                          <span className="text-xs text-gray-400 truncate min-w-0">from {item.source}</span>
                        </div>
                        <h3 className="font-medium text-white truncate text-sm sm:text-base">{item.title}</h3>
                        {item.duration && (
                          <p className="text-xs text-gray-400">{item.duration}s</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                        <ScaleOnHover scale={1.1}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(item.url, '_blank')}
                            className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-gray-400 hover:text-white"
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </ScaleOnHover>
                        
                        <ScaleOnHover scale={1.1}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-gray-400 hover:text-white disabled:opacity-50"
                          >
                            <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </ScaleOnHover>
                        
                        <ScaleOnHover scale={1.1}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === contentItems.length - 1}
                            className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-gray-400 hover:text-white disabled:opacity-50"
                          >
                            <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </ScaleOnHover>
                        
                        <ScaleOnHover scale={1.1}>
                          {removeConfirmId === item.id ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemove(item.id)}
                                className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-red-400 hover:text-red-300"
                                title="Confirm removal"
                              >
                                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setRemoveConfirmId(null)}
                                className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-gray-400 hover:text-gray-300"
                                title="Cancel"
                              >
                                <X className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRemoveConfirmId(item.id)}
                              className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-red-400 hover:text-red-300"
                              title="Remove from sequence"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          )}
                        </ScaleOnHover>
                      </div>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </StaggerItem>
    </StaggerContainer>
  )
}
