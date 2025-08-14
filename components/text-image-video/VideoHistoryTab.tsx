'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Checkbox } from '../ui/checkbox'
import { 
  Video, 
  Clock, 
  Calendar,
  Download,
  ExternalLink,
  Trash2,
  Image as ImageIcon,
  CheckSquare,
  Square,
  ArrowRight,
  Plus
} from 'lucide-react'
import { GeneratedVideo, VideoGenerationBatch } from '@/types/text-image-video-generation'
import { StoredVideo, getStoredVideosFromLocalStorage, deleteStoredVideo } from '@/utils/video-storage-utils'
import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import { toggleVideoForGenerator, clearSelectedVideosForGenerator } from '@/lib/features/textImageVideo/textImageVideoSlice'

interface VideoHistoryTabProps {
  videoHistory: GeneratedVideo[]
  batches: VideoGenerationBatch[]
}

export function VideoHistoryTab({
  videoHistory,
  batches
}: VideoHistoryTabProps) {
  const dispatch = useAppDispatch()
  const selectedVideosForGeneration = useAppSelector(state => state.textImageVideo.selectedVideosForGenerator)
  
  const [storedVideos, setStoredVideos] = useState<StoredVideo[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  // Load stored videos from localStorage on component mount
  useEffect(() => {
    const loadStoredVideos = () => {
      const videos = getStoredVideosFromLocalStorage()
      setStoredVideos(videos)
    }
    
    loadStoredVideos()
    
    // Refresh every 5 seconds to catch new uploads
    const interval = setInterval(loadStoredVideos, 5000)
    return () => clearInterval(interval)
  }, [])

  const downloadVideo = (videoUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = videoUrl
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const openVideo = (videoUrl: string) => {
    window.open(videoUrl, '_blank')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const handleDeleteStoredVideo = async (videoId: string) => {
    await deleteStoredVideo(videoId)
    setStoredVideos(prev => prev.filter(v => v.id !== videoId))
  }

  const handleVideoSelection = (videoId: string) => {
    dispatch(toggleVideoForGenerator(videoId))
  }

  const handleSelectAll = () => {
    const allVideoIds = storedVideos.map(v => v.id)
    allVideoIds.forEach(id => {
      if (!selectedVideosForGeneration.includes(id)) {
        dispatch(toggleVideoForGenerator(id))
      }
    })
  }

  const handleClearSelection = () => {
    dispatch(clearSelectedVideosForGenerator())
  }

  const applyToVideoGeneration = () => {
    // Videos are already selected in Redux state, just show confirmation
    alert(`✅ ${selectedVideosForGeneration.length} video${selectedVideosForGeneration.length !== 1 ? 's' : ''} applied to Video Generator! You can now find them in the Video Generation section.`)
  }

  if (videoHistory.length === 0 && batches.length === 0 && storedVideos.length === 0) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Video History</h3>
            <p className="text-gray-500">Your generated videos will appear here after completion.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selection Controls */}
      {storedVideos.length > 0 && (
        <Card className="bg-blue-900/20 border-blue-600">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="selection-mode"
                    checked={isSelectionMode}
                    onCheckedChange={(checked) => setIsSelectionMode(checked === 'indeterminate' ? false : checked)}
                  />
                  <label htmlFor="selection-mode" className="text-sm font-medium">
                    Video Selection Mode
                  </label>
                </div>
                
                {isSelectionMode && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearSelection}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Clear Selection
                    </Button>
                  </>
                )}
              </div>

              {selectedVideosForGeneration.length > 0 && (
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {selectedVideosForGeneration.length} selected for video generation
                  </Badge>
                  <Button
                    onClick={applyToVideoGeneration}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Use in Video Generation
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stored Videos (Supabase) */}
      {storedVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-green-600" />
              Stored Videos
              <Badge variant="secondary">{storedVideos.length}</Badge>
              {isSelectionMode && (
                <Badge variant="outline" className="ml-2">
                  Selection Mode
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {storedVideos.map((video) => {
                const isSelected = selectedVideosForGeneration.includes(video.id)
                return (
                  <div 
                    key={video.id} 
                    className={`border rounded-lg p-4 bg-gray-700 hover:bg-gray-600 transition-all relative ${
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-900/20' : 'border-gray-600'
                    }`}
                  >
                    {isSelectionMode && (
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleVideoSelection(video.id)}
                          className="bg-gray-700 border-gray-600"
                        />
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Video Preview */}
                      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        {video.supabaseUrl ? (
                          <video 
                            src={video.supabaseUrl} 
                            className="w-full h-full object-cover"
                            muted
                            onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                            onMouseLeave={(e) => {
                              const videoEl = e.target as HTMLVideoElement
                              videoEl.pause()
                              videoEl.currentTime = 0
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Video Info */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
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
                            {video.duration}s
                          </Badge>
                          <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                            Stored
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                          {video.prompt}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {formatDate(video.uploadedAt)}
                        </div>
                      </div>

                      {/* Actions */}
                      {!isSelectionMode && video.supabaseUrl && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openVideo(video.supabaseUrl)}
                            className="flex-1 text-xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadVideo(video.supabaseUrl, `${video.filename}`)}
                            className="flex-1 text-xs"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteStoredVideo(video.id)}
                            className="text-xs"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Videos */}
      {videoHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-600" />
              Recent Videos
              <Badge variant="secondary">{videoHistory.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {videoHistory.map((video) => (
                <div 
                  key={video.id} 
                  className="border border-gray-600 rounded-lg p-4 bg-gray-700 hover:bg-gray-600 transition-all"
                >
                  <div className="space-y-3">
                    {/* Video Preview */}
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      {video.videoUrl ? (
                        <video 
                          src={video.videoUrl} 
                          className="w-full h-full object-cover"
                          muted
                          onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                          onMouseLeave={(e) => {
                            const videoEl = e.target as HTMLVideoElement
                            videoEl.pause()
                            videoEl.currentTime = 0
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Video Info */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
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
                          {video.duration}s
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                        {video.prompt}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {formatDate(video.generatedAt)}
                      </div>
                    </div>

                    {/* Actions */}
                    {video.videoUrl && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openVideo(video.videoUrl)}
                          className="flex-1 text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadVideo(video.videoUrl, `video-${video.id}.mp4`)}
                          className="flex-1 text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch History */}
      {batches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              Batch History
              <Badge variant="secondary">{batches.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {batches.map((batch) => (
                <div 
                  key={batch.id} 
                  className="border rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">
                          Batch {batch.id.slice(0, 8)}
                        </Badge>
                        <Badge 
                          variant={batch.status === 'completed' ? 'default' : 
                                 batch.status === 'failed' ? 'destructive' : 'secondary'}
                        >
                          {batch.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-300">
                        Started: {formatDate(batch.startedAt)}
                        {batch.completedAt && (
                          <> • Completed: {formatDate(batch.completedAt)}</>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        {batch.completedVideos}/{batch.totalVideos}
                      </div>
                      <div className="text-xs text-gray-500">completed</div>
                    </div>
                  </div>

                  {/* Batch Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center text-sm mb-3">
                    <div>
                      <div className="font-medium text-green-600">{batch.completedVideos}</div>
                      <div className="text-gray-500">Completed</div>
                    </div>
                    <div>
                      <div className="font-medium text-yellow-600">
                        {batch.totalVideos - batch.completedVideos - batch.failedVideos}
                      </div>
                      <div className="text-gray-500">Processing</div>
                    </div>
                    <div>
                      <div className="font-medium text-red-600">{batch.failedVideos}</div>
                      <div className="text-gray-500">Failed</div>
                    </div>
                  </div>

                  {/* Video Grid for Completed Videos */}
                  {batch.videos.filter(v => v.status === 'completed').length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">Completed Videos:</div>
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                        {batch.videos
                          .filter(v => v.status === 'completed' && v.videoUrl)
                          .slice(0, 6)
                          .map((video) => (
                            <div 
                              key={video.id}
                              className="aspect-video bg-gray-200 rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => openVideo(video.videoUrl)}
                            >
                              <video 
                                src={video.videoUrl} 
                                className="w-full h-full object-cover rounded"
                                muted
                              />
                            </div>
                          ))}
                        {batch.videos.filter(v => v.status === 'completed').length > 6 && (
                          <div className="aspect-video bg-gray-600 rounded flex items-center justify-center text-xs text-gray-300">
                            +{batch.videos.filter(v => v.status === 'completed').length - 6} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 