'use client'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { 
  Video, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Loader2,
  X
} from 'lucide-react'
import { VideoGenerationBatch } from '@/types/text-image-video-generation'

interface VideoGenerationDisplayProps {
  currentBatch: VideoGenerationBatch | null
  isGenerating: boolean
  error: string | null
  generationInfo: string | null
  batchProgress: {
    current: number
    total: number
    currentBatch: number
    totalBatches: number
  }
  onClearError: () => void
}

export function VideoGenerationDisplay({
  currentBatch,
  isGenerating,
  error,
  generationInfo,
  batchProgress,
  onClearError
}: VideoGenerationDisplayProps) {
  const getStatusIcon = (status: 'generating' | 'completed' | 'failed') => {
    switch (status) {
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusColor = (status: 'generating' | 'completed' | 'failed') => {
    switch (status) {
      case 'generating':
        return 'bg-blue-900/20 border-blue-600'
      case 'completed':
        return 'bg-green-900/20 border-green-600'
      case 'failed':
        return 'bg-red-900/20 border-red-600'
    }
  }

  if (!isGenerating && !currentBatch && !error) {
    return (
      <Card className="bg-gray-900 border border-gray-700">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Video className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Generation in Progress</h3>
            <p className="text-gray-300">Start generating videos from the Text to Video or Image to Video tabs.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-900 mb-1">Generation Error</h4>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearError}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Progress */}
      {(isGenerating || currentBatch) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-600" />
              Video Generation Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-gray-600">
                  {batchProgress.current} / {batchProgress.total} videos
                </span>
              </div>
              <Progress 
                value={batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0} 
                className="h-2"
              />
            </div>

            {/* Batch Progress */}
            {batchProgress.totalBatches > 1 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Batch Progress</span>
                  <span className="text-sm text-gray-600">
                    {batchProgress.currentBatch} / {batchProgress.totalBatches} batches
                  </span>
                </div>
                <Progress 
                  value={batchProgress.totalBatches > 0 ? (batchProgress.currentBatch / batchProgress.totalBatches) * 100 : 0} 
                  className="h-2"
                />
              </div>
            )}

            {/* Generation Info */}
            {generationInfo && (
              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-blue-300">{generationInfo}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Batch Videos */}
      {currentBatch && currentBatch.videos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-purple-600" />
              Current Batch Videos
              <Badge variant="secondary">{currentBatch.videos.length} videos</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentBatch.videos.map((video, index) => (
                <div 
                  key={video.id} 
                  className={`border rounded-lg p-4 ${getStatusColor(video.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(video.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {video.type === 'text-to-video' ? 'Text to Video' : 'Image to Video'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {video.duration}s
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                        {video.prompt}
                      </p>
                      {video.status === 'completed' && video.videoUrl && (
                        <div className="mt-2">
                          <video 
                            src={video.videoUrl} 
                            controls 
                            className="w-full max-w-xs h-32 object-cover rounded border"
                          />
                        </div>
                      )}
                      {video.status === 'completed' && video.imageUrl && (
                        <div className="mt-2 text-xs text-gray-500">
                          Source image: <a href={video.imageUrl} target="_blank" rel="noreferrer" className="underline">open</a>
                        </div>
                      )}
                      {video.status === 'failed' && video.error && (
                        <p className="text-red-600 text-xs mt-1">{video.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Summary */}
      {currentBatch && (
        <Card className="bg-blue-900/20 border-blue-600">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{currentBatch.completedVideos}</div>
                <div className="text-sm text-blue-700">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {currentBatch.totalVideos - currentBatch.completedVideos - currentBatch.failedVideos}
                </div>
                <div className="text-sm text-yellow-700">Processing</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{currentBatch.failedVideos}</div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 