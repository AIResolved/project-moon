'use client'

import { useState, useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '../lib/hooks'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { StaggerContainer, StaggerItem, ScaleOnHover } from './animated-page'
import { motion } from 'framer-motion'
import { 
  startBatchGeneration,
  updateBatchProgress,
  updateGenerationInfo,
  addVideoToBatch,
  updateVideoInBatch,
  completeBatchGeneration,
  failBatchGeneration,
  clearError,
  setDefaultDuration,
  updateRateLimit
} from '@/lib/features/textImageVideo/textImageVideoSlice'
import { 
  TextToVideoRequest, 
  ImageToVideoRequest, 
  GeneratedVideo,
  VIDEO_PROVIDERS 
} from '@/types/text-image-video-generation'
import { v4 as uuidv4 } from 'uuid'
import { uploadVideoToSupabase, saveVideoToLocalStorage } from '@/utils/video-storage-utils'

// Import modular components
import { TextToVideoTab } from './text-image-video/TextToVideoTab'
import { ImageToVideoTab } from './text-image-video/ImageToVideoTab'
import { VideoGenerationDisplay } from './text-image-video/VideoGenerationDisplay'
import { VideoHistoryTab } from './text-image-video/VideoHistoryTab'
import { VideoSearchModal } from './text-image-video/VideoSearchModal'

export function TextImageVideoGenerator() {
  const dispatch = useAppDispatch()
  const { 
    currentBatch,
    isGenerating,
    error,
    generationInfo,
    batchProgress,
    selectedProvider,
    selectedModel,
    defaultDuration,
    batchSize,
    videoHistory,
    batches,
    remainingRequests
  } = useAppSelector(state => state.textImageVideo)
  
  // Local state for batch processing
  const [currentBatchRequests, setCurrentBatchRequests] = useState<(TextToVideoRequest | ImageToVideoRequest)[]>([])
  
  // Search modal state
  const [isVideoSearchModalOpen, setIsVideoSearchModalOpen] = useState(false)
  const [videoSearchScenes, setVideoSearchScenes] = useState<any[]>([])

  // Background function to upload video to Supabase
  const uploadVideoToSupabaseBackground = async (videoUrl: string, video: GeneratedVideo) => {
    try {
      const storedVideo = await uploadVideoToSupabase(videoUrl, video.id, {
        type: video.type,
        prompt: video.prompt,
        duration: video.duration,
        generatedAt: video.generatedAt,
        originalImageUrl: video.imageInput
      })

      if (storedVideo) {
        saveVideoToLocalStorage(storedVideo)
        console.log('📁 Video saved to Supabase and localStorage')
      }
    } catch (error) {
      console.error('❌ Background upload failed:', error)
    }
  }

  // Helper function to convert image file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data URL prefix to get just the base64 data
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  // Helper to upload a single image file to Supabase via API and return its public URL
  const uploadImageToSupabase = async (file: File, index: number): Promise<string> => {
    const formData = new FormData()
    const path = `image-to-video/${uuidv4()}-${index}-${file.name}`
    formData.append('file', file)
    formData.append('bucket', 'audio')
    formData.append('path', path)
    const res = await fetch('/api/upload-file', {
      method: 'POST',
      body: formData
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to upload image')
    }
    const data = await res.json()
    return data.publicUrl as string
  }

  // Process a single batch of videos
  const processVideoBatch = async (
    requests: (TextToVideoRequest | ImageToVideoRequest)[], 
    batchIndex: number, 
    totalBatches: number
  ) => {
    const batchSize = VIDEO_PROVIDERS[selectedProvider].batchSize
    const batchRequests = requests.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize)
    
    dispatch(updateBatchProgress({ 
      current: batchIndex * batchSize, 
      total: requests.length, 
      currentBatch: batchIndex + 1, 
      totalBatches 
    }))

    dispatch(updateGenerationInfo(
      `Processing batch ${batchIndex + 1}/${totalBatches} (${batchRequests.length} videos)...`
    ))

    const requestPromises = batchRequests.map(async (request, index) => {
      try {
        const videoId = uuidv4()
        
        // Create placeholder video object
        const video: GeneratedVideo = {
          id: videoId,
          type: 'image' in request ? 'image-to-video' : 'text-to-video',
          prompt: request.prompt,
          imageInput: 'image' in request ? request.image : undefined,
          imageUrl: 'image' in request ? (request as ImageToVideoRequest).image_url || (request as any).image : undefined,
          duration: request.duration,
          videoUrl: '',
          provider: request.provider,
          model: request.model || 'bytedance/seedance-1-lite',
          generatedAt: new Date().toISOString(),
          status: 'generating'
        }

        // Add to batch immediately with generating status
        dispatch(addVideoToBatch(video))

        // Make API call
        const endpoint = 'image' in request ? '/api/image-to-video' : '/api/text-to-video'
        
        // Prepare request body based on type and provider
        let body: any = {
          provider: request.provider,
          model: request.model,
          prompt: request.prompt,
          duration: request.duration
        }
        
        if ('image' in request) {
          // Image-to-video request
          if (request.provider === 'fal') {
            // FAL AI expects image_url
            body.image_url = request.image_url || request.image
          } else {
            // Replicate expects base64 image
            body.image = request.image
          }
          
          // Add FAL AI specific parameters
          if (request.provider === 'fal') {
            if (request.fps) body.fps = request.fps
            if (request.motion_strength) body.motion_strength = request.motion_strength
            if (request.seed) body.seed = request.seed
          }
        } else {
          // Text-to-video request
          if (request.provider === 'fal' && !('image' in request)) {
            // Add FAL AI specific parameters for text-to-video
            const textRequest = request as TextToVideoRequest
            if (textRequest.aspect_ratio) body.aspect_ratio = textRequest.aspect_ratio
            if (textRequest.fps) body.fps = textRequest.fps
            if (textRequest.seed) body.seed = textRequest.seed
            if (textRequest.guidance_scale) body.guidance_scale = textRequest.guidance_scale
            if (textRequest.num_inference_steps) body.num_inference_steps = textRequest.num_inference_steps
          }
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error(`Failed to generate video ${index + 1} in batch ${batchIndex + 1}:`, errorData.error)
          
          dispatch(updateVideoInBatch({
            videoId,
            status: 'failed',
            error: errorData.error || 'Failed to generate video'
          }))
          
          return null
        }

        const data = await response.json()
        
        // Direct completion - both endpoints now return videoUrl immediately
        const videoUrl = data.videoUrl
        if (videoUrl) {
          // Update video object with additional data from response
          const updatedVideo = {
            ...video,
            requestId: data.requestId, // For FAL AI tracking
            provider: data.provider,
            model: data.model
          }

          // Only upload to Supabase if the URL is not already a Supabase URL
          // (since our API routes now upload directly to Supabase)
          if (!videoUrl.includes('supabase')) {
            console.log('📁 Video URL is external, uploading to Supabase...')
            uploadVideoToSupabaseBackground(videoUrl, updatedVideo)
          } else {
            console.log('✅ Video already stored in Supabase, saving metadata to localStorage...')
            // Save directly to localStorage since it's already in Supabase
            const storedVideo = {
              id: video.id,
              originalUrl: videoUrl,
              supabaseUrl: videoUrl,
              filename: `generated-videos/${video.id}.mp4`,
              uploadedAt: new Date().toISOString(),
              type: video.type,
              prompt: video.prompt,
              duration: video.duration,
              metadata: {
                type: video.type,
                prompt: video.prompt,
                duration: video.duration,
                generatedAt: video.generatedAt,
                originalImageUrl: video.imageInput
              }
            }
            saveVideoToLocalStorage(storedVideo)
          }

          dispatch(updateVideoInBatch({
            videoId,
            status: 'completed',
            videoUrl
          }))
        } else {
          dispatch(updateVideoInBatch({
            videoId,
            status: 'failed',
            error: 'No video URL returned'
          }))
          return null
        }

        return { videoId, videoUrl }
      } catch (error) {
        console.error(`Error generating video ${index + 1} in batch ${batchIndex + 1}:`, error)
        return null
      }
    })

    // Wait for all requests in the batch to complete
    const results = await Promise.all(requestPromises)
    const successfulVideos = results.filter(result => result !== null)

    // Update rate limiting
    dispatch(updateRateLimit({ used: batchRequests.length }))

    // Update progress for the entire batch
    dispatch(updateBatchProgress({ 
      current: batchProgress.current + batchRequests.length,
      total: batchProgress.total,
      currentBatch: batchProgress.currentBatch,
      totalBatches: batchProgress.totalBatches
    }))

    return successfulVideos
  }



  // Handle batch generation
  const handleGenerateVideos = async (requests: (TextToVideoRequest | ImageToVideoRequest)[]) => {
    if (requests.length === 0) return

    const generationId = uuidv4()
    const batchSize = VIDEO_PROVIDERS[selectedProvider].batchSize
    const totalBatches = Math.ceil(requests.length / batchSize)
    
    dispatch(startBatchGeneration({ 
      id: generationId, 
      requests
    }))

    try {
      dispatch(updateGenerationInfo(`Starting batch processing: ${requests.length} videos in ${totalBatches} batches...`))

      const allResults: any[] = []

      // Process each batch
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        try {
          const batchResults = await processVideoBatch(requests, batchIndex, totalBatches)
          allResults.push(...batchResults)
          
          dispatch(updateGenerationInfo(
            `Completed batch ${batchIndex + 1}/${totalBatches}. Generated ${allResults.length}/${requests.length} videos.`
          ))

          // Wait between batches (1 minute like image generation)
          if (batchIndex < totalBatches - 1) {
            const waitTime = 60 // 1 minute wait between batches
            
            dispatch(updateGenerationInfo(
              `Batch ${batchIndex + 1}/${totalBatches} complete. Waiting ${waitTime} seconds before next batch...`
            ))
            
            // Show countdown for the wait time
            for (let countdown = waitTime; countdown > 0; countdown--) {
              dispatch(updateGenerationInfo(
                `Waiting ${countdown} seconds before processing batch ${batchIndex + 2}/${totalBatches}...`
              ))
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          }
        } catch (error) {
          console.error(`Error in batch ${batchIndex + 1}:`, error)
          dispatch(updateGenerationInfo(
            `Batch ${batchIndex + 1} failed. Continuing with remaining batches...`
          ))
        }
      }

      dispatch(completeBatchGeneration())
      
    } catch (error) {
      console.error('Error generating videos:', error)
      dispatch(failBatchGeneration(
        error instanceof Error ? error.message : 'Failed to generate videos'
      ))
    }
  }

  // Handle text-to-video generation
  const handleTextToVideo = useCallback(async (prompts: string[], duration: 5 | 10) => {
    // If search provider is selected, open the search modal
    if (selectedProvider === 'search') {
      const searchScenes = prompts.map((prompt, index) => ({
        chunkIndex: index,
        originalText: prompt,
        videoPrompt: prompt,
        searchQuery: prompt.length > 50 ? prompt.substring(0, 47) + '...' : prompt,
        summary: `Prompt ${index + 1}`,
      }))
      setVideoSearchScenes(searchScenes)
      setIsVideoSearchModalOpen(true)
      return
    }

    const requests: TextToVideoRequest[] = prompts.map(prompt => ({
      prompt,
      duration,
      provider: selectedProvider,
      model: selectedModel
    }))

    await handleGenerateVideos(requests)
  }, [selectedProvider, selectedModel])

  // Handle video search modal results
  const handleVideoSearchResults = (results: any[]) => {
    // Create generated videos from search results
    const generationId = uuidv4()
    const generatedVideos: GeneratedVideo[] = results.map((result, index) => ({
      id: `search-${generationId}-${index}`,
      type: 'text-to-video' as const,
      prompt: `Stock video: ${result.query}`,
      duration: 10, // Default duration for stock videos
      videoUrl: result.url,
      provider: 'search' as any,
      model: 'pexels-pixabay-search',
      generatedAt: new Date().toISOString(),
      status: 'completed' as const
    }))

    // Start a new batch for search results
    dispatch(startBatchGeneration({
      id: generationId,
      requests: []
    }))

    // Add each video to the batch
    generatedVideos.forEach(video => {
      dispatch(addVideoToBatch(video))
    })

    // Complete the batch generation
    dispatch(completeBatchGeneration())

    // Note: Search results don't need to be saved to localStorage 
    // as they're stock videos already accessible via URL
  }

  // Handle image-to-video generation
  const handleImageToVideo = useCallback(async (
    prompts: string[], 
    images: File[], 
    duration: 5 | 10
  ) => {
    try {
      let requests: ImageToVideoRequest[] = []

      if (selectedProvider === 'fal' || selectedProvider === 'google') {
        // Upload images to Supabase to obtain public URLs for FAL image_url
        const imageUrls = await Promise.all(images.map((file, i) => uploadImageToSupabase(file, i)))
        requests = prompts.map((prompt, index) => {
          const url = imageUrls[index] || imageUrls[0]
          return {
            prompt,
            image: url, // keep for type detection in downstream code
            image_url: url,
            duration,
            provider: selectedProvider,
            model: selectedModel
          }
        })
      } else {
        // Replicate: convert to base64
        const base64Images = await Promise.all(images.map(file => fileToBase64(file)))
        requests = prompts.map((prompt, index) => ({
          prompt,
          image: base64Images[index] || base64Images[0],
          duration,
          provider: selectedProvider,
          model: selectedModel
        }))
      }

      await handleGenerateVideos(requests)
    } catch (error) {
      dispatch(failBatchGeneration('Failed to process images for video generation'))
    }
  }, [selectedProvider, selectedModel])

  return (
    <StaggerContainer className="space-y-8">
      <StaggerItem>
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-3xl text-white font-bold text-gray-900 mb-2">
            Text & Image to Video Generator
          </h1>
          <p className="text-gray-600">
            Generate videos from text prompts or images using AI. Batch processing with {VIDEO_PROVIDERS[selectedProvider].batchSize} videos per batch.
          </p>
          <div className="mt-2 text-sm text-blue-600">
            Rate limit: {remainingRequests} requests remaining
          </div>
        </motion.div>
      </StaggerItem>

      <StaggerItem>
        <Tabs defaultValue="text-to-video">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <TabsList className="flex w-full justify-center gap-2 mb-6">
              <TabsTrigger value="text-to-video">Text to Video</TabsTrigger>
              <TabsTrigger value="image-to-video">Image to Video</TabsTrigger>
              <TabsTrigger value="generation">Current Generation</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
          </motion.div>
        
        <TabsContent value="text-to-video" className="space-y-6">
          <TextToVideoTab
            defaultDuration={defaultDuration as 5 | 10}
            isGenerating={isGenerating}
            onGenerate={handleTextToVideo}
            onDurationChange={(duration: 5 | 10) => dispatch(setDefaultDuration(duration))}
          />
        </TabsContent>

        <TabsContent value="image-to-video" className="space-y-6">
          <ImageToVideoTab
            defaultDuration={defaultDuration}
            isGenerating={isGenerating}
            onGenerate={handleImageToVideo}
            onDurationChange={(duration: 5 | 10) => dispatch(setDefaultDuration(duration))}
          />
        </TabsContent>

        <TabsContent value="generation" className="space-y-6">
          <VideoGenerationDisplay
            currentBatch={currentBatch}
            isGenerating={isGenerating}
            error={error}
            generationInfo={generationInfo}
            batchProgress={batchProgress}
            onClearError={() => dispatch(clearError())}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <VideoHistoryTab
            videoHistory={videoHistory}
            batches={batches}
          />
        </TabsContent>
      </Tabs>
        </StaggerItem>

        {/* Video Search Modal */}
        <VideoSearchModal
          isOpen={isVideoSearchModalOpen}
          onClose={() => setIsVideoSearchModalOpen(false)}
          scenes={videoSearchScenes}
          onSelectResults={handleVideoSearchResults}
        />
    </StaggerContainer>
  )
} 