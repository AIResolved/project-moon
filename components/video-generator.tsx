'use client'

import { useState, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../lib/hooks'
import { StaggerContainer, StaggerItem, ScaleOnHover } from './animated-page'
import { motion } from 'framer-motion'
import { 
  setVideoSettings,
  startVideoGeneration,
  setVideoGenerationError,
  saveVideoToHistory,
  setIsGeneratingVideo
} from '../lib/features/video/videoSlice'
import { CreateVideoRequestBody, VideoRecord, SegmentTiming, IntroImageConfig, IntroVideoConfig } from '@/types/video-generation'

// Type for segment items that can be reordered
type SegmentItem = {
  id: string
  type: 'image' | 'video'
  url: string
  duration: number
  originalIndex: number
  thumbnail?: string
}
import { getStoredVideosFromLocalStorage } from '@/utils/video-storage-utils'

// Import modular components
import { VideoPrerequisites } from './video-generation/VideoPrerequisites'
import { VideoSettings } from './video-generation/VideoSettings'

import { VideoGenerationStatus } from './video-generation/VideoGenerationStatus'
import { VideoStatusMessage } from './video-generation/VideoStatusMessage'
import { VideoEmptyState } from './video-generation/VideoEmptyState'

export function VideoGenerator() {
  const dispatch = useAppDispatch()
  
  // Use Redux state for user instead of NextAuth session
  const { id: userId } = useAppSelector(state => state.user)
  
  // Use Redux states from imageGeneration, audio, video, and textImageVideo slices
  const { imageSets, selectedImagesOrder, mixedContentSequence } = useAppSelector(state => state.imageGeneration)
  const { currentGeneration: audioGeneration } = useAppSelector(state => state.audio)
  const { 
    currentGeneration, 
    isGeneratingVideo,
    settings
  } = useAppSelector(state => state.video)
  const { 
    selectedVideosForGenerator: selectedVideosForGeneration,
    currentBatch: videoBatch,
    videoHistory
  } = useAppSelector(state => state.textImageVideo)
  
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  const [customSegmentTimings, setCustomSegmentTimings] = useState<SegmentTiming[]>([])
  const [selectedVideosCount, setSelectedVideosCount] = useState(0)
  
  // Segment ordering state
  const [orderedSegments, setOrderedSegments] = useState<SegmentItem[]>([])
  const [isCustomOrder, setIsCustomOrder] = useState(false)

  // Add subtitle styling state
  const [subtitleSettings, setSubtitleSettings] = useState({
    fontFamily: 'Roboto',
    fontColor: '#ffffff',
    fontSize: 24,
    strokeWidth: 2,
    fontWeight: '1000',
    textTransform: 'none'
  })



  // Track selected videos count and get video data
  const [selectedVideos, setSelectedVideos] = useState<any[]>([])
  
  useEffect(() => {
    // Get videos from localStorage (uploaded videos)
    const storedVideos = getStoredVideosFromLocalStorage()
    
    // Also get videos from Redux state (current batch and history)
    const reduxVideos: any[] = []
    
    // Add current batch videos
    if (videoBatch) {
      videoBatch.videos.forEach(video => {
        reduxVideos.push({
          id: video.id,
          videoUrl: video.videoUrl,
          prompt: video.prompt,
          duration: video.duration,
          type: video.type,
          source: 'current-batch'
        })
      })
    }
    
    // Add history videos
    videoHistory.forEach(video => {
      reduxVideos.push({
        id: video.id,
        videoUrl: video.videoUrl,
        prompt: video.prompt,
        duration: video.duration,
        type: video.type,
        source: 'history'
      })
    })
    
    // Combine stored videos and Redux videos, prioritizing stored videos
    const allVideos = [...storedVideos, ...reduxVideos]
    const uniqueVideos = allVideos.filter((video, index, arr) => 
      arr.findIndex(v => v.id === video.id) === index
    )
    
    const selectedVideosList = uniqueVideos.filter(video => selectedVideosForGeneration.includes(video.id))
    
    setSelectedVideos(selectedVideosList)
    setSelectedVideosCount(selectedVideosList.length)
  }, [selectedVideosForGeneration, videoBatch, videoHistory])

  // Initialize segments and timings when content changes
  useEffect(() => {
    // Prioritize mixed content sequence if available
    if (mixedContentSequence.length > 0) {
      console.log('🚀 Using mixed content sequence from mixed content generator:', mixedContentSequence.length, 'items')
      
      // Convert MixedContentItem[] to SegmentItem[]
      const newOrderedSegments: SegmentItem[] = mixedContentSequence.map((item, index) => ({
        id: `mixed-${item.type}-${index}`,
        type: item.type === 'animation' ? 'image' : item.type, // Treat animations as images
        url: item.url,
        duration: item.duration || (item.type === 'video' ? 3 : 0), // Default video duration or 0 for images
        originalIndex: index,
        thumbnail: item.thumbnail
      }))

      console.log(`🔧 Built ${newOrderedSegments.length} segments from mixed content sequence`)
      
      setOrderedSegments(newOrderedSegments)
      setIsCustomOrder(true) // Mark as custom since it came from mixed content generator

      // Calculate durations based on audio
      if (audioGeneration?.duration) {
        updateSegmentTimingsFromOrder(newOrderedSegments)
      }
    } else {
      // Fallback to old system if no mixed content sequence
      const totalImages = selectedImagesOrder.length
      const totalVideos = selectedVideos.length
      const totalSegments = totalImages + totalVideos

      if (totalSegments > 0) {
        console.log('📋 Using fallback system: building segments from separate image/video orders')
        
        // Build ordered segments list (default order: images first, then videos)
        const newOrderedSegments: SegmentItem[] = []
        
        // Add image segments - resolve IDs to actual URLs
        selectedImagesOrder.forEach((imageId, index) => {
          // Resolve image ID to actual URL using the same logic as getOrderedImageUrls
          const [setId, imageIndex] = imageId.split(':')
          const imageSet = imageSets.find(set => set.id === setId)
          
          if (imageSet && imageSet.imageUrls[parseInt(imageIndex)]) {
            const actualImageUrl = imageSet.imageUrls[parseInt(imageIndex)]
            console.log(`🔗 Resolved image ID "${imageId}" to URL: ${actualImageUrl.substring(0, 50)}...`)
            newOrderedSegments.push({
              id: `image-${index}`,
              type: 'image',
              url: actualImageUrl, // Use actual URL instead of ID
              duration: 0, // Will be calculated below
              originalIndex: index,
              thumbnail: actualImageUrl
            })
          } else {
            console.warn(`❌ Could not resolve image ID: ${imageId}`)
          }
        })
        
        // Add video segments
        selectedVideos.forEach((video, index) => {
          // Handle different video URL property names
          const videoUrl = video.supabaseUrl || video.video_url || video.videoUrl || ''
          const thumbnailUrl = video.thumbnail_url || video.supabaseUrl || video.video_url || video.videoUrl || ''
          
          console.log(`🎬 Adding video segment ${index + 1}: ${video.prompt?.substring(0, 30)}... URL: ${videoUrl.substring(0, 50)}...`)
          
          newOrderedSegments.push({
            id: `video-${index}`,
            type: 'video',
            url: videoUrl,
            duration: video.duration || 3,
            originalIndex: index,
            thumbnail: thumbnailUrl
          })
        })

        console.log(`🔧 Built ${newOrderedSegments.length} segments (${newOrderedSegments.filter(s => s.type === 'image').length} images, ${newOrderedSegments.filter(s => s.type === 'video').length} videos)`)

        // Only update if not using custom order or if segments changed significantly
        if (!isCustomOrder || orderedSegments.length !== newOrderedSegments.length) {
          setOrderedSegments(newOrderedSegments)
          setIsCustomOrder(false)
        }

        // Calculate durations based on audio
        if (audioGeneration?.duration) {
          updateSegmentTimingsFromOrder(isCustomOrder ? orderedSegments : newOrderedSegments)
        }
      } else {
        setOrderedSegments([])
        setCustomSegmentTimings([])
        setIsCustomOrder(false)
      }
    }
  }, [mixedContentSequence, selectedImagesOrder, selectedVideos, audioGeneration?.duration, imageSets])

  // Function to update segment timings based on current order
  const updateSegmentTimingsFromOrder = (segments: SegmentItem[]) => {
    if (!audioGeneration?.duration || segments.length === 0) return

    // Calculate total video duration
    const totalVideoDuration = segments
      .filter(s => s.type === 'video')
      .reduce((sum, segment) => sum + segment.duration, 0)
    
    // Remaining duration for images
    const imageCount = segments.filter(s => s.type === 'image').length
    const remainingDuration = Math.max(0, audioGeneration.duration - totalVideoDuration)
    const imageDuration = imageCount > 0 ? remainingDuration / imageCount : 0

    // Create segment timings based on order
    const newTimings: SegmentTiming[] = segments.map(segment => ({
      duration: segment.type === 'image' ? imageDuration : segment.duration
    }))

    setCustomSegmentTimings(newTimings)
  }

  // Reordering functions
  const handleMoveSegment = (fromIndex: number, toIndex: number) => {
    const newOrderedSegments = [...orderedSegments]
    const [movedSegment] = newOrderedSegments.splice(fromIndex, 1)
    newOrderedSegments.splice(toIndex, 0, movedSegment)
    
    setOrderedSegments(newOrderedSegments)
    setIsCustomOrder(true)
    updateSegmentTimingsFromOrder(newOrderedSegments)
    
    showMessage(`Moved segment ${fromIndex + 1} to position ${toIndex + 1}`, 'success')
  }

  const handleResetOrder = () => {
    // Reset to default order (images first, then videos)
    setIsCustomOrder(false)
    // The useEffect will handle rebuilding the default order
  }

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg)
    setMessageType(type)
    // Auto-clear success and info messages after 5 seconds
    if (type !== 'error') {
      setTimeout(() => setMessage(""), 5000)
    }
  }

  // Get image URLs from selected images order in Redux
  const getOrderedImageUrls = (): string[] => {
    const urls: string[] = []
    
    // Use the ordered selection from Redux state
    if (selectedImagesOrder.length > 0) {
      selectedImagesOrder.forEach((imageId: string) => {
        const [setId, imageIndex] = imageId.split(':')
        const imageSet = imageSets.find(set => set.id === setId)
        if (imageSet && imageSet.imageUrls[parseInt(imageIndex)]) {
          urls.push(imageSet.imageUrls[parseInt(imageIndex)])
        }
      })
      return urls
    }
    
    console.log(`🖼️ Found ${urls.length} ordered image URLs from Redux state`)
    return urls
  }

  // Check if we have generated images
  const hasGeneratedImages = imageSets.length > 0 && selectedImagesOrder.length > 0

  // Initialize custom segment timings when images or audio change
  useEffect(() => {
    const imageUrls = getOrderedImageUrls()
    if (imageUrls.length > 0 && audioGeneration?.audioUrl) {
      if (audioGeneration.duration) {
        // Use actual duration if available
        const equalDuration = audioGeneration.duration / imageUrls.length
        const timings = imageUrls.map(() => ({ duration: equalDuration }))
        setCustomSegmentTimings(timings)
      } else {
        // Fallback to default timing if duration is missing
        console.warn('🎵 Audio duration not available, using default 3s per image')
        const defaultDuration = 3 // 3 seconds per image as fallback
        const timings = imageUrls.map(() => ({ duration: defaultDuration }))
        setCustomSegmentTimings(timings)
      }
    }
  }, [selectedImagesOrder, imageSets.length, audioGeneration?.audioUrl, audioGeneration?.duration])

  // Debug logging for audio generation state
  useEffect(() => {
    console.log('🎵 Audio generation state:', audioGeneration)
    if (audioGeneration) {
      console.log('🎵 Audio URL:', audioGeneration.audioUrl)
      console.log('🎵 Audio duration:', audioGeneration.duration)
      console.log('🎵 Audio status:', audioGeneration.status)
    }
  }, [audioGeneration])

  // Debug logging for image generation state
  useEffect(() => {
    console.log('🖼️ Video Generator - Image generation state:', { 
      imageSetsCount: imageSets.length, 
      selectedImagesOrderLength: selectedImagesOrder.length,
      totalImages: getOrderedImageUrls().length,
      hasGeneratedImages 
    })
  }, [imageSets, selectedImagesOrder, hasGeneratedImages])

  // Check if we have all prerequisites for video generation (either images OR videos, plus audio)
  const hasVideoContent = hasGeneratedImages || selectedVideosCount > 0
  const hasPrerequisites = hasVideoContent && audioGeneration?.audioUrl

  // Show messages for state changes
  useEffect(() => {
    if (hasVideoContent && audioGeneration?.audioUrl) {
      showMessage('Ready to generate video! All prerequisites are met.', 'success')
    } else if (!hasVideoContent) {
      showMessage('Select images in Image Generator OR videos from Text/Image-to-Video Generator first.', 'info')
    } else if (!audioGeneration?.audioUrl) {
      showMessage('Generate audio first to create a video.', 'info')
    }
  }, [hasVideoContent, audioGeneration?.audioUrl])

  // Update segment timing duration
  const updateSegmentTiming = (index: number, duration: number) => {
    const updatedTimings = [...customSegmentTimings]
    updatedTimings[index] = { duration }
    setCustomSegmentTimings(updatedTimings)
  }

  // Distribute total duration: videos keep original duration, images share the rest equally
  const distributeEquallyAcrossSegments = async () => {
    const totalImages = selectedImagesOrder.length
    const totalVideos = selectedVideos.length
    
    if (totalImages === 0 && totalVideos === 0) {
      showMessage('No images or videos selected for timing distribution', 'error')
      return
    }

    let duration = audioGeneration?.duration
    
    // If duration is not available in Redux, try to fetch it
    if (!duration) {
      showMessage('Fetching audio duration...', 'info')
      duration = await getAudioDuration()
      
      if (!duration) {
        showMessage('Audio duration not available. Please regenerate audio first.', 'error')
        console.warn('🎵 Audio duration missing from state:', audioGeneration)
        return
      }
    }
    
    // Calculate total video duration
    const totalVideoDuration = selectedVideos.reduce((sum, video) => sum + (video.duration || 3), 0)
    
    // Remaining duration for images
    const remainingDuration = Math.max(0, duration - totalVideoDuration)
    const imageDuration = totalImages > 0 ? remainingDuration / totalImages : 0

    // Create new timings: images first, then videos
    const newTimings: SegmentTiming[] = []
    
    // Add image segments
    for (let i = 0; i < totalImages; i++) {
      newTimings.push({ duration: imageDuration })
    }
    
    // Add video segments with their original durations
    for (const video of selectedVideos) {
      newTimings.push({ duration: video.duration || 3 })
    }

    setCustomSegmentTimings(newTimings)
    
    if (totalVideos > 0) {
      showMessage(
        `Distributed ${duration.toFixed(1)}s: ${totalVideos} video(s) use original duration, ${totalImages} image(s) share ${remainingDuration.toFixed(1)}s equally`, 
        'success'
      )
    } else {
      showMessage(`Distributed ${duration.toFixed(1)}s equally across ${totalImages} images`, 'success')
    }
  }

  // Get audio duration with fallback to fetch from audio file
  const getAudioDuration = async (): Promise<number | null> => {
    if (audioGeneration?.duration) {
      return audioGeneration.duration
    }
    
    // If no duration is available in Redux, try to get it from the audio file
    if (audioGeneration?.audioUrl) {
      try {
        console.log('🎵 Fetching audio duration from file:', audioGeneration.audioUrl)
        return new Promise((resolve) => {
          const audio = new Audio(audioGeneration.audioUrl!)
          audio.addEventListener('loadedmetadata', () => {
            console.log('🎵 Audio duration fetched:', audio.duration)
            resolve(audio.duration)
          })
          audio.addEventListener('error', () => {
            console.warn('🎵 Failed to load audio metadata')
            resolve(null)
          })
          // Set timeout to avoid hanging
          setTimeout(() => resolve(null), 5000)
        })
      } catch (error) {
        console.warn('🎵 Error fetching audio duration:', error)
      }
    }
    
    console.warn('🎵 No audio duration available')
    return null
  }

  // Convert script durations to segment timings for video generation
  const getScriptBasedTimings = (): SegmentTiming[] => {
    if (!audioGeneration?.scriptDurations || getOrderedImageUrls().length === 0) {
      return []
    }

    // Map images to their corresponding script durations
    const timings: SegmentTiming[] = []
    
    getOrderedImageUrls().forEach((imageUrl, index) => {
      // For now, we'll use index-based matching since imageUrl doesn't directly map to imageId
      // In a real implementation, you'd need to maintain the relationship between imageUrl and imageId
      const scriptDuration = audioGeneration.scriptDurations?.[index]
      if (scriptDuration) {
        timings.push({ duration: scriptDuration.duration })
      } else {
        // Fallback to equal timing if no script duration found
        const fallbackDuration = audioGeneration.duration ? audioGeneration.duration / getOrderedImageUrls().length : 3
        timings.push({ duration: fallbackDuration })
        console.warn(`No script duration found for image ${index}, using fallback: ${fallbackDuration}s`)
      }
    })

    return timings
  }

  // Check if script-based timing is available
  const scriptBasedTimingAvailable = audioGeneration?.scriptDurations && audioGeneration.scriptDurations.length > 0

  // Handle video generation with ordered images and videos
  const handleGenerateVideo = async () => {
    try {
      dispatch(setIsGeneratingVideo(true))

      // Get content for video generation using ordered segments
      const totalContent = orderedSegments.length
      
      // Validate that at least one piece of content is selected
      if (totalContent === 0) {
        showMessage('Please select images or videos first.', 'error')
        dispatch(setIsGeneratingVideo(false))
      return
    }

      // Build content arrays that preserve the exact reordered sequence
      const orderedContentUrls = orderedSegments.map(segment => segment.url)
      const orderedContentTypes = orderedSegments.map(segment => segment.type)
      
      // Also build separate arrays for backward compatibility
      const imageUrls: string[] = []
      const videoUrls: string[] = []
      
      orderedSegments.forEach(segment => {
        if (segment.type === 'image') {
          imageUrls.push(segment.url)
        } else if (segment.type === 'video') {
          videoUrls.push(segment.url)
        }
      })

      const totalImages = imageUrls.length
      const totalVideos = videoUrls.length
      
      console.log(`🎬 Starting video generation with ${totalImages} images and ${totalVideos} videos in custom order`)
      console.log(`🔄 Ordered sequence:`, orderedSegments.map((s, i) => `${i+1}. ${s.type} (${s.url.substring(0, 20)}...)`))
      console.log(`🔗 Ordered URLs being sent to API:`)
      orderedSegments.forEach((segment, index) => {
        console.log(`   ${index + 1}. ${segment.type}: ${segment.url}`)
      })
      showMessage(`Starting video generation with ${totalImages} images and ${totalVideos} videos in custom order...`, 'info')
      
      // Use segment timings that correspond to the ordered segments
      const segmentTimings = customSegmentTimings.length > 0 ? customSegmentTimings : undefined

      // Prepare request body with ordered content structure
      const requestBody: CreateVideoRequestBody = {
        imageUrls: imageUrls, // Keep for backward compatibility
        videoUrls: videoUrls, // Keep for backward compatibility
        // New ordered content arrays that preserve reordering
        orderedContentUrls: orderedContentUrls,
        orderedContentTypes: orderedContentTypes,
        audioUrl: audioGeneration?.audioUrl || 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        compressedAudioUrl: audioGeneration?.compressedAudioUrl || undefined,
        subtitlesUrl: settings.includeSubtitles && audioGeneration?.subtitlesUrl ? audioGeneration.subtitlesUrl : undefined,
        userId: userId || 'current_user',
        thumbnailUrl: orderedSegments[0]?.thumbnail || imageUrls[0] || videoUrls[0] || '', // Use first segment's thumbnail
        segmentTimings: segmentTimings,
        includeOverlay: settings.includeOverlay || false,
          fontFamily: subtitleSettings.fontFamily,
          fontColor: subtitleSettings.fontColor,
        fontSize: subtitleSettings.fontSize,
          strokeWidth: subtitleSettings.strokeWidth,
        fontWeight: subtitleSettings.fontWeight,
          textTransform: subtitleSettings.textTransform,
        audioDuration: audioGeneration?.duration ?? undefined,
        // Simplified video effects
        zoomEffect: settings.zoomEffect || false,
        dustOverlay: settings.dustOverlay || false,
        snowOverlay: settings.snowOverlay || false,
        screenDisplacementOverlay: settings.screenDisplacementOverlay || false,
        fireOverlay: settings.fireOverlay || false,
        // Custom music
        useCustomMusic: settings.useCustomMusic || false,
        customMusicFiles: settings.customMusicFiles || [],
        selectedMusicTrack: settings.selectedMusicTrack,
        selectedMusicTracks: settings.selectedMusicTracks || []
      }

      console.log('🎬 Starting video generation with:', requestBody)
      console.log('🎵 Music settings:', {
        useCustomMusic: requestBody.useCustomMusic,
        selectedMusicTrack: requestBody.selectedMusicTrack,
        selectedMusicTracks: requestBody.selectedMusicTracks,
        customMusicFiles: requestBody.customMusicFiles?.length || 0
      })
      showMessage('Starting video generation...', 'info')

      // Call video creation API
      const response = await fetch('/api/create-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.video_id) {
        // Show immediate success feedback about Shotstack accepting the job
        showMessage(`🎬 Video rendering started! Shotstack is processing your video with ${totalImages} images and ${totalVideos} videos...`, 'success')
        
        // Create video record for Redux state
        const videoRecord: VideoRecord = {
          id: data.video_id,
          user_id: userId || 'current_user',
          status: 'processing',
          shotstack_id: data.shotstack_id || '',
          image_urls: imageUrls,
          audio_url: requestBody.audioUrl,
          subtitles_url: requestBody.subtitlesUrl,
          thumbnail_url: imageUrls[0] || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            type: 'mixed-content',
            segment_timings: segmentTimings,
            total_duration: segmentTimings ? 
              segmentTimings.reduce((sum, timing) => sum + timing.duration, 0) : 
              audioGeneration?.duration || 30,
            scenes_count: totalContent,
            image_count: totalImages,
            video_count: totalVideos
          }
        }

        dispatch(startVideoGeneration(videoRecord))
        dispatch(saveVideoToHistory(videoRecord))
        
        // Reset generating state since the request was successful
        dispatch(setIsGeneratingVideo(false))

        // Additional detailed message after a short delay
        setTimeout(() => {
          const shotstackInfo = data.shotstack_id ? ` | Shotstack Job: ${data.shotstack_id}` : ''
          showMessage(
            `Video ID: ${data.video_id}${shotstackInfo} | Processing typically takes 2-5 minutes. You'll be notified when complete.`,
            'info'
          )
        }, 2000)
        
      } else {
        throw new Error('No video ID returned from API')
      }

    } catch (error: any) {
      console.error('Video generation error:', error)
      dispatch(setVideoGenerationError({ 
        videoId: currentGeneration?.id || 'unknown',
        error: error.message 
      }))
      dispatch(setIsGeneratingVideo(false))
      showMessage(`Video generation failed: ${error.message}`, 'error')
    }
  }

  // Download video
  const handleDownloadVideo = (videoUrl: string, filename: string = 'generated-video.mp4') => {
    const link = document.createElement('a')
    link.href = videoUrl
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Settings change handler
  const handleSettingsChange = (newSettings: any) => {
    dispatch(setVideoSettings(newSettings))
  }

  // Calculate total duration for segmented timing
  const totalSegmentDuration = customSegmentTimings.reduce((sum, timing) => sum + timing.duration, 0)

  return (
    <StaggerContainer className="flex-1 p-6 space-y-6">
      {/* Header */}
      <StaggerItem>
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-3xl text-white font-bold text-gray-900">Video Generator</h1>
        <p className="text-gray-600">
            Create professional videos from your selected images and audio using Shotstack with dynamic slide effects, zoom animations, and advanced timing options
        </p>
        </motion.div>
      </StaggerItem>

      {/* Prerequisites Check */}
      <StaggerItem>
        <VideoPrerequisites
          hasGeneratedImages={hasGeneratedImages}
          imageSetsCount={selectedImagesOrder.length}
          audioGeneration={audioGeneration}
        />
      </StaggerItem>

      {/* Video Settings */}
      <StaggerItem>
        <VideoSettings
          settings={settings}
          onSettingsChange={handleSettingsChange}
          hasPrerequisites={hasPrerequisites as boolean}
          selectedImagesCount={selectedImagesOrder.length}
          selectedVideosCount={selectedVideosCount}
          audioGeneration={audioGeneration}
          isGeneratingVideo={isGeneratingVideo}
          onGenerateVideo={handleGenerateVideo}
          customSegmentTimings={customSegmentTimings}
          onUpdateSegmentTiming={updateSegmentTiming}
          onDistributeEquallyAcrossSegments={distributeEquallyAcrossSegments}
          totalSegmentDuration={totalSegmentDuration}
          subtitleSettings={subtitleSettings}
          onSubtitleSettingsChange={setSubtitleSettings}
          orderedSegments={orderedSegments}
          onMoveSegment={handleMoveSegment}
          onResetOrder={handleResetOrder}
          isCustomOrder={isCustomOrder}
        />
      </StaggerItem>



      {/* Current Generation Status */}
      <StaggerItem>
        <VideoGenerationStatus
          currentGeneration={currentGeneration}
        onDownloadVideo={handleDownloadVideo}
      />
      </StaggerItem>

      {/* Status Message */}
      <StaggerItem>
        <VideoStatusMessage
          message={message}
          messageType={messageType}
        />
      </StaggerItem>

      {/* Empty State */}
      <StaggerItem>
        <VideoEmptyState
          hasPrerequisites={hasPrerequisites as boolean}
          hasGeneratedImages={hasGeneratedImages}
          selectedVideosCount={selectedVideosCount}
          audioGeneration={audioGeneration}
        />
      </StaggerItem>
    </StaggerContainer>
  )
} 