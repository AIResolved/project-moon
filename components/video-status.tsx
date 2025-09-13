'use client'

import { useState, useEffect, useRef } from 'react'
import { useAppSelector, useAppDispatch } from '../lib/hooks'
import { 
  loadVideoHistory,
  updateVideoStatus,
  clearCurrentGeneration,
  removeVideoFromHistory
} from '../lib/features/video/videoSlice'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { VideoIcon, Download, PlayCircle, CheckCircle, AlertCircle, Loader2, Clock, Eye, Trash2, RefreshCw, Calendar, Upload, UploadCloud } from 'lucide-react'
import { VideoRecord } from '@/types/video-generation'
import { GoogleLogo } from './google-logo'
import { YouTubeLogo } from './youtube-logo'

export function VideoStatus() {
  const dispatch = useAppDispatch()
  
  // Use Redux state for user instead of NextAuth session
  const { id: userId, email: userEmail, isLoggedIn } = useAppSelector(state => state.user)
  
  const { 
    currentGeneration, 
    generationHistory,
    isGeneratingVideo
  } = useAppSelector(state => state.video)
  
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [uploadingVideos, setUploadingVideos] = useState<Set<string>>(new Set())
  const [uploadingToYouTube, setUploadingToYouTube] = useState<Set<string>>(new Set())
  const [deletingVideos, setDeletingVideos] = useState<Set<string>>(new Set())
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  const [hasGoogleTokens, setHasGoogleTokens] = useState<boolean | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(""), 3000)
  }

  // Check if user has Google OAuth tokens
  const checkGoogleTokens = async () => {
    try {
      const response = await fetch('/api/check-google-auth')
      const data = await response.json()
      setHasGoogleTokens(data.hasTokens)
      console.log('🔍 Google tokens check:', data.hasTokens ? 'Available' : 'Not available')
    } catch (error) {
      console.error('Error checking Google tokens:', error)
      setHasGoogleTokens(false)
    }
  }

  // Check Google tokens when component mounts
  useEffect(() => {
    checkGoogleTokens()
  }, [])

  // Handle upload to YouTube
  const handleUploadToYouTube = async (video: VideoRecord) => {
    console.log('🎬 YouTube upload button clicked for video:', video.id)
    console.log('📊 User logged in:', isLoggedIn)
    console.log('📊 Has Google tokens:', hasGoogleTokens)
    
    if (!isLoggedIn || !hasGoogleTokens) {
      console.log('❌ Authentication check failed: Supabase:', isLoggedIn, 'Google:', hasGoogleTokens)
      showMessage('Please sign in with Google first', 'error')
      return
    }

    if (!video.final_video_url) {
      console.log('❌ No video URL available:', video.final_video_url)
      showMessage('Video URL not available', 'error')
      return
    }

    console.log('✅ Starting YouTube upload process for video:', video.id)
    console.log('🎬 Video URL:', video.final_video_url)
    
    setUploadingToYouTube(prev => {
      const newSet = new Set(prev).add(video.id)
      console.log('📝 Updated uploading to YouTube set:', newSet)
      return newSet
    })

    try {
      showMessage(`Preparing video for YouTube upload...`, 'info')
      
      // Download video file
      const videoResponse = await fetch(video.final_video_url)
      
      if (!videoResponse.ok) {
        throw new Error('Failed to download video file for upload.')
      }
      
      const videoBlob = await videoResponse.blob()
      const videoFile = new File([videoBlob], `video-${video.id}.mp4`, {
        type: videoBlob.type || 'video/mp4',
      })

      console.log('📁 Video file prepared for YouTube:', {
        name: videoFile.name,
        size: (videoFile.size / 1024 / 1024).toFixed(2) + ' MB',
        type: videoFile.type
      })

      // Prepare form data
      const formData = new FormData()
      formData.append('file', videoFile)
      formData.append('title', `AI Generated Video - ${video.id.slice(0, 8)}`)
      formData.append('description', `Video created with AI Content Generation Platform\n\nVideo ID: ${video.id}\nCreated: ${new Date(video.created_at).toLocaleDateString()}`)
      formData.append('tags', 'ai,video,generated,content,artificial intelligence')
      formData.append('privacy', 'private') // Default to private for safety

      showMessage(`Uploading to YouTube...`, 'info')

      // Upload to YouTube
      const response = await fetch('/api/upload-to-youtube', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Upload failed: ${response.status}`)
      }

      const result = await response.json()
      
      console.log('✅ YouTube upload completed successfully:', result)
      showMessage(`Successfully uploaded to YouTube! Video ID: ${result.videoId}`, 'success')
      
      // Show YouTube link
      if (result.url) {
        setTimeout(() => {
          showMessage(`Video available at: ${result.url}`, 'info')
        }, 3000)
      }
      
    } catch (error: any) {
      console.error('💥 YouTube upload error:', error)
      showMessage(`Failed to upload to YouTube: ${error.message}`, 'error')
    } finally {
      console.log('🏁 YouTube upload process finished, cleaning up...')
      setUploadingToYouTube(prev => {
        const newSet = new Set(prev)
        newSet.delete(video.id)
        return newSet
      })
    }
  }

  // Handle upload to Google Drive with progress tracking
  const handleUploadToGoogleDrive = async (video: VideoRecord) => {
    console.log('🚀 Upload button clicked for video:', video.id)
    console.log('📊 User logged in:', isLoggedIn)
    console.log('📊 Has Google tokens:', hasGoogleTokens)
    
    if (!isLoggedIn || !hasGoogleTokens) {
      console.log('❌ Authentication check failed: Supabase:', isLoggedIn, 'Google:', hasGoogleTokens)
      showMessage('Please sign in with Google first', 'error')
      return
    }

    if (!video.final_video_url) {
      console.log('❌ No video URL available:', video.final_video_url)
      showMessage('Video URL not available', 'error')
      return
    }

    console.log('✅ Starting upload process for video:', video.id)
    console.log('🎬 Video URL:', video.final_video_url)
    
    setUploadingVideos(prev => {
      const newSet = new Set(prev).add(video.id)
      console.log('📝 Updated uploading videos set:', newSet)
      return newSet
    })
    
    setUploadProgress(prev => {
      const newProgress = { ...prev, [video.id]: 0 }
      console.log('📊 Initialized progress:', newProgress)
      return newProgress
    })

    try {
      showMessage(`Downloading video for upload...`, 'info')
      
      // Download video file
      const videoResponse = await fetch(video.final_video_url)
      
      if (!videoResponse.ok) {
        throw new Error('Failed to download video file for upload.')
      }
      
      const videoBlob = await videoResponse.blob()
      const videoFile = new File([videoBlob], video.final_video_url.split('/').pop() || `video-${video.id}.mp4`, {
        type: videoBlob.type || 'video/mp4',
      })

      console.log('📁 Video file created:', {
        name: videoFile.name,
        size: (videoFile.size / 1024 / 1024).toFixed(2) + ' MB',
        type: videoFile.type
      })

      // Prepare form data for streaming upload
      const formData = new FormData()
      formData.append('file', videoFile)
      formData.append('parentId', 'root')

      showMessage(`Starting streaming upload to Google Drive...`, 'info')

      // Use the streaming upload endpoint with Server-Sent Events
      const response = await fetch('/api/upload-to-gdrive-stream', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Failed to start streaming upload: ${response.status}`)
      }

      // Handle Server-Sent Events for progress updates
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response stream available')
      }

      let buffer = ''
      let uploadCompleted = false

      while (!uploadCompleted) {
        const { done, value } = await reader.read()
        
        if (done) {
          console.log('🏁 Stream ended')
          break
        }

        buffer += decoder.decode(value, { stream: true })
        
        // Process complete messages
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              console.log('📊 Progress update:', data)

              if (data.error) {
                throw new Error(data.error)
              }

              if (data.progress !== undefined) {
                setUploadProgress(prev => ({
                  ...prev,
                  [video.id]: data.progress
                }))
              }

              if (data.message) {
                showMessage(data.message, 'info')
              }

              if (data.success) {
                console.log('✅ Upload completed successfully:', data)
                showMessage(`Successfully uploaded ${data.fileName} to Google Drive!`, 'success')
                uploadCompleted = true
                
                // Clear progress after success
                setTimeout(() => {
                  setUploadProgress(prev => {
                    const newProgress = { ...prev }
                    delete newProgress[video.id]
                    return newProgress
                  })
                }, 3000)
                break
              }

            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError)
            }
          }
        }
      }

      reader.releaseLock()
      
    } catch (error: any) {
      console.error('💥 Upload error caught:', error)
      showMessage(`Failed to upload: ${error.message}`, 'error')
      
      // Clear progress on error
      setUploadProgress(prev => {
        const newProgress = { ...prev }
        delete newProgress[video.id]
        return newProgress
      })
    } finally {
      console.log('🏁 Upload process finished, cleaning up...')
      setUploadingVideos(prev => {
        const newSet = new Set(prev)
        newSet.delete(video.id)
        return newSet
      })
    }
  }

  // Fetch videos from database
  const fetchVideos = async (isInitial = false) => {
    if (isInitial) {
      setIsInitialLoading(true)
    } else {
      setIsRefreshing(true)
    }
    
    try {
      console.log('🔄 Fetching videos from database...')
      
      // Use authenticated user ID from Redux or fallback to current_user
      const userIdToUse = userId || 'current_user'
      const response = await fetch(`/api/get-videos?userId=${userIdToUse}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.videos) {
        dispatch(loadVideoHistory(data.videos))
        if (!isInitial) {
          showMessage(`Loaded ${data.count} videos from database`, 'success')
        }
        console.log(`✅ Loaded ${data.count} videos successfully`)
      } else {
        throw new Error('No videos data in response')
      }

    } catch (error: any) {
      console.error('Error fetching videos:', error)
      showMessage(`Failed to fetch videos: ${error.message}`, 'error')
    } finally {
      if (isInitial) {
        setIsInitialLoading(false)
      } else {
        setIsRefreshing(false)
      }
    }
  }

  // Fetch videos on component mount
  useEffect(() => {
    fetchVideos(true)
  }, [])

  // Check status of processing videos via Shotstack API
  const checkProcessingVideos = async () => {
    const processingVideos = allVideos.filter(v => v.status === 'processing')
    
    if (processingVideos.length === 0) return
    
    setIsCheckingStatus(true)
    console.log(`🔍 Checking status of ${processingVideos.length} processing videos via Shotstack API`)
    
    try {
      // Check each processing video
      for (const video of processingVideos) {
        try {
          console.log(`🔍 Checking video ${video.id}...`)
          const response = await fetch('/api/check-video-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: video.id })
          })

          if (!response.ok) {
            console.error(`Failed to check status for video ${video.id}:`, response.status)
            continue
          }

          const data = await response.json()
          
          if (data.statusChanged) {
            console.log(`📊 Status changed for video ${video.id}: ${video.status} → ${data.video.status}`)
            
            // Update Redux state with the new video data
            dispatch(updateVideoStatus({
              videoId: video.id,
              status: data.video.status,
              videoUrl: data.video.final_video_url,
              errorMessage: data.video.error_message
            }))
            
            // Show user notification for completed videos
            if (data.video.status === 'completed') {
              showMessage(`Video ${video.id.slice(0, 8)} completed successfully!`, 'success')
            } else if (data.video.status === 'failed') {
              showMessage(`Video ${video.id.slice(0, 8)} failed to render`, 'error')
            }
          } else {
            console.log(`🔄 Video ${video.id} still processing (Shotstack: ${data.shotstackStatus})`)
          }
          
        } catch (error: any) {
          console.error(`Error checking status for video ${video.id}:`, error)
        }
      }
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const allVideos = [
    ...(currentGeneration ? [{ ...currentGeneration, isCurrent: true }] : []),
    ...generationHistory
      .filter(video => !currentGeneration || video.id !== currentGeneration.id)
      .map(video => ({ ...video, isCurrent: false }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const processingCount = allVideos.filter(v => v.status === 'processing').length
  const completedCount = allVideos.filter(v => v.status === 'completed').length
  const failedCount = allVideos.filter(v => v.status === 'failed').length

  // Check processing videos when component mounts (after initial fetch)
  useEffect(() => {
    if (!isInitialLoading && allVideos.length > 0) {
      checkProcessingVideos()
    }
  }, [isInitialLoading])

  // Auto-refresh when there are processing videos
  useEffect(() => {
    if (processingCount > 0) {
      console.log(`🔄 Setting up auto-refresh for ${processingCount} processing videos`)
      
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      
      // Set up new interval - check Shotstack status instead of just fetching from DB
      intervalRef.current = setInterval(() => {
        console.log('🔄 Auto-refreshing video status via Shotstack...')
        checkProcessingVideos()
      }, 30000) // Refresh every 30 seconds
      
    } else {
      // Clear interval if no processing videos
      if (intervalRef.current) {
        console.log('🔄 Clearing auto-refresh - no processing videos')
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [processingCount])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  // Manual refresh
  const handleRefresh = () => {
    fetchVideos(false)
    // Also check processing videos via Shotstack
    setTimeout(() => checkProcessingVideos(), 1000) // Small delay to let fetchVideos complete first
  }

  // Get status badge styling
  const getStatusBadge = (status: VideoRecord['status']) => {
    switch (status) {
      case 'completed':
        return { variant: 'default' as const, className: 'bg-green-900/50 text-green-200 border-green-700', icon: CheckCircle }
      case 'failed':
        return { variant: 'destructive' as const, className: 'bg-red-900/50 text-red-200 border-red-700', icon: AlertCircle }
      case 'processing':
      default:
        return { variant: 'secondary' as const, className: 'bg-blue-900/50 text-blue-200 border-blue-700', icon: Loader2 }
    }
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Download video
  const handleDownloadVideo = (videoUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = videoUrl
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Clear current generation
  const handleClearCurrent = () => {
    dispatch(clearCurrentGeneration())
    showMessage('Current generation cleared', 'info')
  }

  // Delete video
  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return
    }

    setDeletingVideos(prev => new Set([...prev, videoId]))
    
    try {
      const response = await fetch(`/api/delete-video?videoId=${videoId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete video')
      }

      // Remove from Redux state
      dispatch(removeVideoFromHistory(videoId))
      
      showMessage('Video deleted successfully', 'success')
    } catch (error: any) {
      console.error('Failed to delete video:', error)
      showMessage(`Failed to delete video: ${error.message}`, 'error')
    } finally {
      setDeletingVideos(prev => {
        const newSet = new Set(prev)
        newSet.delete(videoId)
        return newSet
      })
    }
  }

  return (
    <div className="flex-1 p-6 space-y-6 bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Video Status</h1>
            <p className="text-gray-300">
              Monitor and manage your video generation jobs
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing || isCheckingStatus}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(isRefreshing || isCheckingStatus) ? 'animate-spin' : ''}`} />
            {isCheckingStatus ? 'Checking Status...' : isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Google Drive Warning/Status */}
      {isLoggedIn && hasGoogleTokens ? (
        <Card className="border-green-700 bg-green-900/20 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-200">
                Connected to Google as {userEmail} - Upload buttons available for Google Drive and YouTube
              </span>
            </div>
          </CardContent>
        </Card>
      ) : isLoggedIn && hasGoogleTokens === false ? (
        <Card className="border-orange-700 bg-orange-900/20 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-orange-200">
                Supabase authenticated as {userEmail}, but Google OAuth required for uploads. 
                <a href="/api/auth/signin/google" className="underline ml-1 hover:text-orange-100 text-orange-300">Sign in with Google</a>
              </span>
            </div>
          </CardContent>
        </Card>
      ) : hasGoogleTokens === null ? (
        <Card className="border-blue-700 bg-blue-900/20 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
              <span className="text-sm text-blue-200">
                Checking Google authentication status...
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-700 bg-amber-900/20 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-amber-200">
                Sign in with Google in the navbar to upload videos to Google Drive and YouTube
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 shadow-lg border border-gray-700 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">Total Videos</p>
                <p className="text-2xl font-bold text-white">{allVideos.length}</p>
              </div>
              <VideoIcon className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-900/30 shadow-lg border border-blue-700 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-300">Processing</p>
                <p className="text-2xl font-bold text-blue-100">{processingCount}</p>
              </div>
              <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-900/30 shadow-lg border border-green-700 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-300">Completed</p>
                <p className="text-2xl font-bold text-green-100">{completedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-900/30 shadow-lg border border-red-700 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-300">Failed</p>
                <p className="text-2xl font-bold text-red-100">{failedCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Video List */}
      {isInitialLoading ? (
        <Card className="bg-gray-900/50 shadow-lg border border-gray-700 backdrop-blur-sm">
          <CardContent className="pt-6 text-center py-12">
            <Loader2 className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-white mb-2">Loading Videos</h3>
            <p className="text-gray-300">
              Fetching your video generation history...
            </p>
          </CardContent>
        </Card>
      ) : allVideos.length > 0 ? (
        <Card className="bg-gray-900/50 shadow-lg border border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <VideoIcon className="h-5 w-5" />
              Video Generation History
            </CardTitle>
            <CardDescription className="text-gray-300">
              All video generations sorted by creation date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allVideos.map((video) => {
                const statusInfo = getStatusBadge(video.status)
                const StatusIcon = statusInfo.icon
                
                return (
                  <div 
                    key={video.id} 
                    className={`p-4 rounded-lg border backdrop-blur-sm ${
                      video.isCurrent 
                        ? 'border-purple-600 bg-purple-900/30' 
                        : 'border-gray-600 bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white">
                            Video {video.id.slice(0, 8)}
                          </h3>
                          {video.isCurrent && (
                            <Badge variant="outline" className="text-xs bg-purple-900/50 text-purple-200 border-purple-600">
                              Current
                            </Badge>
                          )}
                          <Badge 
                            variant={statusInfo.variant}
                            className={`${statusInfo.className} flex items-center gap-1`}
                          >
                            <StatusIcon className={`h-3 w-3 ${video.status === 'processing' ? 'animate-spin' : ''}`} />
                            {video.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-300 mb-2">
                          <div>
                            <span className="font-medium">Type:</span> {video.metadata?.type || 'traditional'}
                          </div>
                          <div>
                            <span className="font-medium">Images:</span> {video.image_urls.length}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span> {
                              video.metadata?.total_duration 
                                ? formatDuration(video.metadata.total_duration)
                                : 'Unknown'
                            }
                          </div>
                          <div>
                            <span className="font-medium">Created:</span> {formatRelativeTime(video.created_at)}
                          </div>
                        </div>

                        {video.subtitles_url && (
                          <div className="text-xs text-gray-400">
                            ✓ Includes subtitles
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4 flex-wrap">
                        {video.status === 'completed' && video.final_video_url && (
                          <>
                            <Button
                              onClick={() => handleDownloadVideo(video.final_video_url!, `video-${video.id}.mp4`)}
                              size="sm"
                              variant="outline"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                            <Button
                              onClick={() => window.open(video.final_video_url!, '_blank')}
                              size="sm"
                              variant="outline"
                            >
                              <PlayCircle className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </>
                        )}

                        {/* Delete Button - Available for all videos */}
                        <Button
                          onClick={() => handleDeleteVideo(video.id)}
                          size="sm"
                          variant="outline"
                          disabled={deletingVideos.has(video.id)}
                          className="border-red-600 bg-gray-800 hover:bg-red-900/50 text-red-300 hover:text-red-200"
                        >
                          {deletingVideos.has(video.id) ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </>
                          )}
                        </Button>

                        {video.status === 'completed' && video.final_video_url && (
                          <>
                            {/* Google Drive Upload Button */}
                            {isLoggedIn && hasGoogleTokens ? (
                              <div className="flex flex-col gap-1">
                                <Button
                                  onClick={() => {
                                    console.log('🔘 Upload button onClick triggered for video:', video.id)
                                    handleUploadToGoogleDrive(video)
                                  }}
                                  size="sm"
                                  variant="outline"
                                  disabled={uploadingVideos.has(video.id)}
                                  className="border-blue-600 bg-gray-800 hover:bg-blue-900/50 text-blue-300 hover:text-blue-200 shadow-sm transition-all duration-200 hover:shadow-md"
                                >
                                  {uploadingVideos.has(video.id) ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Uploading {uploadProgress[video.id] || 0}%
                                    </>
                                  ) : (
                                    <>
                                      <GoogleLogo size={12} />
                                      <span className="ml-1">Upload to Drive</span>
                                    </>
                                  )}
                                </Button>
                                {/* Progress Bar */}
                                {uploadingVideos.has(video.id) && uploadProgress[video.id] !== undefined && (
                                  <div className="w-full">
                                    <Progress 
                                      value={uploadProgress[video.id]} 
                                      className="h-1.5 w-full"
                                    />
                                    <div className="text-xs text-blue-300 mt-0.5 text-center">
                                      {uploadProgress[video.id]}% uploaded
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="border-gray-600 bg-gray-800 text-gray-500 opacity-60"
                                title={
                                  !isLoggedIn ? "Sign in with Supabase first" :
                                  hasGoogleTokens === false ? "Sign in with Google required" :
                                  "Checking Google authentication..."
                                }
                              >
                                <GoogleLogo size={12} />
                                <span className="ml-1">Upload to Drive</span>
                              </Button>
                            )}

                            {/* YouTube Upload Button */}
                            {isLoggedIn && hasGoogleTokens ? (
                              <Button
                                onClick={() => {
                                  console.log('🎬 YouTube upload button onClick triggered for video:', video.id)
                                  handleUploadToYouTube(video)
                                }}
                                size="sm"
                                variant="outline"
                                disabled={uploadingToYouTube.has(video.id)}
                                className="border-red-600 bg-gray-800 hover:bg-red-900/50 text-red-300 hover:text-red-200 shadow-sm transition-all duration-200 hover:shadow-md"
                              >
                                {uploadingToYouTube.has(video.id) ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <YouTubeLogo size={12} />
                                    <span className="ml-1">Upload to YouTube</span>
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="border-gray-600 bg-gray-800 text-gray-500 opacity-60"
                                title={
                                  !isLoggedIn ? "Sign in with Supabase first" :
                                  hasGoogleTokens === false ? "Sign in with Google required" :
                                  "Checking Google authentication..."
                                }
                              >
                                <YouTubeLogo size={12} />
                                <span className="ml-1">Upload to YouTube</span>
                              </Button>
                            )}
                          </>
                        )}

                        {video.isCurrent && (
                          <Button
                            onClick={handleClearCurrent}
                            size="sm"
                            variant="outline"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Processing Progress */}
                    {video.status === 'processing' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-300">
                            {isCheckingStatus ? 'Checking with Shotstack...' : 'Processing with Shotstack...'}
                          </span>
                          <span className="text-blue-300">Estimated: 2-5 minutes</span>
                        </div>
                        <Progress value={undefined} className="h-2" />
                        <div className="text-xs text-blue-400">
                          {isCheckingStatus 
                            ? 'Verifying render status with Shotstack API...'
                            : 'Video is being rendered. Status will update automatically.'
                          }
                        </div>
                      </div>
                    )}

                    {/* Completed Video Preview */}
                    {video.status === 'completed' && video.final_video_url && (
                      <div className="mt-3">
                        <video 
                          controls 
                          className="w-full max-w-md rounded"
                          poster={video.thumbnail_url}
                        >
                          <source src={video.final_video_url} type="video/mp4" />
                          Your browser does not support the video element.
                        </video>
                      </div>
                    )}

                    {/* Error Message */}
                    {video.status === 'failed' && video.error_message && (
                      <div className="mt-3 p-2 bg-red-900/30 border border-red-700 rounded text-sm text-red-200">
                        <strong>Error:</strong> {video.error_message}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-900/50 border border-gray-700 backdrop-blur-sm">
          <CardContent className="pt-6 text-center py-12">
            <VideoIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Video Generations Yet</h3>
            <p className="text-gray-300 mb-4">
              Start creating videos from your images and audio
            </p>
            <Badge variant="outline" className="border-gray-600 text-gray-300">
              Go to Video Generator to get started
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Status Message */}
      {message && (
        <Card className={`border backdrop-blur-sm ${
          messageType === 'success' ? 'border-green-700 bg-green-900/20' :
          messageType === 'error' ? 'border-red-700 bg-red-900/20' :
          'border-blue-700 bg-blue-900/20'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {messageType === 'success' && <CheckCircle className="h-4 w-4 text-green-400" />}
              {messageType === 'error' && <AlertCircle className="h-4 w-4 text-red-400" />}
              {messageType === 'info' && <VideoIcon className="h-4 w-4 text-blue-400" />}
              <span className={`text-sm ${
                messageType === 'success' ? 'text-green-200' :
                messageType === 'error' ? 'text-red-200' :
                'text-blue-200'
              }`}>
                {message}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 