'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { 
  Video, 
  Clock, 
  Trash2, 
  Move,
  Settings,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { StoredVideo, getStoredVideosFromLocalStorage } from '@/utils/video-storage-utils'
import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import { removeVideoFromSelection } from '@/lib/features/video/videoSlice'

export interface VideoWithSettings extends StoredVideo {
  duration: number // Custom duration for video generation
  order: number // Order in the final video
  startTime?: number // Start time in the final video
}

interface SelectedVideosDisplayProps {
  onVideosChange?: (videos: VideoWithSettings[]) => void
}

export function SelectedVideosDisplay({ onVideosChange }: SelectedVideosDisplayProps) {
  const dispatch = useAppDispatch()
  const selectedVideoIds = useAppSelector(state => state.textImageVideo.selectedVideosForGenerator)
  
  const [selectedVideos, setSelectedVideos] = useState<VideoWithSettings[]>([])
  const [allStoredVideos, setAllStoredVideos] = useState<StoredVideo[]>([])

  // Load stored videos and filter selected ones
  useEffect(() => {
    const storedVideos = getStoredVideosFromLocalStorage()
    setAllStoredVideos(storedVideos)

    const videosWithSettings: VideoWithSettings[] = selectedVideoIds
      .map((id, index) => {
        const video = storedVideos.find(v => v.id === id)
        if (video) {
          return {
            ...video,
            duration: video.duration, // Start with original duration
            order: index,
            startTime: 0
          }
        }
        return null
      })
      .filter(Boolean) as VideoWithSettings[]

    setSelectedVideos(videosWithSettings)
    onVideosChange?.(videosWithSettings)
  }, [selectedVideoIds, onVideosChange])

  const updateVideoDuration = (videoId: string, duration: number) => {
    setSelectedVideos(prev => {
      const updated = prev.map(video => 
        video.id === videoId ? { ...video, duration } : video
      )
      onVideosChange?.(updated)
      return updated
    })
  }

  const updateVideoOrder = (videoId: string, newOrder: number) => {
    setSelectedVideos(prev => {
      const video = prev.find(v => v.id === videoId)
      if (!video) return prev

      const updated = prev
        .filter(v => v.id !== videoId)
        .map(v => v.order >= newOrder ? { ...v, order: v.order + 1 } : v)
        .concat({ ...video, order: newOrder })
        .sort((a, b) => a.order - b.order)
        .map((v, index) => ({ ...v, order: index }))

      onVideosChange?.(updated)
      return updated
    })
  }

  const moveVideoUp = (videoId: string) => {
    const video = selectedVideos.find(v => v.id === videoId)
    if (video && video.order > 0) {
      updateVideoOrder(videoId, video.order - 1)
    }
  }

  const moveVideoDown = (videoId: string) => {
    const video = selectedVideos.find(v => v.id === videoId)
    if (video && video.order < selectedVideos.length - 1) {
      updateVideoOrder(videoId, video.order + 1)
    }
  }

  const removeVideo = (videoId: string) => {
    dispatch(removeVideoFromSelection(videoId))
  }

  const calculateTotalDuration = () => {
    return selectedVideos.reduce((total, video) => total + video.duration, 0)
  }

  if (selectedVideos.length === 0) {
    return (
      <Card className="bg-gray-800 border border-gray-600">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Videos Selected</h3>
            <p className="text-gray-300">
              Go to the Text/Image to Video Generator History tab to select videos for your project.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-800 border border-gray-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Video className="h-5 w-5 text-blue-400" />
          Selected Videos for Generation
          <Badge variant="secondary" className="bg-gray-700 text-gray-300">{selectedVideos.length}</Badge>
          <Badge variant="outline" className="ml-2 border-gray-600 text-gray-300">
            Total: {calculateTotalDuration()}s
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedVideos
          .sort((a, b) => a.order - b.order)
          .map((video, index) => (
            <div 
              key={video.id} 
              className="border border-gray-600 rounded-lg p-4 bg-gray-700"
            >
              <div className="flex gap-4">
                {/* Video Preview */}
                <div className="w-32 h-18 bg-gray-600 rounded overflow-hidden flex-shrink-0">
                  {video.supabaseUrl ? (
                    <video 
                      src={video.supabaseUrl} 
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Video Info and Controls */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {video.type === 'text-to-video' ? (
                            <>
                              <Video className="h-3 w-3 mr-1" />
                              Text to Video
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-3 w-3 mr-1" />
                              Image to Video
                            </>
                          )}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Position {index + 1}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-2">
                        {video.prompt}
                      </p>
                    </div>

                    {/* Order Controls */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveVideoUp(video.id)}
                        disabled={index === 0}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveVideoDown(video.id)}
                        disabled={index === selectedVideos.length - 1}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Duration and Controls */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`duration-${video.id}`} className="text-xs text-gray-300">
                        Duration:
                      </Label>
                      <Input
                        id={`duration-${video.id}`}
                        type="number"
                        value={video.duration}
                        onChange={(e) => updateVideoDuration(video.id, parseInt(e.target.value) || 0)}
                        className="w-16 h-6 text-xs bg-gray-600 border-gray-500 text-white"
                        min="1"
                        max="60"
                      />
                      <span className="text-xs text-gray-400">seconds</span>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeVideo(video.id)}
                        className="h-6 text-xs"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

        {/* Summary */}
        <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-medium text-blue-300">{selectedVideos.length}</div>
              <div className="text-blue-400">Videos</div>
            </div>
            <div>
              <div className="font-medium text-blue-300">{calculateTotalDuration()}s</div>
              <div className="text-blue-400">Total Duration</div>
            </div>
            <div>
              <div className="font-medium text-blue-300">
                {Math.round(calculateTotalDuration() / selectedVideos.length)}s
              </div>
              <div className="text-blue-400">Avg Duration</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 